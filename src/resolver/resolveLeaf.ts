import {resolveObject} from './resolveObject.js'
import {resolveValue} from './resolveValue.js'
import {resolveMany} from './resolveMany.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import type {ResolvedResult} from "./utils.js";
import type {Parameter} from "../schema/types.js";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";

export function resolveLeaf<Sanitized>(
  value: unknown,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>,
  parentNode?: ExecutionNode
): ResolvedResult<Sanitized> {

  parameter.freeze()

  const isMany = parameter.mode === 'many' && !ctx.forceOne

  if (isMany) {
    return resolveMany(value, parameter, errorStore, ctx, parentNode)
  }

  if (parameter.isObject) {
    return resolveObject(value, parameter, errorStore, ctx, parentNode)
  }

  return resolveValue(value, parameter, errorStore, ctx, parentNode)
}
