import type {Rule} from '../schema/ParameterReference.js'
import type {ResolveContext} from './ResolveContext.js'
import type {IParameterReferenceBase} from "../schema/types.js";

type RuleWithContext<IsAsync extends boolean> = {
  rule: Rule<IsAsync>,
  ctx: ResolveContext<unknown, IsAsync>
}

export interface PostValidation<Sanitized, IsAsync extends boolean> {
  parameter: IParameterReferenceBase<Sanitized, IsAsync>
  value: unknown
  path: string
  ctx: ResolveContext<Sanitized, IsAsync>
}

export class GlobalContext<Sanitized, IsAsync extends boolean> {
  #postValidations: PostValidation<Sanitized, IsAsync>[] = []

  #rules: RuleWithContext<IsAsync>[] = []

  get rules(): RuleWithContext<IsAsync>[] {
    return this.#rules
  }

  get postValidations(): PostValidation<Sanitized, IsAsync>[] {
    return this.#postValidations
  }
}
