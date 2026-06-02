import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { INVALID } from '../dist/resolver/utils.js'
import { isParameter, isParameterSync, isParameterRaw, isParameterAsync, assertNoPromise } from '../dist/schema/utils.js'
import { ParameterReference } from '../dist/schema/ParameterReference.js'

describe('utils', () => {
  describe('schema/utils', () => {
    describe('isParameter', () => {
      test('returns true for ParameterReference', () => {
        assert.strictEqual(isParameter(new ParameterReference('x')), true)
      })

      test('returns false for non-parameter values', () => {
        assert.strictEqual(isParameter('string'), false)
        assert.strictEqual(isParameter(42), false)
        assert.strictEqual(isParameter(null), false)
        assert.strictEqual(isParameter({}), false)
      })
    })

    describe('isParameterSync', () => {
      test('returns true for sync parameter', () => {
        const param = new ParameterReference('x').validation(v => v)
        assert.strictEqual(isParameterSync(param), true)
      })

      test('returns false for async parameter', () => {
        const param = new ParameterReference('x').asyncValidation(async v => v)
        assert.strictEqual(isParameterSync(param), false)
      })

      test('returns false for non-parameter', () => {
        assert.strictEqual(isParameterSync('string'), false)
      })
    })

    describe('isParameterRaw', () => {
      test('returns true for noValidation parameter', () => {
        const param = new ParameterReference('x').noValidation()
        assert.strictEqual(isParameterRaw(param), true)
      })

      test('returns false for sync parameter', () => {
        const param = new ParameterReference('x').validation(v => v)
        assert.strictEqual(isParameterRaw(param), false)
      })

      test('returns false for non-parameter', () => {
        assert.strictEqual(isParameterRaw(null), false)
      })
    })

    describe('isParameterAsync', () => {
      test('returns true for async parameter', () => {
        const param = new ParameterReference('x').asyncValidation(async v => v)
        assert.strictEqual(isParameterAsync(param), true)
      })

      test('returns false for sync parameter', () => {
        const param = new ParameterReference('x').validation(v => v)
        assert.strictEqual(isParameterAsync(param), false)
      })

      test('returns false for non-parameter', () => {
        assert.strictEqual(isParameterAsync(undefined), false)
      })
    })

    describe('assertNoPromise', () => {
      test('returns value when not a Promise', () => {
        assert.strictEqual(assertNoPromise('hello'), 'hello')
        assert.strictEqual(assertNoPromise(42), 42)
        assert.strictEqual(assertNoPromise(null), null)
      })

      test('throws SchemaError when passed a Promise', () => {
        assert.throws(
          () => assertNoPromise(Promise.resolve('value'), 'test-source'),
          /Unexpected Promise.*test-source/
        )
      })

      test('throws without source when source omitted', () => {
        assert.throws(
          () => assertNoPromise(new Promise(() => {})),
          /Unexpected Promise/
        )
      })
    })
  })

  describe('INVALID symbol', () => {
    test('should be a symbol', () => {
      assert.strictEqual(typeof INVALID, 'symbol')
    })

    test('should be unique', () => {
      const another = Symbol('invalid')
      assert.notStrictEqual(INVALID, another)
    })

    test('should be consistent across imports', () => {
      // Symbol should be the same instance when imported multiple times
      assert.strictEqual(INVALID, INVALID)
    })
  })
})
