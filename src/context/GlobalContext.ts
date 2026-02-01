import type {Rule} from '../schema/ParameterReference.js'
import type {ResolveContext} from './ResolveContext.js'
import type {Parameter} from "../schema/types.js";

type RuleWithContext = {
  rule: Rule,
  ctx: ResolveContext<unknown>
}

export interface PostValidation<Sanitized> {
  parameter: Parameter
  value: unknown
  path: string
  ctx: ResolveContext<Sanitized>
}

export class GlobalContext<Sanitized> {
  #postValidations: PostValidation<Sanitized>[] = []

  #rules: RuleWithContext[] = []

  get rules(): RuleWithContext[] {
    return this.#rules
  }

  get postValidations(): PostValidation<Sanitized>[] {
    return this.#postValidations
  }
}
