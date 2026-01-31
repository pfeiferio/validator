import type {RawValue, SanitizedValue, Value} from "../resolver/utils.js";
import type {ErrorStore} from "./ErrorStore.js";
import {createIssue} from "./createIssue.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {SchemaError} from "./SchemaError.js";
import type {IParameterReferenceAsync, IParameterReferenceBase, IParameterReferenceSync} from "./types.js";
import {assertNoPromise} from "./utils.js";
import {ValidationError} from "@pfeiferio/check-primitives";

export type ValidationHandle<T> = (value: RawValue) => T
export type AsyncValidationHandle<T> = (value: RawValue) => Promise<T>
export type ShapeValidationHandle = (value: unknown[]) => void
export type ParameterMode = 'one' | 'many'

export type Rule<IsAsync extends boolean> = (
  errors: ErrorStore,
  sanitizedValues: Record<string, unknown>,
  ctx: ResolveContext<unknown, IsAsync>
) => Promise<void> | void


export class ParameterReference<T, IsAsync extends boolean> implements IParameterReferenceBase<T, IsAsync> {
  #shapeValidationHandle?: ShapeValidationHandle

  #mode: ParameterMode = 'one'
  #exists: boolean = false

  #validationHandle?: ValidationHandle<T>
  #asyncValidationHandle?: AsyncValidationHandle<T>

  #isAsync: IsAsync = false as IsAsync
  #meta: Record<string, unknown> | unknown[] | null = null

  get isAsync(): IsAsync {
    return this.#isAsync
  }

  #value: Value<T>
  #defaultValue: unknown
  readonly #name: string
  readonly #required: boolean = true
  #isObject = false

  #propertiesDefinition?:
    | null
    | Record<string, IParameterReferenceBase<unknown, IsAsync>>
    | (() => Record<string, IParameterReferenceBase<unknown, IsAsync>>)

  #frozen = false

  #properties?: Record<string, IParameterReferenceBase<unknown, IsAsync>>

  constructor(
    name: string,
    required = true,
    defaultValue: unknown = undefined
  ) {
    if (required && defaultValue !== undefined) {
      throw new Error(
        `Parameter "${name}" cannot be required and have a default value`
      )
    }

    this.#name = name
    this.#required = required
    this.#defaultValue = defaultValue
  }

  get value(): Value<T> {
    return this.#value
  }

  set value(value: Value<T>) {
    this.#value = value
  }

  get properties(): Record<string, IParameterReferenceBase<unknown, IsAsync>> {
    if (!this.#frozen) {
      throw new Error('ParameterReference not frozen')
    }
    return this.#properties!
  }

  get defaultValue(): unknown | undefined {
    return this.#defaultValue
  }

  set exists(exists: boolean) {
    this.#exists = exists
  }

  get exists(): boolean {
    return this.#exists
  }

  get meta(): Record<string, unknown> | unknown[] | null {
    return this.#meta
  }

  set meta(meta: Record<string, unknown> | unknown[]) {
    this.#meta = meta
  }

  get name(): string {
    return this.#name
  }

  get isObject(): boolean {
    return this.#isObject
  }

  get isArray(): boolean {
    return this.#mode === 'many'
  }

  get mode(): ParameterMode {
    return this.#mode
  }

  get isRequired(): boolean {
    return this.#required
  }

  #hasRequiredIfRule = false

  #noValidate = false

  noValidation(): IParameterReferenceBase<T, false> {
    if (this.#validationHandle || this.#asyncValidationHandle) {
      throw new SchemaError(
        `Parameter "${this.name}": Cannot call noValidation() because a validation (sync or async) is already defined.`
      );
    }
    this.#noValidate = true
    return this as IParameterReferenceBase<T, false>
  }

  requiredIf(predicate: (sanitizedValues: Record<string, unknown>) => boolean): this {
    this.#hasRequiredIfRule = true
    this.#rules.push((errorStore, sanitizedValues, ctx) => {
      if (this.exists) return

      if (assertNoPromise(predicate(sanitizedValues), 'requiredIf')) {
        errorStore.add(createIssue({
          ctx,
          parameter: this as any,
          error: new ValidationError('required.if')
        }))
      }
    })
    return this
  }

  get path(): string {
    return this.#path ?? this.name
  }

  set path(path) {
    this.#path = path
  }

  #path?: string

  get rules(): Rule<IsAsync>[] {
    return this.#rules
  }

  #rules: Rule<IsAsync>[] = []

  freeze(): void {
    if (this.#frozen) {
      return
    }

    this.#frozen = true

    const needsValidation = !this.#noValidate && !this.isObject
    const hasValidation = !!(this.#asyncValidationHandle ?? this.#validationHandle)

    if (needsValidation && !hasValidation) {
      throw new SchemaError(
        `Parameter "${this.name}" is missing a validation. Scalar parameters must have a validation handler.`
      );
    }

    if (this.isRequired && this.#hasRequiredIfRule) {
      throw new SchemaError(
        `Invalid schema: parameter "${this.name}" is statically required and has requiredIf rules`
      )
    }

    if (this.isArray && this.#defaultValue !== undefined && !Array.isArray(this.#defaultValue)) {
      this.#defaultValue = [this.#defaultValue]
    }

    if (this.#isObject && this.#propertiesDefinition) {
      this.#properties =
        typeof this.#propertiesDefinition === 'function'
          ? this.#propertiesDefinition()
          : this.#propertiesDefinition

      this.#propertiesDefinition = null
    }
  }

  object(
    properties:
      | Record<string, IParameterReferenceBase<unknown, IsAsync>>
      | (() => Record<string, IParameterReferenceBase<unknown, IsAsync>>)
  ): this {
    this.#isObject = true
    this.#propertiesDefinition = properties
    return this
  }

  many(fn?: ShapeValidationHandle): this {
    this.#mode = 'many'

    if (typeof fn === 'function') {
      this.#shapeValidationHandle = fn
    }

    return this
  }

  one(): this {
    this.#mode = 'one'
    return this
  }

  validation(fn: ValidationHandle<T>): IParameterReferenceSync<T> {
    if (this.#noValidate) throw new SchemaError(`Parameter "${this.name}": Cannot set validation after noValidation() was called.`);
    if (this.#asyncValidationHandle) throw new SchemaError('Cannot set sync validation when async is already set');
    this.#validationHandle = fn
    return this as IParameterReferenceSync<T>
  }

  asyncValidation(fn: AsyncValidationHandle<T>): IParameterReferenceAsync<T> {
    if (this.#noValidate) throw new SchemaError(`Parameter "${this.name}": Cannot set async validation after noValidation() was called.`);
    if (this.#validationHandle) throw new SchemaError('Cannot set async validation when sync is already set');
    this.#asyncValidationHandle = fn
    this.#isAsync = true as IsAsync
    return this as IParameterReferenceAsync<T>
  }

  get useAsyncValidation() {
    return this.#asyncValidationHandle !== undefined
  }

  validateShape(values: unknown[]): this {
    this.#shapeValidationHandle?.(values)
    return this
  }

  validate(value: unknown): SanitizedValue<T> | Promise<SanitizedValue<T>> {

    if (this.#noValidate) {
      return value as SanitizedValue<T>
    }

    const handle = this.#validationHandle ?? this.#asyncValidationHandle

    if (!handle) {
      return value as SanitizedValue<T>
    }

    const validationResult = handle(value)
    const resultIsPromise = validationResult instanceof Promise

    if (this.useAsyncValidation) {
      if (!resultIsPromise) throw new SchemaError(`"${this.name}": validationAsync() must return a Promise. Keep it consistent.`)
      return validationResult as Promise<SanitizedValue<T>>
    }

    if (resultIsPromise) throw new SchemaError(`"${this.name}": Sync validation returned a Promise. Use validationAsync() instead.`)

    return validationResult as SanitizedValue<T>
  }
}
