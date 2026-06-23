import type {ResolveContext} from "../context/ResolveContext.js";
import type {ErrorStore} from "../schema/ErrorStore.js";
import {type ResolvedResult, type ResolveResult, tryRun, type Value} from "./utils.js";
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";
import {COLLECT_AS_VALUE, collectNewNode} from "../nodes/utils.js";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";

export function resolveValue<Sanitized>(
  value: unknown,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>,
  parentNode?: ExecutionNode
): ResolvedResult<Sanitized> {
  const raw = value
  let sanitized: Value<Sanitized>

  parameter.path = ctx.path

  const onSuccess = (result: unknown) => {
    sanitized = result as Value<Sanitized>
    ctx.postValidations.push({parameter, value: sanitized, path: ctx.path, ctx})
    collectNewNode<Sanitized>(COLLECT_AS_VALUE, parameter, ctx, parentNode, {raw, sanitized})
  }

  const onError = (error: unknown) => {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue({ctx, parameter, error}))
    throw err
  }

  const result = tryRun(
    () => parameter.validate(value, ctx.validationContext),
    onSuccess,
    onError,
    () => ({raw, sanitized})
  )

  if (result.isPromise) return result.promise as Promise<ResolveResult<Sanitized>>

  return {raw, sanitized}
}
