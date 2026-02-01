import type {
  AsyncValidationHandle,
  ParameterMode,
  Rule,
  ShapeValidationHandle,
  ValidationHandle
} from "./ParameterReference.js";
import type {SanitizedValue, Value} from "../resolver/utils.js";

export interface ValidationIssue {
  path: string
  name: string
  reason: string
  context?: Record<string, unknown>
}

export interface ParameterBase<T> {
  get name(): string

  get isAsync(): boolean

  get isRequired(): boolean

  get isObject(): boolean

  get isArray(): boolean

  get isNoValidate(): boolean

  readonly mode: ParameterMode

  path: string
  value: Value<T>
  meta: Record<string, unknown> | unknown[] | null

  readonly defaultValue: unknown | undefined
  exists: boolean
  readonly properties: Record<string, Parameter>
  readonly rules: Rule[]

  freeze(): void

  object(properties: Record<string, Parameter> | (() => Record<string, Parameter>)): this

  many(fn?: ShapeValidationHandle): this

  one(): this

  requiredIf(predicate: (sanitizedValues: Record<string, unknown>) => boolean): this

  validateShape(values: unknown[]): this

  validate(value: unknown): SanitizedValue<T> | Promise<SanitizedValue<T>>  // TODO ABLEITUNG
}

export interface ParameterSync<T = unknown> extends ParameterBase<T> {
  get isAsync(): false

  get isNoValidate(): false

  validation(fn: ValidationHandle<T>): ParameterSync<T>

  validate(value: unknown): SanitizedValue<T>
}

export interface ParameterAsync<T = unknown> extends ParameterBase<T> {
  get isAsync(): true

  get isNoValidate(): false

  asyncValidation(fn: AsyncValidationHandle<T>): ParameterAsync<T>

  validate(value: unknown): SanitizedValue<T> | Promise<SanitizedValue<T>>
}

export interface ParameterRaw<T = unknown> extends ParameterBase<T> {
  get isAsync(): false

  get isNoValidate(): true

  validate(value: unknown): SanitizedValue<T>
}

export interface ParameterUnvalidated<T = unknown> extends ParameterBase<T> {
  validation(fn: ValidationHandle<T>): ParameterSync<T>

  asyncValidation(fn: AsyncValidationHandle<T>): ParameterAsync<T>

  noValidation(): ParameterRaw<T>

  validate(value: unknown): SanitizedValue<T> | Promise<SanitizedValue<T>>
}

export type Parameter<T = unknown> =
  | ParameterSync<T>
  | ParameterAsync<T>
  | ParameterRaw<T>
  | ParameterUnvalidated<T>
