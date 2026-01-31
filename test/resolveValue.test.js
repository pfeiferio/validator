import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolveValue } from '../dist/resolver/resolveValue.js'
import { ParameterReference } from '../dist/schema/ParameterReference.js'
import { ErrorStore } from '../dist/schema/ErrorStore.js'
import { ResolveContext } from '../dist/context/ResolveContext.js'
import { GlobalContext } from '../dist/context/GlobalContext.js'

describe('resolveValue', () => {
  describe('basic resolution', () => {
    test('should resolve simple value without validation', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('test', param, errorStore, ctx)
      
      assert.strictEqual(result.raw, 'test')
      assert.strictEqual(result.sanitized, 'test')
      assert.strictEqual(errorStore.errors.length, 0)
    })

    test('should keep raw value unchanged', async () => {
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('test', param, errorStore, ctx)
      
      assert.strictEqual(result.raw, 'test')
      assert.strictEqual(result.sanitized, 'TEST')
    })

    test('should resolve null value', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(null, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, null)
      assert.strictEqual(result.sanitized, null)
    })

    test('should resolve undefined value', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(undefined, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, undefined)
      assert.strictEqual(result.sanitized, undefined)
    })

    test('should resolve number value', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(42, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, 42)
      assert.strictEqual(result.sanitized, 42)
    })

    test('should resolve boolean value', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(true, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, true)
      assert.strictEqual(result.sanitized, true)
    })

    test('should resolve object value', async () => {
      const obj = { key: 'value' }
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(obj, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, obj)
      assert.strictEqual(result.sanitized, obj)
    })

    test('should resolve array value', async () => {
      const arr = [1, 2, 3]
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(arr, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, arr)
      assert.strictEqual(result.sanitized, arr)
    })
  })

  describe('validation', () => {
    test('should apply validation function', async () => {
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('hello', param, errorStore, ctx)
      
      assert.strictEqual(result.sanitized, 'HELLO')
    })

    test('should transform value through validation', async () => {
      const param = new ParameterReference('field').validation(v => Number(v))
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('42', param, errorStore, ctx)
      
      assert.strictEqual(result.raw, '42')
      assert.strictEqual(result.sanitized, 42)
    })

    test('should handle validation errors', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Validation failed')
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      await assert.rejects(
        async () => await resolveValue('test', param, errorStore, ctx),
        /Validation failed/
      )
      
      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(errorStore.errors[0].path, 'field')
      assert.strictEqual(errorStore.errors[0].reason, 'Validation failed')
    })

    test('should store error only once for same error', async () => {
      const error = new Error('Validation failed')
      const param = new ParameterReference('field').validation(v => {
        throw error
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      await assert.rejects(async () => await resolveValue('test', param, errorStore, ctx))
      
      assert.strictEqual(errorStore.errors.length, 1)
    })

    test('should apply complex validation', async () => {
      const param = new ParameterReference('field').validation(v => {
        if (typeof v !== 'string') throw new Error('Must be string')
        if (v.length < 3) throw new Error('Too short')
        return v.trim().toLowerCase()
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('  HELLO  ', param, errorStore, ctx)
      
      assert.strictEqual(result.sanitized, 'hello')
    })
  })

  describe('postValidations', () => {
    test('should add to postValidations on success', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', { global })
      
      await resolveValue('test', param, errorStore, ctx)

      assert.strictEqual(global.postValidations.length, 1)
      assert.strictEqual(global.postValidations[0].parameter, param)
      assert.strictEqual(global.postValidations[0].value, 'test')
      assert.strictEqual(global.postValidations[0].path, 'field')
    })

    test('should use sanitized value in postValidations', async () => {
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', { global })
      
      await resolveValue('test', param, errorStore, ctx)
      
      assert.strictEqual(global.postValidations[0].value, 'TEST')
    })

    test('should not add to postValidations on validation error', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Failed')
      })
      const errorStore = new ErrorStore()
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', { global })
      
      await assert.rejects(async () => await resolveValue('test', param, errorStore, ctx))
      
      assert.strictEqual(global.postValidations.length, 0)
    })

    test('should include context in postValidations', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const global = new GlobalContext()
      const ctx = new ResolveContext(['root', 'field'], { global })
      
      await resolveValue('test', param, errorStore, ctx)
      
      assert.strictEqual(global.postValidations[0].path, 'root.field')
      assert.strictEqual(global.postValidations[0].ctx, ctx)
    })
  })

  describe('error handling', () => {
    test('should store error with correct path', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Custom error')
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext(['root', 'nested', 'field'], { global: new GlobalContext() })
      
      await assert.rejects(async () => await resolveValue('test', param, errorStore, ctx))
      assert.strictEqual(errorStore.errors[0].path, 'root.nested.field')
      assert.strictEqual(errorStore.errors[0].reason, 'Custom error')
    })

    test('should rethrow validation errors', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Test error')
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      await assert.rejects(
        async () => await resolveValue('test', param, errorStore, ctx),
        /Test error/
      )
    })

    test('should handle non-Error objects thrown', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw 'String error' // eslint-disable-line no-throw-literal
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      await assert.rejects(async () => await resolveValue('test', param, errorStore, ctx))
    })
  })

  describe('edge cases', () => {
    test('should handle empty string', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('', param, errorStore, ctx)
      
      assert.strictEqual(result.raw, '')
      assert.strictEqual(result.sanitized, '')
    })

    test('should handle zero', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(0, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, 0)
      assert.strictEqual(result.sanitized, 0)
    })

    test('should handle false', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(false, param, errorStore, ctx)
      
      assert.strictEqual(result.raw, false)
      assert.strictEqual(result.sanitized, false)
    })

    test('should handle NaN', async () => {
      const param = new ParameterReference('field')
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue(NaN, param, errorStore, ctx)
      
      assert.ok(Number.isNaN(result.raw))
      assert.ok(Number.isNaN(result.sanitized))
    })

    test('should handle validation returning different type', async () => {
      const param = new ParameterReference('field').validation(v => ({ transformed: v }))
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', { global: new GlobalContext() })
      
      const result = await resolveValue('test', param, errorStore, ctx)
      
      assert.deepStrictEqual(result.sanitized, { transformed: 'test' })
    })
  })
})
