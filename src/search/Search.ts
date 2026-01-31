import {SearchResult} from './SearchResult.js'
import type {SearchStore} from './SearchStore.js'
import type {IParameterReferenceBase} from "../schema/types.js";

export class Search {
  static search<Sanitized, IsAsync extends boolean>(
    store: SearchStore,
    parameter: IParameterReferenceBase<Sanitized, IsAsync>
  ): SearchResult {
    if (store.has(parameter.name)) {
      return new SearchResult(true, store.get(parameter.name))
    }
    return new SearchResult(false)
  }
}
