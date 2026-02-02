import type {ExecutionNode} from "./ExecutionNode.js";
import {NodeList} from "./NodeList.js";

export class ExecutionScope {

  _nodes: NodeList = new NodeList()

  register(node: ExecutionNode): this {
    this._nodes.push(node)
    return this
  }

  get nodes(): NodeList {
    return this._nodes
  }
}
