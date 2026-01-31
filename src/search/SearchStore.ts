export class SearchStore {
  readonly #data: Record<string, unknown>

  constructor(data: Record<string, unknown>) {
    this.#data = data
  }

  has(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#data, name)
  }

  get(name: string): unknown {
    if (!this.has(name)) return undefined
    return this.#data[name]
  }
}
