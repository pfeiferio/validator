import {resolveLeaf} from './resolveLeaf.js'
import {Search} from '../search/Search.js'
import type {SearchStore} from '../search/SearchStore.js'
import type {ErrorStore} from "../schema/ErrorStore.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import type {ResolvedResult} from "./utils.js";
import {ValidationError} from "@pfeiferio/check-primitives";
import {createIssue} from "../schema/createIssue.js";
import {SchemaError} from "../schema/SchemaError.js";
import type {Parameter} from "../schema/types.js";
import {SCHEMA_ERRORS} from "../errors/errors.js";

export function resolveFromStore<Sanitized>(
  store: SearchStore,
  parameter: Parameter,
  errorStore: ErrorStore,
  ctx: ResolveContext<Sanitized>
): ResolvedResult<Sanitized> {
  if (!parameter) {
    throw new SchemaError(SCHEMA_ERRORS.PARAMETER_REFERENCE.MISSING(ctx))
  }

  parameter.freeze()
  ctx.pushRules(parameter.rules);

  const match = Search.search<Sanitized>(store, parameter)

  const isMany = parameter.mode === 'many' && !ctx.forceOne

  parameter.exists = match.isMatch()

  if (
    parameter.isRequired &&
    (!parameter.exists || (isMany && Array.isArray(match.result) && match.result.length === 0))
  ) {

    const error = new ValidationError('required.missing')
    errorStore.processOnce(error)?.add(createIssue({
      ctx, parameter, error
    }))
    throw error
  }

  if (!parameter.exists) {
    return {
      raw: undefined,
      sanitized: parameter.defaultValue as Sanitized,
    }
  }

  return resolveLeaf(match.result, parameter, errorStore, ctx)
}
