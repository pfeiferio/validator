import {SearchResult} from './SearchResult.js'
import type {SearchStore} from './SearchStore.js'
import type {Parameter} from "../schema/types.js";

export class Search {

  static search<Sanitized = any>(
    store: SearchStore,
    parameter: Parameter
  ): SearchResult<Sanitized> {
    if (store.has(parameter.name)) {
      return new SearchResult<Sanitized>(true, store.get<Sanitized>(parameter.name))
    }
    return new SearchResult<Sanitized>(false)
  }
}
