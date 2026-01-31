export class SearchResult {
  readonly #match: boolean
  readonly #result?: unknown

  constructor(match: boolean, result?: unknown) {
    this.#match = match
    this.#result = result
  }

  get result(): unknown {
    return this.#result
  }

  isMatch(): boolean {
    return this.#match
  }
}
