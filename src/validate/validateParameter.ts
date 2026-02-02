import {resolveFromStore} from '../resolver/resolveFromStore.js'
import {GlobalContext} from '../context/GlobalContext.js'
import {ResolveContext} from '../context/ResolveContext.js'
import {ErrorStore} from '../schema/ErrorStore.js'
import type {SearchStore} from '../search/SearchStore.js'
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";

export interface ValidateParameterResult<Sanitized> {
  errors: ErrorStore
  ctx: ResolveContext<Sanitized>
}

export function validateParameter<Sanitized>(
  store: SearchStore,
  parameter: Parameter,
  errorStore: ErrorStore | null = null,
  globalContext: GlobalContext<Sanitized> | null = null
): Promise<ValidateParameterResult<Sanitized>> | ValidateParameterResult<Sanitized> {
  errorStore ??= new ErrorStore()
  const ctx = new ResolveContext<Sanitized>(parameter.name, {
    global: globalContext ?? new GlobalContext()
  })

  try {
    const resolved = resolveFromStore(
      store,
      parameter,
      errorStore,
      ctx,
      undefined
    )

    if (resolved instanceof Promise) {
      return resolved.then(resolved => {
        const {raw, sanitized} = resolved
        parameter.meta.raw = raw as Record<string, unknown> | unknown[]
        parameter.value = sanitized as Sanitized
        return {errors: errorStore, ctx}
      }).catch(error => {
        const err = error as Error
        errorStore.processOnce(err)?.add(createIssue({
          ctx, parameter, error
        }))
        return {errors: errorStore, ctx}
      })
    }

    const {raw, sanitized} = resolved
    parameter.meta.raw = raw as Record<string, unknown> | unknown[]
    parameter.value = sanitized as Sanitized

  } catch (error) {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue({
      ctx, parameter, error
    }))
  }

  return {errors: errorStore, ctx}
}
