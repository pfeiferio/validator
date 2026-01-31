import {GlobalContext, type PostValidation} from './GlobalContext.js'
import type {Rule} from "../schema/ParameterReference.js";
import {assertString} from "@pfeiferio/check-primitives";

export interface ResolveContextOptions<Sanitized, IsAsync extends boolean> {
  global: GlobalContext<Sanitized, IsAsync>
  forceOne?: boolean
  name?: string
}

export class ResolveContext<Sanitized, IsAsync extends boolean> {
  readonly #forceOne: boolean = false
  readonly #global: GlobalContext<Sanitized, IsAsync>
  readonly #paths: string[]
  readonly #name: string

  constructor(
    path: string | string[],
    {global, forceOne = false, name}: ResolveContextOptions<Sanitized, IsAsync>
  ) {

    if (!Array.isArray(path)) {
      name ??= path
      path = [path]
    }

    name ??= path[path.length - 1] as string

    assertString(name)

    this.#forceOne = forceOne
    this.#paths = path
    this.#name = name
    this.#global = global
  }

  get name(): string {
    return this.#name
  }

  get forceOne(): boolean {
    return this.#forceOne
  }

  get postValidations(): PostValidation<Sanitized, IsAsync>[] {
    return this.#global.postValidations
  }

  pushRules(rules: Rule<IsAsync>[]) {
    rules.forEach(rule => this.#global.rules.push({rule, ctx: this}))
  }

  get path(): string {
    return this.#paths.join('.')
  }

  child(path: string): ResolveContext<Sanitized, IsAsync> {
    return new ResolveContext([...this.#paths, path], {
      global: this.#global,
      forceOne: false
    })
  }

  item(path: string): ResolveContext<Sanitized, IsAsync> {
    return new ResolveContext([...this.#paths, path], {
      name: path,
      global: this.#global,
      forceOne: true
    })
  }
}
