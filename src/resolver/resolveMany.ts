import {INVALID, type ResolvedResult, type Value} from './utils.js'
import {resolveLeaf} from './resolveLeaf.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";
import {assertArray} from "@pfeiferio/check-primitives";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";
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

  const node = collectNewNode<Sanitized>(COLLECT_AS_ARRAY, parameter, ctx, parentNode)

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

  for (let i = idx; i < values.length; i++) {

    const itemCtx = ctx.item(i.toString())

    try {
      const resolved = resolveLeaf(
        values[i],
        parameter,
        errorStore,
        itemCtx,
        parentNode
      )

      if (resolved instanceof Promise) {
        return resolved.then((resolved) => {
          const {raw, sanitized} = resolved
          //collectNewNode(COLLECT_AS_LEAF, parameter, ctx, node, resolved)
          rawResults.push(raw)
          sanitizedResults.push(sanitized)
          return loop(parentNode, parameter, errorStore, values, i + 1, ctx, rawResults, sanitizedResults)
        }).catch(error => {
          const err = error as Error
          rawResults.push(INVALID)
          sanitizedResults.push(INVALID)
          errorStore.processOnce(err)?.add(
            createIssue({
              ctx, parameter, error
            }))
          return loop(parentNode, parameter, errorStore, values, i + 1, ctx, rawResults, sanitizedResults)
        })
      }

      const {raw, sanitized} = resolved
      rawResults.push(raw)
      sanitizedResults.push(sanitized)
//      collectNewNode(COLLECT_AS_LEAF, parameter, ctx, node, resolved)
    } catch (error) {
      const err = error as Error
      rawResults.push(INVALID)
      sanitizedResults.push(INVALID)
      errorStore.processOnce(err)?.add(createIssue({
        ctx, parameter, error
      }))
    }
  }

  return {raw: rawResults, sanitized: sanitizedResults as Value<Sanitized>}
}
