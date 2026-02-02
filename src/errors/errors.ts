import type {ResolveContext} from "../context/ResolveContext.js";
import type {ParameterUnvalidated} from "../schema/types.js";

export const SCHEMA_ERRORS = {
  ASSERTS: {
    VALIDATION_SYNC_RETURNED_PROMISE: (name: string) =>
      `Parameter "${name}" is sync, but validation returned a Promise.`,

    VALIDATION_ASYNC_RETURNED_SYNC: (name: string) =>
      `Parameter "${name}" is async, but validation returned a sync value.`,
    UNEXPECTED_PROMISE: (source?: string) =>
      `Unexpected Promise: Synchronous schema cannot handle async validation${source ? ` in ${source}` : ''}.`
  },
  RESOLVE_CONTEXT: {
    MISSING_NODE: (path: string) => `ExecutionNode not available for context at path "${path}". Node is only available after resolution.`,
  },
  EXECUTION_NODE: {
    INVALID_COLLECT_STATE: () => `Invalid collect state. This indicates an internal schema error.`
  },
  PARAMETER_REFERENCE: {
    MISSING: (ctx: ResolveContext<unknown>) =>
      `ParameterReference missing at path "${ctx.path}"`,
    MISSING_VALIDATION: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}" is missing a validation. Scalar parameters must have a validation handler.`,
    REQUIRED_WITH_IF_REQUIRED: (parameter: ParameterUnvalidated) =>
      `Invalid schema: parameter "${parameter.name}" is statically required and has requiredIf rules`,
    GUARD_ASYNC_SYNC: () => 'Cannot set async validation when sync is already set',
    GUARD_SYNC_ASYNC: () => 'Cannot set sync validation when async is already set',
    GUARD_NO_VALIDATE_VALIDATE: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}": Cannot call noValidation() because a validation (sync or async) is already defined.`,
    GUARD_SYNC_NO_VALIDATE: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}": Cannot set validation after noValidation() was called.`,
    GUARD_ASYNC_NO_VALIDATE: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}": Cannot set async validation after noValidation() was called.`,
    GUARD_FORCE_ASYNC: (parameter: ParameterUnvalidated) =>
      `"${parameter.name}": validationAsync() must return a Promise. Keep it consistent.`,
    WRONG_VALIDATION_USED: (parameter: ParameterUnvalidated) =>
      `"${parameter.name}": Sync validation returned a Promise. Use validationAsync() instead.`,
    OBJECT_WITH_VALIDATION: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}": Cannot set validation on object parameters. Object properties are validated independently.`,
    VALIDATION_WITH_OBJECT: (parameter: ParameterUnvalidated) =>
      `Parameter "${parameter.name}": Cannot set object() on parameters with a validation. Remove the validation and validate object properties instead.`
  }
}
