import type {ResolveContext} from "../context/ResolveContext.js";
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolvedResult, Value} from "./utils.js";
import {createIssue} from "../schema/createIssue.js";
import type {Parameter} from "../schema/types.js";

export function resolveValue<Sanitized>(
  value: unknown,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>
): ResolvedResult<Sanitized> {
  const raw = value
  let sanitized

  try {
    parameter.path = ctx.path

    const validationResult = parameter.validate(value)
    // if (parameter.useAsyncValidation) {

    if (validationResult instanceof Promise) {

      return validationResult.then(sanitized => {
        ctx.postValidations.push({
          parameter,
          value: sanitized,
          path: ctx.path,
          ctx
        })
        return {raw, sanitized: sanitized as Value<Sanitized>}
      }).catch(error => {
        const err = error as Error
        errorStore.processOnce(err)?.add(createIssue({
          ctx, parameter, error
        }))
        throw err
      })
    }

    sanitized = validationResult

    ctx.postValidations.push({
      parameter,
      value: sanitized,
      path: ctx.path,
      ctx
    })

  } catch (error) {
    const err = error as Error
    errorStore.processOnce(err)?.add(createIssue({
      ctx, parameter, error
    }))
    throw err
  }

  return {raw, sanitized: sanitized as Value<Sanitized>}
}
