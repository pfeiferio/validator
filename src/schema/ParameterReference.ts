import type {MetaValue, RawValue, SanitizedValue, Value} from "../resolver/utils.js";
import type {ErrorStore} from "./ErrorStore.js";
import {createIssue} from "./createIssue.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {SchemaError} from "./SchemaError.js";
import type {Parameter, ParameterAsync, ParameterRaw, ParameterSync, ParameterUnvalidated} from "./types.js";
import {assertNoPromise} from "./utils.js";
import {ValidationError} from "@pfeiferio/check-primitives";
import {SCHEMA_ERRORS} from "../errors/errors.js";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";
import {RequiredIfCtx} from "./RequiredIfCtx.js";
import type {NodeList} from "../nodes/NodeList.js";

export type ValidationHandle<T> = (value: RawValue, ctx?: Record<string, unknown> | undefined) => T
export type AsyncValidationHandle<T> = (value: RawValue, ctx?: Record<string, unknown> | undefined) => Promise<T>

export type PostValidationHandle<T> = (value: T, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, ExecutionNode[] | NodeList>) => T
export type AsyncPostValidationHandle<T> = (value: T, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, ExecutionNode[] | NodeList>) => Promise<T>

export type ShapeValidationHandle = (value: unknown[]) => void
export type ParameterMode = 'one' | 'many'

export type Rule = (
  errors: ErrorStore,
  sanitizedValues: Record<string, unknown>,
  ctx: ResolveContext<unknown>
) => Promise<void> | void

export class ParameterReference<T, AsyncGuarantee extends boolean> implements ParameterUnvalidated<T> {

  #shapeValidationHandle?: ShapeValidationHandle | undefined

  #mode: ParameterMode = 'one'
  #exists: boolean = false

  #validationHandle?: ValidationHandle<T>
  #asyncValidationHandle?: AsyncValidationHandle<T>

  #postValidationHandle?: PostValidationHandle<T>
  #asyncPostValidationHandle?: AsyncPostValidationHandle<T>


  #isAsync: AsyncGuarantee = false as AsyncGuarantee
  #meta: MetaValue = {
    raw: undefined
  }

  get isAsync(): boolean {
    return this.#isAsync
  }

  #value: Value<T>
  #defaultValue: unknown
  readonly #name: string
  readonly #required: boolean = true
  #isObject = false

  #propertiesDefinition?:
    | null
    | Record<string, Parameter>
    | (() => Record<string, Parameter>)

  #frozen = false

  #properties?: Record<string, Parameter>

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

  get properties(): Record<string, Parameter> {
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

  get meta(): MetaValue {
    return this.#meta
  }

  set meta(meta: MetaValue) {
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


  get hasValidation() {
    return !!(this.#validationHandle || this.#asyncValidationHandle)
  }

  noValidation(): ParameterRaw<T> {
    if (this.hasValidation) {
      throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_NO_VALIDATE_VALIDATE(this));
    }
    this.#noValidate = true
    return this as ParameterRaw<T>
  }

  postValidation<A extends boolean = AsyncGuarantee>(
    fn: PostValidationHandle<T>
  ): A extends true ? ParameterAsync<T> : ParameterSync<T> {
    if (this.isObject) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.OBJECT_WITH_POST_VALIDATION(this))
    if (this.#noValidate) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_NO_VALIDATE(this, false, 'postValidation'));
    if (this.#asyncPostValidationHandle) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_SYNC_ASYNC_POST());
    this.#postValidationHandle = fn
    return this as any
  }

  asyncPostValidation(fn: AsyncPostValidationHandle<T>): ParameterAsync<T> {
    if (this.isObject) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.OBJECT_WITH_POST_VALIDATION(this))
    if (this.#noValidate) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_NO_VALIDATE(this, true, 'postValidation'));
    if (this.#postValidationHandle) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_ASYNC_SYNC_POST());
    this.#asyncPostValidationHandle = fn
    this.#isAsync = true as AsyncGuarantee
    return this as ParameterAsync<T>
  }

  requiredIf(predicate: (sanitizedValues: Record<string, unknown>, node: ExecutionNode, requiredIfCtx: RequiredIfCtx) => boolean): this {
    this.#hasRequiredIfRule = true
    this.#rules.push((errorStore, sanitizedValues, ctx) => {
      if (this.exists) return
      const requiredIfCtx = new RequiredIfCtx()
      if (assertNoPromise(
        predicate(
          sanitizedValues,
          ctx.node,
          requiredIfCtx
        ), 'requiredIf')) {

        errorStore.add(createIssue({
          ctx,
          parameter: this as any,
          error: new ValidationError('required.if', requiredIfCtx.errorContext)
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

  get rules(): Rule[] {
    return this.#rules
  }

  #rules: Rule[] = []

  freeze(): void {
    if (this.#frozen) {
      return
    }

    this.#frozen = true

    const needsValidation = !this.#noValidate && !this.isObject
    const hasValidation = !!(this.#asyncValidationHandle ?? this.#validationHandle)

    if (needsValidation && !hasValidation) {
      throw new SchemaError(
        SCHEMA_ERRORS.PARAMETER_REFERENCE.MISSING_VALIDATION(this)
      );
    }

    if (this.isRequired && this.#hasRequiredIfRule) {
      throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.REQUIRED_WITH_IF_REQUIRED(this))
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
      | Record<string, Parameter>
      | (() => Record<string, Parameter>)
  ): this {
    if (this.hasValidation) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.VALIDATION_WITH_OBJECT(this))

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
    this.#shapeValidationHandle = undefined
    return this
  }

  validation(fn: ValidationHandle<T>): ParameterSync<T> {
    if (this.isObject) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.OBJECT_WITH_VALIDATION(this))
    if (this.#noValidate) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_NO_VALIDATE(this, false, 'validation'));
    if (this.#asyncValidationHandle) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_SYNC_ASYNC());
    this.#validationHandle = fn
    return this as ParameterSync<T>
  }

  asyncValidation(fn: AsyncValidationHandle<T>): ParameterAsync<T> {
    if (this.isObject) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.OBJECT_WITH_VALIDATION(this))
    if (this.#noValidate) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_NO_VALIDATE(this, true, 'validation'));
    if (this.#validationHandle) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_ASYNC_SYNC());
    this.#asyncValidationHandle = fn
    this.#isAsync = true as AsyncGuarantee
    return this as ParameterAsync<T>
  }

  get useAsyncValidation() {
    return this.#asyncValidationHandle !== undefined
  }

  validateShape(values: unknown[]): this {
    this.#shapeValidationHandle?.(values)
    return this
  }

  get isNoValidate() {
    return this.#noValidate
  }

  get hasPostValidation() {
    return !!(this.#postValidationHandle ?? this.#asyncPostValidationHandle)
  }

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, ExecutionNode[] | NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>> {


    if (this.#noValidate) {
      return value as SanitizedValue<T>
    }

    const handle = this.#postValidationHandle ?? this.#asyncPostValidationHandle

    if (!handle) {
      return value as SanitizedValue<T>
    }

    const validationResult = handle(value as T, sanitizedValues, node, nodes)
    const resultIsPromise = validationResult instanceof Promise

    if (this.#asyncPostValidationHandle) {
      if (!resultIsPromise) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_FORCE_ASYNC_POST(this))
      return validationResult as Promise<SanitizedValue<T>>
    }

    if (resultIsPromise) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.WRONG_POST_VALIDATION_USED(this))

    return validationResult as SanitizedValue<T>
  }

  validate(value: unknown, ctx?: Record<string, unknown> | undefined): SanitizedValue<T> | Promise<SanitizedValue<T>> {

    if (this.#noValidate) {
      return value as SanitizedValue<T>
    }

    const handle = this.#validationHandle ?? this.#asyncValidationHandle

    if (!handle) {
      return value as SanitizedValue<T>
    }

    const validationResult = handle(value, ctx)
    const resultIsPromise = validationResult instanceof Promise

    if (this.useAsyncValidation) {
      if (!resultIsPromise) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.GUARD_FORCE_ASYNC(this))
      return validationResult as Promise<SanitizedValue<T>>
    }

    if (resultIsPromise) throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.WRONG_VALIDATION_USED(this))

    return validationResult as SanitizedValue<T>
  }
}
