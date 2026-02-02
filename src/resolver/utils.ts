export const INVALID = Symbol('invalid')

export type MetaValue = {
  raw: unknown | undefined
  //Record<string, unknown> | unknown[] | undefined = undefined

}
export type RawValue = unknown | undefined
export type Value<T> = T | undefined | null
export type SanitizedValue<T> = T | SanitizedObject<T> | undefined
export type SanitizedObject<T> = Record<string, T | null>

export interface ResolveResult<Sanitized> {
  raw: unknown
  sanitized: Value<Sanitized>
}

export type ResolvedResult<Sanitized> = ResolveResult<Sanitized> | Promise<ResolveResult<Sanitized>>
