import type {Parameter} from "../schema/types.js";
import type {ResolveResult} from "../resolver/utils.js";
import {NodeList} from "./NodeList.js";
import {COLLECT_AS_ARRAY, COLLECT_AS_LEAF, COLLECT_AS_OBJECT, COLLECT_AS_UNDEFINED} from "./utils.js";
import {SchemaError} from "../schema/SchemaError.js";
import type {ResolveContext} from "../context/ResolveContext.js";
import {SCHEMA_ERRORS} from "../errors/errors.js";
import type {ExecutionScope} from "./ExecutionScope.js";

export class ExecutionNode {

  _parent?: ExecutionNode;

  _children: Set<ExecutionNode> = new Set()

  addChildren(node: ExecutionNode): this {
    this._children.add(node)
    return this
  }

  get parent(): ExecutionNode | undefined {
    return this._parent
  }

  get children(): NodeList {
    return new NodeList(this._children)
  }

  _parameter: Parameter
  _resolved?: ResolveResult<unknown>

  get value(): unknown {

    if (this._collectAs === COLLECT_AS_LEAF) {
      return this._resolved?.sanitized
    }

    if (this._collectAs === COLLECT_AS_OBJECT) {
      return Object.fromEntries(this.children.map(child => {
        return [child.name, child.value]
      }))
    }

    if (this._collectAs === COLLECT_AS_ARRAY) {
      return this.children.map(child => child.value)
    }

    if (this._collectAs === COLLECT_AS_UNDEFINED) {
      // ADD SYMBOL FOR MISSING PARAMETERS? (non required)
      return undefined
    }

    throw new SchemaError(SCHEMA_ERRORS.EXECUTION_NODE.INVALID_COLLECT_STATE())
  }

  toJSON() {
    return {
      name: this.name,
      children: this.children.map(child => child.name),
      parent: this.parent,
      value: this.value,
      raw: this.raw,
      path: this.path
    }
  }

  get raw() {
    return this._resolved?.raw
  }

  readonly _collectAs: Symbol

  readonly _path: string


  readonly _isRoot: boolean

  readonly _executionScope?: ExecutionScope

  constructor(
    ctx: ResolveContext<unknown>,
    collectAs: Symbol,
    parameter: Parameter,
    parentNode: ExecutionNode | undefined,
    resolved: ResolveResult<unknown> | undefined,
    executionScope: ExecutionScope
  ) {
    this._isRoot = parentNode === undefined
    this._parameter = parameter
    this._collectAs = collectAs
    this._path = ctx.path
    if (resolved) {
      this._resolved = resolved
    }

    if (parentNode) {
      this._parent = parentNode
      this._parent.addChildren(this)
    } else {
      this._executionScope = executionScope
      executionScope.register(this)
    }
  }

  get isRoot() {
    return this._isRoot
  }

  get path() {
    return this._path
  }

  siblings(filter?: Parameter): NodeList {

    return (
      this.isRoot
        ? this._executionScope!.nodes
        : this.parent?.children
    )?.filter(child => {
      if (child === this) {
        return false
      }
      if (filter) {
        return child.is(filter)
      }

      return true
    }) ?? new NodeList()
  }

  is(parameter: Parameter | ExecutionNode) {
    if (parameter instanceof ExecutionNode) {
      parameter = parameter._parameter!
    }
    return this._parameter === parameter
  }

  get name() {
    return this._parameter.name
  }

// EVENTUELL NOCH IMPLEMENTIEREN, TBD
//   parameter
//   path
//   value
//   raw
//   parent
//   children
//
//   isRoot()
//   isLeaf()
//   siblings()
//   ancestors()
//   descendants()
//   is(parameter)
//   collect(parameter)

}
