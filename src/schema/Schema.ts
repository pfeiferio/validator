import {validateParameter} from "../validate/validateParameter.js";
import {GlobalContext} from "../context/GlobalContext.js";
import {ErrorStore} from "./ErrorStore.js";
import type {SearchStore} from "../search/SearchStore.js";
import type {DynamicScheme, IParameterReferenceBase} from "./types.js";
import {SchemaError} from "./SchemaError.js";

export type SchemaValidationResult<IsAsync extends boolean> = {
  errors: ErrorStore
  global: GlobalContext<unknown, IsAsync>
}

export class Schema<IsAsync extends boolean> {

  #isAsync: IsAsync = false as IsAsync

  #parameters: IParameterReferenceBase<unknown, boolean>[] = [];

  add<T extends boolean>(value: IParameterReferenceBase<unknown, T>): Schema<IsAsync extends true ? true : T> {
    this.#parameters.push(value)
    return this as any
  }

  get parameters(): IParameterReferenceBase<unknown, IsAsync extends true ? true : false>[] {
    return this.#parameters as any
  }

  #walkParameters(
    store: SearchStore,
    idx: number,
    errors: ErrorStore,
    global: GlobalContext<unknown, IsAsync>,
    result: Record<string, unknown>
  ): SchemaValidationResult<IsAsync> | Promise<SchemaValidationResult<IsAsync>> {
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
    global: GlobalContext<unknown, IsAsync>,
    result: Record<string, unknown>
  ): SchemaValidationResult<IsAsync> | Promise<SchemaValidationResult<IsAsync>> {

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

  get isAsync(): IsAsync {
    return this.#isAsync
  }

  validate(store: SearchStore): DynamicScheme<IsAsync> {
    this.#isAsync = this.#parameters.some(parameter => parameter.isAsync) as IsAsync
    const errors = new ErrorStore()
    const global = new GlobalContext<unknown, IsAsync>()
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
