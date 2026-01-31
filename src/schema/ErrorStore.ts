import type {ValidationIssue} from "./types.js";
import {SchemaError} from "./SchemaError.js";

export class ErrorStore {
  readonly #errors: ValidationIssue[] = []
  readonly #processed: WeakSet<Error> = new WeakSet()

  constructor() {
    Object.defineProperty(this, '_processed', {
      enumerable: false
    })
  }

  get errors(): ValidationIssue[] {
    return this.#errors
  }

  add(validationIssue: ValidationIssue): this {
    this.#errors.push(validationIssue)
    return this
  }

  hasErrors(): boolean {
    return this.#errors.length > 0
  }

  processOnce(error: Error): ErrorStore | null {
    if (error instanceof SchemaError) {
      throw error
    }

    if (!(error instanceof Error)) {
      return this
    }

    if (this.#processed.has(error)) {
      return null
    }

    this.#processed.add(error)
    return this
  }
}
