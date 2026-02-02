import type {ExecutionNode} from "../nodes/ExecutionNode.js";

export class RequiredIfCtx {

  #reasons: string[] = []
  #dependsOn: ExecutionNode[] = []

  dependsOn(node: ExecutionNode): this {
    this.#dependsOn.push(node)
    return this
  }

  reason(reason: string): this {
    this.#reasons.push(reason)
    return this
  }

  get errorContext() {
    return {
      dependsOn: this.#dependsOn.map(node => {
        return node.path
      }),
      reasons: this.#reasons
    }
  }
}

