import {resolveObject} from './resolveObject.js'
import {resolveValue} from './resolveValue.js'
import {resolveMany} from './resolveMany.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import type {ResolvedResult} from "./utils.js";
import type {IParameterReferenceBase} from "../schema/types.js";

export function resolveLeaf<Sanitized, IsAsync extends boolean>(
  value: unknown,
  parameter: IParameterReferenceBase<Sanitized, IsAsync>,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized, IsAsync>
): ResolvedResult<Sanitized> {

  parameter.freeze()

  const isMany = parameter.mode === 'many' && !ctx.forceOne

  if (isMany) {
    return resolveMany(value, parameter, errorStore, ctx)
  }

  if (parameter.isObject) {
    return resolveObject(value, parameter, errorStore, ctx)
  }

  return resolveValue(value, parameter, errorStore, ctx)
}
