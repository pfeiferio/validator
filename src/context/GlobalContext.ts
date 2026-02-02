import type {Rule} from '../schema/ParameterReference.js'
import type {ResolveContext} from './ResolveContext.js'
import type {Parameter} from "../schema/types.js";
import {ExecutionNode} from "../nodes/ExecutionNode.js";
import {ExecutionScope} from "../nodes/ExecutionScope.js";

type RuleWithContext = {
  rule: Rule,
  ctx: ResolveContext<unknown>
}

export interface PostValidation<Sanitized> {
  parameter: Parameter
  value: unknown
  path: string
  ctx: ResolveContext<Sanitized>
}

export class GlobalContext<Sanitized> {
  #postValidations: PostValidation<Sanitized>[] = []

  #rules: RuleWithContext[] = []

  get rules(): RuleWithContext[] {
    return this.#rules
  }

  #nodes = new Map()

  registerNode(node: ExecutionNode, parameter: Parameter) {
    const nodes = this.#nodes.get(parameter) ?? []
    nodes.push(node)
    this.#nodes.set(parameter, nodes)
    return node
  }

  #executionScope: ExecutionScope = new ExecutionScope()

  get executionScope() {
    return this.#executionScope
  }

  get nodes() {
    return this.#nodes
  }

  get postValidations(): PostValidation<Sanitized>[] {
    return this.#postValidations
  }
}
