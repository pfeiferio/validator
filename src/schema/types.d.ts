import type {SchemaValidationResult} from "./Schema.js";

export interface ValidationIssue {
  path: string
  name: string
  reason: string
  context?: Record<string, unknown>
}

export type DynamicScheme<IsAsync extends boolean> =
  IsAsync extends true
    ? Promise<SchemaValidationResult<IsAsync>>
    : SchemaValidationResult<IsAsync>

interface IParameterReferenceBase<T, IsAsync extends boolean> {
  get name(): string

  get isAsync(): IsAsync

  get isRequired(): boolean

  get isObject(): boolean

  get isArray(): boolean

  readonly mode: ParameterMode

  path: string
  value: Value<T>
  meta: Record<string, unknown> | unknown[] | null

  readonly defaultValue: unknown | undefined
  exists: boolean
  readonly properties: Record<string, ParameterReference<unknown, IsAsync>>
  readonly rules: Rule<IsAsync>[]

  freeze(): void

  object(properties: Record<string, ParameterReference<unknown, IsAsync>> | (() => Record<string, ParameterReference<unknown, IsAsync>>)): this

  many(fn?: ShapeValidationHandle): this

  one(): this

  requiredIf(predicate: (sanitizedValues: Record<string, unknown>) => boolean): this

  validateShape(values: unknown[]): this

  validate(value: unknown): SanitizedValue<T> | Promise<SanitizedValue<T>>

  noValidation(): IParameterReferenceBase<T, false>
}

interface IParameterReferenceSync<T> extends IParameterReferenceBase<T, false> {
  validation(fn: ValidationHandle<T>): IParameterReferenceSync<T>
}

interface IParameterReferenceAsync<T> extends IParameterReferenceBase<T, true> {
  asyncValidation(fn: AsyncValidationHandle<T>): IParameterReferenceAsync<T>
}
