import type {
  AsyncPostValidationHandle,
  AsyncValidationHandle,
  ParameterMode,
  PostValidationHandle,
  Rule,
  ShapeValidationHandle,
  ValidationHandle
} from "./ParameterReference.js";
import type {MetaValue, SanitizedValue, Value} from "../resolver/utils.js";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";
import type {RequiredIfCtx} from "./RequiredIfCtx.js";
import type {NodeList} from "../nodes/NodeList.js";

export interface ValidationIssue {
  path: string
  name: string
  reason: string
  context?: Record<string, unknown>
}

export interface ParameterBase<T> {
  get name(): string

  get isAsync(): boolean

  get useAsyncValidation(): boolean

  get isRequired(): boolean

  get isObject(): boolean

  get isArray(): boolean

  get isNoValidate(): boolean

  readonly mode: ParameterMode

  path: string
  value: Value<T>
  meta: MetaValue

  readonly defaultValue: unknown | undefined
  exists: boolean
  readonly properties: Record<string, Parameter>
  readonly rules: Rule[]

  freeze(): void

  object(properties: Record<string, Parameter> | (() => Record<string, Parameter>)): this

  many(fn?: ShapeValidationHandle): this

  one(): this

  requiredIf(predicate: (sanitizedValues: Record<string, unknown>, node: ExecutionNode, requiredIfCtx: RequiredIfCtx) => boolean): this

  validateShape(values: unknown[]): this

  validate(value: unknown, validationContext?: Record<string, unknown> | undefined): SanitizedValue<T> | Promise<SanitizedValue<T>>

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, ExecutionNode[] | NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>>

  get hasPostValidation(): boolean
}

export interface ParameterSync<T = unknown> extends ParameterBase<T> {
  get isAsync(): false

  get isNoValidate(): false

  validation(fn: ValidationHandle<T>): ParameterSync<T>

  postValidation(fn: PostValidationHandle<T>): ParameterSync<T>

  asyncPostValidation(fn: AsyncPostValidationHandle<T>): ParameterAsync<T>

  get hasPostValidation(): boolean

  validate(value: unknown, validationContext?: Record<string, unknown> | undefined): SanitizedValue<T>

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, ExecutionNode[] | NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>>
}

export interface ParameterAsync<T = unknown> extends ParameterBase<T> {
  get isAsync(): true

  get isNoValidate(): false

  asyncValidation(fn: AsyncValidationHandle<T>): ParameterAsync<T>

  asyncPostValidation(fn: AsyncPostValidationHandle<T>): ParameterAsync<T>

  postValidation(fn: AsyncPostValidationHandle<T>): ParameterAsync<T>

  validate(value: unknown, validationContext?: Record<string, unknown> | undefined): SanitizedValue<T> | Promise<SanitizedValue<T>>

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>>

  get hasPostValidation(): boolean
}

export interface ParameterRaw<T = unknown> extends ParameterBase<T> {
  get isAsync(): false

  get isNoValidate(): true

  validate(value: unknown, validationContext?: Record<string, unknown> | undefined): SanitizedValue<T>

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>>

  get hasPostValidation(): boolean
}

export interface ParameterUnvalidated<T = unknown> extends ParameterBase<T> {
  validation(fn: ValidationHandle<T>): ParameterSync<T>

  asyncValidation(fn: AsyncValidationHandle<T>): ParameterAsync<T>

  asyncPostValidation(fn: AsyncPostValidationHandle<T>): ParameterAsync<T>

  postValidation(fn: PostValidationHandle<T>): ParameterSync<T> | ParameterAsync<T>

  noValidation(): ParameterRaw<T>

  validate(value: unknown, validationContext?: Record<string, unknown> | undefined): SanitizedValue<T> | Promise<SanitizedValue<T>>

  postValidate(value: unknown, sanitizedValues: Record<string, unknown>, node: ExecutionNode, nodes: Map<Parameter, NodeList>): SanitizedValue<T> | Promise<SanitizedValue<T>>
}

export type Parameter<T = unknown> =
  | ParameterSync<T>
  | ParameterAsync<T>
  | ParameterRaw<T>
  | ParameterUnvalidated<T>
