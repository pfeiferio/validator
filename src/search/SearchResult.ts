export class SearchResult<Sanitized> {
  readonly #match: boolean
  readonly #result?: Sanitized | undefined

  constructor(match: boolean, result?: Sanitized | undefined) {
    this.#match = match
    this.#result = result
  }

  get result(): Sanitized | undefined {
    return this.#result
  }

  isMatch(): boolean {
    return this.#match
  }
}
