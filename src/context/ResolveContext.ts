import {GlobalContext, type PostValidation} from './GlobalContext.js'
import type {Rule} from "../schema/ParameterReference.js";
import {assertString} from "@pfeiferio/check-primitives";
import {ExecutionNode} from "../nodes/ExecutionNode.js";
import type {Parameter} from "../schema/types.js";
import {SchemaError} from "../schema/SchemaError.js";
import {SCHEMA_ERRORS} from "../errors/errors.js";

export interface ResolveContextOptions<Sanitized> {
  global: GlobalContext<Sanitized>
  forceOne?: boolean
  name?: string
}

export class ResolveContext<Sanitized> {
  readonly #forceOne: boolean = false
  readonly #global: GlobalContext<Sanitized>
  readonly #paths: string[]
  readonly #name: string
  #node?: ExecutionNode

  constructor(
    path: string | string[],
    {global, forceOne = false, name}: ResolveContextOptions<Sanitized>
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

  get postValidations(): PostValidation<Sanitized>[] {
    return this.#global.postValidations
  }

  pushRules(rules: Rule[]) {
    rules.forEach(rule => this.#global.rules.push({rule, ctx: this}))
  }

  get global() {
    return this.#global
  }

  registerNode(node: ExecutionNode, parameter: Parameter) {
    this.#global.registerNode(node, parameter)
    this.#node = node
  }

  get globalExecutionScope() {
    return this.#global.executionScope
  }

  get node(): ExecutionNode {
    if (!this.#node) {
      throw new SchemaError(SCHEMA_ERRORS.RESOLVE_CONTEXT.MISSING_NODE(this.path))
    }
    return this.#node
  }

  get path(): string {
    return this.#paths.join('.')
  }

  child(path: string): ResolveContext<Sanitized> {
    return new ResolveContext([...this.#paths, path], {
      global: this.#global,
      forceOne: false
    })
  }

  item(path: string): ResolveContext<Sanitized> {
    return new ResolveContext([...this.#paths, path], {
      name: path,
      global: this.#global,
      forceOne: true
    })
  }
}
