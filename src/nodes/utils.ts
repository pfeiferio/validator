import type {Parameter} from "../schema/types.js";
import {ExecutionNode} from "./ExecutionNode.js";
import type {ResolveResult} from "../resolver/utils.js";
import type {ResolveContext} from "../context/ResolveContext.js";

export const COLLECT_AS_ROOT = Symbol()
export const COLLECT_AS_OBJECT = Symbol()
export const COLLECT_AS_LEAF = Symbol()
export const COLLECT_AS_VALUE = COLLECT_AS_LEAF
export const COLLECT_AS_UNDEFINED = Symbol()
export const COLLECT_AS_ARRAY = Symbol()

export function collectNewNode<T>(collectAs: Symbol, parameter: Parameter, ctx: ResolveContext<T>, parentNode?: ExecutionNode, resolved?: ResolveResult<T>): ExecutionNode {
  const node = new ExecutionNode(
    ctx,
    collectAs,
    parameter,
    parentNode,
    resolved,
    ctx.globalExecutionScope
  )

  ctx.registerNode(node, parameter)

  if (!parameter.isObject && !parameter.isArray) {
    // resolved must exists! - maybe...
  }
  return node
}
