import {INVALID, type ResolvedResult, type ResolveResult, tryRun, type Value} from './utils.js'
import {resolveLeaf} from './resolveLeaf.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";
import {assertArray} from "@pfeiferio/check-primitives";
import {type ExecutionNode, overwriteSanitized} from "../nodes/ExecutionNode.js";
import {COLLECT_AS_ARRAY, collectNewNode} from "../nodes/utils.js";

export function resolveMany<Sanitized>(
  values: unknown,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>,
  parentNode?: ExecutionNode
): ResolvedResult<Sanitized> {
  assertArray(values)

  const sanitizedResults: unknown[] = []
  const rawResults: unknown[] = []

  try {
    parameter.validateShape(values)
  } catch (error) {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue({
      ctx, parameter, error
    }))
  }

  const node = collectNewNode<Sanitized>(COLLECT_AS_ARRAY, parameter, ctx, parentNode) // TBD VLLT WEG

  return loop(node, parameter, errorStore, values, 0, ctx, rawResults, sanitizedResults)
}

function loop<Sanitized>(
  parentNode: ExecutionNode,
  parameter: Parameter,
  errorStore: ErrorStore,
  values: Array<unknown>,
  idx: number,
  ctx: ResolveContext<Sanitized>,
  rawResults: Array<unknown>,
  sanitizedResults: Array<unknown>
): ResolvedResult<Sanitized> {

  const catchFn = (error: unknown) => {
    const err = error as Error
    rawResults.push(INVALID)
    sanitizedResults.push(INVALID)
    errorStore.processOnce(err)?.add(
      createIssue({
        ctx, parameter, error
      }))
  }

  const thenFn = (resolved: ResolveResult<unknown>, itemCtx: ResolveContext<unknown>) => {
    const {raw, sanitized} = resolved
    rawResults.push(raw)
    const valIdx = sanitizedResults.push(sanitized) - 1
    itemCtx[overwriteSanitized] = (val) => sanitizedResults[valIdx] = val
  }

  for (let i = idx; i < values.length; i++) {

    const itemCtx = ctx.item(i.toString())
    const next = () => loop(parentNode, parameter, errorStore, values, i + 1, ctx, rawResults, sanitizedResults)
    const result = tryRun(() => resolveLeaf(
        values[i],
        parameter,
        errorStore,
        itemCtx,
        parentNode
      ),
      (resolved) => thenFn(resolved, itemCtx),
      catchFn,
      next,
    )

    if (result.isPromise) return result.promise as Promise<ResolveResult<Sanitized>>
  }

  return {raw: rawResults, sanitized: sanitizedResults as Value<Sanitized>}
}
