import {validateParameter} from "../validate/validateParameter.js";
import {GlobalContext} from "../context/GlobalContext.js";
import {ErrorStore} from "./ErrorStore.js";
import {SearchStore} from "../search/SearchStore.js";
import type {Parameter, ParameterAsync, ParameterRaw, ParameterSync, ParameterUnvalidated} from "./types.js";
import {SchemaError} from "./SchemaError.js";

export type SchemaValidationResult = {
  errors: ErrorStore
  global: GlobalContext<unknown>
}

export class Schema<AsyncGuarantee extends boolean> {

  #parameters: Parameter[] = [];

  add<T>(value: ParameterUnvalidated<T>): Schema<AsyncGuarantee extends true ? true : false>
  add<T>(value: ParameterAsync<T>): Schema<true>
  add<T>(value: ParameterSync<T>): Schema<AsyncGuarantee extends true ? true : false>
  add<T>(value: ParameterRaw<T>): Schema<AsyncGuarantee extends true ? true : false>
  add<T>(
    value: ParameterUnvalidated<T>
      | ParameterRaw<T>
      | ParameterSync<T>
      | ParameterAsync<T>): Schema<AsyncGuarantee extends true ? true : false> | Schema<boolean> {
    this.#parameters.push(value)
    return this as any
  }

  get parameters(): Parameter[] {
    return this.#parameters as any
  }

  #walkParameters(
    store: SearchStore,
    idx: number,
    errors: ErrorStore,
    global: GlobalContext<unknown>,
    result: Record<string, unknown>
  ): SchemaValidationResult | Promise<SchemaValidationResult> {
    for (let i = idx; i < this.#parameters.length; i++) {
      const param = this.#parameters[i]!
      param.freeze()
      const validation = validateParameter(store, param, errors, global)

      assertValidationMatch(validation, param.isAsync, param.name)

      if (validation instanceof Promise) {

        return validation.then(() => {
          result[param.name] = param.value
          return this.#walkParameters(store, i + 1, errors, global, result)
        })
      }

      result[param.name] = param.value
    }

    return this.#walkRules(0, errors, global, result)
  }

  #walkRules(
    idx: number,
    errors: ErrorStore,
    global: GlobalContext<unknown>,
    result: Record<string, unknown>
  ): SchemaValidationResult | Promise<SchemaValidationResult> {

    const rules = global.rules
    for (let i = idx; i < rules.length; i++) {
      const {rule, ctx} = rules[i]!
      const maybePromise = rule(errors, result, ctx)

      if (maybePromise instanceof Promise) {
        return maybePromise.then(() => {
          return this.#walkRules(i + 1, errors, global, result)
        })
      }
    }
    return {errors, global}
  }

  validate(store: SearchStore | Record<string, unknown>): AsyncGuarantee extends true
    ? Promise<SchemaValidationResult>
    : Promise<SchemaValidationResult> | SchemaValidationResult {

    if (!(store instanceof SearchStore)) {
      store = new SearchStore(store)
    }

    const errors = new ErrorStore()
    const global = new GlobalContext<unknown>()
    const result: Record<string, unknown> = {}

    return this.#walkParameters(store, 0, errors, global, result) as any
  }
}

function assertValidationMatch(value: unknown, isAsync: boolean, name: string) {
  const isPromise = value instanceof Promise;

  if (isPromise && !isAsync) {
    throw new SchemaError(`Parameter "${name}" is sync, but validation returned a Promise.`);
  }

  if (!isPromise && isAsync) {
    throw new SchemaError(`Parameter "${name}" is async, but validation returned a sync value.`);
  }
}
