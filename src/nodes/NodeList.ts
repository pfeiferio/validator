import {type ExecutionNode} from "./ExecutionNode.js";

export class NodeList extends Array<ExecutionNode> {
  constructor(nodes?: ExecutionNode[] | Set<ExecutionNode> | number) {
    if (nodes == null) {
      super()
    } else if (nodes instanceof Set) {
      super(...nodes)
    } else if (typeof nodes === 'number') {
      super(nodes);
    } else {
      super(...nodes as any);
    }
  }

  children() {
    const out: Set<ExecutionNode> = new Set()
    for (const node of this) {
      for (const child of node.children) {
        out.add(child)
      }
    }
    return new NodeList(out)
  }

  toJSON() {
    return this.map(x => x.toJSON())
  }

  map<U>(callbackFn: (value: ExecutionNode, index: number, array: ExecutionNode[]) => U, thisArg?: any): U[] {
    return [...super.map(callbackFn, thisArg)]
  }

  filter(predicate: (value: ExecutionNode, index: number, array: ExecutionNode[]) => unknown, thisArg?: any): NodeList;
  filter(predicate: (value: ExecutionNode, index: number, array: NodeList | ExecutionNode[]) => unknown, thisArg?: any): NodeList | ExecutionNode[] {
    return super.filter(predicate, thisArg)
  }

  first() {
    return this.eq(0)
  }

  last() {
    return this.eq(-1)
  }

  eq(idx: number = 0) {
    if (idx < 0) idx = this.length + idx
    return this[idx]
  }
}
