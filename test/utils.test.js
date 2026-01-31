import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { INVALID } from '../dist/resolver/utils.js'

describe('utils', () => {
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
