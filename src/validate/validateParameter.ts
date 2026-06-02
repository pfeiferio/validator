import {resolveFromStore} from '../resolver/resolveFromStore.js'
import {GlobalContext} from '../context/GlobalContext.js'
import {ResolveContext} from '../context/ResolveContext.js'
import {ErrorStore} from '../schema/ErrorStore.js'
import type {SearchStore} from '../search/SearchStore.js'
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";
import {overwriteSanitized} from "../nodes/ExecutionNode.js";
import {tryRun} from "../resolver/utils.js";

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

  const tryRunResult = tryRun(() => resolveFromStore(
      store,
      parameter,
      errorStore,
      ctx,
      undefined
    ),
    (resolved) => {
      const {raw, sanitized} = resolved
      parameter.meta.raw = raw as Record<string, unknown> | unknown[]
      parameter.value = sanitized as Sanitized
      ctx[overwriteSanitized] = (val) => parameter.value = val
    },
    (error) => {
      const err = error as Error
      errorStore.processOnce(err)?.add(createIssue({
        ctx, parameter, error
      }))
    },
    () => ({errors: errorStore, ctx})
  )

  if (tryRunResult.isPromise) return tryRunResult.promise as Promise<ValidateParameterResult<Sanitized>>
  return {errors: errorStore, ctx}
}
