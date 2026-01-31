import type {IParameterReferenceAsync, IParameterReferenceBase, IParameterReferenceSync} from "./types.js";
import {SchemaError} from "./SchemaError.js";

export function assertAsyncParameter<T>(
  ref: IParameterReferenceBase<T, boolean>
): asserts ref is IParameterReferenceAsync<T> {
  if (!ref.isAsync) {
    throw new SchemaError(`Assertion failed: Parameter ${ref.name} is not async.`);
  }
}

export function assertSyncParameter<T>(
  ref: IParameterReferenceBase<T, boolean>
): asserts ref is IParameterReferenceSync<T> {
  if (ref.isAsync) {
    throw new SchemaError(`Assertion failed: Parameter ${ref.name} is not sync.`);
  }
}

export function assertNoPromise<T>(value: T, source?: string): T {
  if (value instanceof Promise) {
    const location = source ? ` in ${source}` : "";
    throw new SchemaError(`Unexpected Promise: Synchronous schema cannot handle async validation${location}.`);
  }
  return value;
}
