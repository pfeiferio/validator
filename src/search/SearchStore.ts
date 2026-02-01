import {assertObject} from "@pfeiferio/check-primitives";
import {SchemaError} from "../schema/SchemaError.js";

export class SearchStore {
  readonly #data: Record<string, unknown>

  constructor(data: Record<string, unknown>) {
    try {
      assertObject(data)
    } catch (e) {
      throw new SchemaError(String(e))
    }
    this.#data = data
  }

  has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#data, name)
  }

  get<Sanitized>(name: string): Sanitized | undefined {
    if (!this.has(name)) return undefined
    return this.#data[name] as Sanitized
  }
}
