import {resolveFromStore} from '../resolver/resolveFromStore.js'
import {GlobalContext} from '../context/GlobalContext.js'
import {ResolveContext} from '../context/ResolveContext.js'
import {ErrorStore} from '../schema/ErrorStore.js'
import type {SearchStore} from '../search/SearchStore.js'
import {createIssue} from "../schema/createIssue.js";
import type {IParameterReferenceBase} from "../schema/types.js";

export interface ValidateParameterResult<Sanitized, IsAsync extends boolean> {
  errors: ErrorStore
  ctx: ResolveContext<Sanitized, IsAsync>
}

export function validateParameter<Sanitized, IsAsync extends boolean>(
  store: SearchStore,
  parameter: IParameterReferenceBase<Sanitized, IsAsync>,
  errorStore: ErrorStore | null = null,
  globalContext: GlobalContext<Sanitized, IsAsync> | null = null
): Promise<ValidateParameterResult<Sanitized, IsAsync>> | ValidateParameterResult<Sanitized, IsAsync> {
  errorStore ??= new ErrorStore()
  const ctx = new ResolveContext<Sanitized, IsAsync>(parameter.name, {
    global: globalContext ?? new GlobalContext()
  })

  try {

    const resolved = resolveFromStore(
      store,
      parameter as IParameterReferenceBase<Sanitized, IsAsync>,
      errorStore,
      ctx
    )

    if (resolved instanceof Promise) {
      return resolved.then(resolved => {
        const {raw, sanitized} = resolved
        parameter.meta = raw as Record<string, unknown> | unknown[]
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
    parameter.meta = raw as Record<string, unknown> | unknown[]
    parameter.value = sanitized as Sanitized

  } catch (error) {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue({
      ctx, parameter, error
    }))
  }

  return {errors: errorStore, ctx}
}
