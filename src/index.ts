export {
  isParameter,
  isParameterRaw,
  isParameterSync,
  isParameterAsync,
} from "./schema/utils.js";

export type {
  ParameterAsync,
  ParameterSync,
  ParameterBase,
  Parameter,
  ValidationIssue,
} from './schema/types.js'


export {validateParameter} from './validate/validateParameter.js'
export type {ValidateParameterResult} from './validate/validateParameter.js'

export {Schema} from './schema/Schema.js'
export type {SchemaValidationResult} from './schema/Schema.js'

export {createParameter} from './schema/createParameter.js'
export type {
  ValidationHandle,
  AsyncValidationHandle,
  ShapeValidationHandle,
  ParameterMode,
  Rule
} from './schema/ParameterReference.js'

export {SearchStore} from './search/SearchStore.js'
export {ErrorStore} from './schema/ErrorStore.js'
export {SchemaError} from './schema/SchemaError.js'



// TODOS! DOKUS KOMBINIEREN UND FINALISIEREN, INDEX DEFINIEREN DIE BEIDEN EINTRÄGE HIER NOCH
// DANN BRAUCHEN WIR EIN POST RULE APPLY EXAMPLE
export {GlobalContext} from './context/GlobalContext.js'
export type {PostValidation} from './context/GlobalContext.js'


