import type {ParameterUnvalidated} from "./types.js";
import {ParameterReference} from "./ParameterReference.js";

export function createParameter<T>(
  name: string,
  required = true,
  defaultValue: unknown = undefined
): ParameterUnvalidated<T> {
  return new ParameterReference<T, false>(name, required, defaultValue)
}
