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

type RunSyncResult =
  | {isPromise: true; promise: Promise<unknown>}
  | {isPromise: false; isSuccess: true}
  | {isPromise: false; isError: true}

export const tryRun = <T>(
  fnValue: () => T | Promise<T>,
  fnSuccess: (value: T) => void,
  fnError: (error: unknown) => void,
  next: () => unknown
): RunSyncResult => {

  try {
    const value = fnValue()
    if (value instanceof Promise) {
      const promise = value.then(resolved => {
        fnSuccess(resolved)
        return next()
      }).catch(error => {
        fnError(error)
        return next()
      })

      return {isPromise: true, promise}
    }
    fnSuccess(value)
    return {
      isPromise: false,
      isSuccess: true,
    }
  } catch (error) {
    fnError(error)
    return {
      isPromise: false,
      isError: true,
    }
  }
}
