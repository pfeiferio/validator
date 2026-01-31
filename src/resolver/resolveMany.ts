import {INVALID, type ResolvedResult, type Value} from './utils.js'
import {resolveLeaf} from './resolveLeaf.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {createIssue} from "../schema/createIssue.js";
import type {IParameterReferenceBase} from "../schema/types.js";
import {assertArray} from "@pfeiferio/check-primitives";

export function resolveMany<Sanitized, IsAsync extends boolean>(
  values: unknown,
  parameter: IParameterReferenceBase<Sanitized, IsAsync>,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized, IsAsync>
): ResolvedResult<Sanitized> {
  assertArray(values)

  const sanitizedResults: unknown[] = []
  const rawResults: unknown[] = []

  try {
    parameter.validateShape(values)
  } catch (error) {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue<IsAsync>({
      ctx, parameter, error
    }))
  }

  return loop(parameter, errorStore, values, 0, ctx, rawResults, sanitizedResults)
}


function loop<Sanitized, IsAsync extends boolean>(
  parameter: IParameterReferenceBase<Sanitized, IsAsync>,
  errorStore: ErrorStore,
  values: Array<unknown>,
  idx: number,
  ctx: ResolveContext<Sanitized, IsAsync>,
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
        itemCtx
      )

      if (resolved instanceof Promise) {
        return resolved.then((resolved) => {
          const {raw, sanitized} = resolved
          rawResults.push({raw})
          sanitizedResults.push(sanitized)
          return loop(parameter, errorStore, values, i + 1, ctx, rawResults, sanitizedResults)
        }).catch(error => {
          const err = error as Error
          rawResults.push({raw: INVALID})
          sanitizedResults.push(INVALID)
          errorStore.processOnce(err)?.add(createIssue({
            ctx, parameter, error
          }))
          return loop(parameter, errorStore, values, i + 1, ctx, rawResults, sanitizedResults)
        })
      }

      const {raw, sanitized} = resolved
      rawResults.push({raw})
      sanitizedResults.push(sanitized)
    } catch (error) {
      const err = error as Error
      rawResults.push({raw: INVALID})
      sanitizedResults.push(INVALID)
      errorStore.processOnce(err)?.add(createIssue({
        ctx, parameter, error
      }))
    }
  }

  return {raw: rawResults, sanitized: sanitizedResults as Value<Sanitized>}
}
