import {resolveFromStore} from './resolveFromStore.js'
import {INVALID, type ResolvedResult, type Value} from './utils.js'
import {SearchStore} from '../search/SearchStore.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {createIssue} from "../schema/createIssue.js";
import {SchemaError} from "../schema/SchemaError.js";
import type {Parameter} from "../schema/types.js";
import {assertObject} from "@pfeiferio/check-primitives";
import {COLLECT_AS_OBJECT, collectNewNode} from "../nodes/utils.js";
import type {ExecutionNode} from "../nodes/ExecutionNode.js";

export function resolveObject<Sanitized>(
  value: unknown,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>,
  parentNode: ExecutionNode | undefined
): ResolvedResult<Sanitized> {
  assertObject(value)

  parameter.freeze()

  const tmpStore = new SearchStore(value)
  const sanitizedResults: Record<string, unknown> = {}
  const rawResults: Record<string, unknown> = {}
  const values = Object.entries(parameter.properties)

  const node = collectNewNode<Sanitized>(COLLECT_AS_OBJECT, parameter, ctx, parentNode)

  return loop(node, parameter, errorStore, values, 0, ctx, rawResults, sanitizedResults, tmpStore)
}

function loop<Sanitized>(
  parentNode: ExecutionNode,
  parameter: Parameter,
  errorStore: ErrorStore,
  entries: Array<[string, Parameter]>,
  idx: number,
  ctx: ResolveContext<Sanitized>,
  rawResults: Record<string, unknown>,
  sanitizedResults: Record<string, unknown>,
  tmpStore: SearchStore
): ResolvedResult<Sanitized> {

  for (let i = idx; i < entries.length; i++) {
    const [propName, propParameter] = entries[i] as [string, Parameter]

    if (!propParameter) {
      throw new SchemaError(
        'missing properties!, wrong return value of object.properties callback'
      )
    }

    propParameter.freeze()

    const itemCtx = ctx.child(propName)

    try {
      const resolved = resolveFromStore(
        tmpStore,
        propParameter,
        errorStore,
        itemCtx,
        parentNode
      )

      if (resolved instanceof Promise) {
        return resolved.then(resolved => {
          const {raw, sanitized} = resolved
          //collectNewNode(COLLECT_AS_LEAF, propParameter, ctx, parentNode, resolved)
          sanitizedResults[propName] = sanitized
          rawResults[propName] = raw
          return loop(parentNode, parameter, errorStore, entries, i + 1, ctx, rawResults, sanitizedResults, tmpStore)
        }).catch(error => {
          const err = error as Error
          errorStore.processOnce(err)?.add(createIssue({
            ctx, parameter, error
          }))
          sanitizedResults[propName] = INVALID
          rawResults[propName] = INVALID
          return loop(parentNode, parameter, errorStore, entries, i + 1, ctx, rawResults, sanitizedResults, tmpStore)
        })
      }

      const {raw, sanitized} = resolved
      sanitizedResults[propName] = sanitized
      rawResults[propName] = raw
      //collectNewNode(COLLECT_AS_LEAF, propParameter, ctx, parentNode, resolved)
    } catch (error) {
      const err = error as Error
      errorStore.processOnce(err)?.add(createIssue({
        ctx, parameter, error
      }))
      rawResults[propName] = INVALID
      sanitizedResults[propName] = INVALID
    }
  }

  return {raw: rawResults, sanitized: sanitizedResults as Value<Sanitized>}
}
