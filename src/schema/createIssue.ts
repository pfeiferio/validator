import type {ResolveContext} from "../context/ResolveContext.js";
import type {Parameter, ValidationIssue} from "./types.js";
import {ValidationError} from "@pfeiferio/check-primitives";

type IssueArguments = {
  ctx: ResolveContext<unknown>,
  parameter: Parameter,
  error: Error | ValidationError | string | unknown
}

export function createIssue(issueArguments: IssueArguments): ValidationIssue {

  const ctx = issueArguments.ctx
  const error = issueArguments.error
  const parameter = issueArguments.parameter

  if (error instanceof ValidationError) {
    return {
      path: ctx.path,
      name: parameter.name,
      reason: error.code,
      context: error.context
    }
  }

  return {
    path: ctx.path,
    name: parameter.name,
    reason: error instanceof Error ? error.message : String(error)
  }
}
