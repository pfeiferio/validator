import type {ParameterAsync, ParameterSync, ParameterUnvalidated} from "./types.js";
import {SchemaError} from "./SchemaError.js";
import {ParameterReference} from "./ParameterReference.js";
import {SCHEMA_ERRORS} from "../errors/errors.js";

export function isParameter(value: unknown): value is ParameterUnvalidated<unknown> {
  return value instanceof ParameterReference
}

export function isParameterSync(value: unknown): value is ParameterSync<unknown> {
  return isParameter(value) && !value.isAsync
}

export function isParameterRaw(value: unknown): value is ParameterSync<unknown> {
  return isParameter(value) && value.isNoValidate
}

export function isParameterAsync(value: unknown): value is ParameterAsync<unknown> {
  return isParameter(value) && value.isAsync
}

export function assertNoPromise<T>(value: T, source?: string): T {
  if (value instanceof Promise) {
    throw new SchemaError(SCHEMA_ERRORS.ASSERTS.UNEXPECTED_PROMISE(source))
  }
  return value;
}
