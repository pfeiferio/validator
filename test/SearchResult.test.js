import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {SearchResult} from '../dist/search/SearchResult.js'

describe('SearchResult', () => {
  describe('constructor', () => {
    test('should create result with match true and value', () => {
      const result = new SearchResult(true, 'value')
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 'value')
    })

    test('should create result with match false', () => {
      const result = new SearchResult(false)
      assert.strictEqual(result.isMatch(), false)
      assert.strictEqual(result.result, undefined)
    })

    test('should accept undefined as explicit result', () => {
      const result = new SearchResult(true, undefined)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, undefined)
    })

    test('should accept null as result', () => {
      const result = new SearchResult(true, null)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, null)
    })
  })

  describe('isMatch()', () => {
    test('should return true when match is true', () => {
      const result = new SearchResult(true, 'value')
      assert.strictEqual(result.isMatch(), true)
    })

    test('should return false when match is false', () => {
      const result = new SearchResult(false)
      assert.strictEqual(result.isMatch(), false)
    })

    test('should be consistent across multiple calls', () => {
      const result = new SearchResult(true, 'value')
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.isMatch(), true)
    })
  })

  describe('result getter', () => {
    test('should return stored value', () => {
      const value = {key: 'value'}
      const result = new SearchResult(true, value)
      assert.strictEqual(result.result, value)
    })

    test('should return undefined when no result provided', () => {
      const result = new SearchResult(false)
      assert.strictEqual(result.result, undefined)
    })

    test('should be consistent across multiple accesses', () => {
      const result = new SearchResult(true, 'test')
      assert.strictEqual(result.result, 'test')
      assert.strictEqual(result.result, 'test')
      assert.strictEqual(result.result, 'test')
    })
  })

  describe('result values', () => {
    test('should store string values', () => {
      const result = new SearchResult(true, 'hello')
      assert.strictEqual(result.result, 'hello')
    })

    test('should store number values', () => {
      const result = new SearchResult(true, 42)
      assert.strictEqual(result.result, 42)
    })

    test('should store boolean values', () => {
      const result = new SearchResult(true, false)
      assert.strictEqual(result.result, false)
    })

    test('should store object values', () => {
      const obj = {a: 1, b: 2}
      const result = new SearchResult(true, obj)
      assert.strictEqual(result.result, obj)
    })

    test('should store array values', () => {
      const arr = [1, 2, 3]
      const result = new SearchResult(true, arr)
      assert.strictEqual(result.result, arr)
    })

    test('should store symbol values', () => {
      const sym = Symbol('test')
      const result = new SearchResult(true, sym)
      assert.strictEqual(result.result, sym)
    })

    test('should store function values', () => {
      const fn = () => {
      }
      const result = new SearchResult(true, fn)
      assert.strictEqual(result.result, fn)
    })
  })

  describe('falsy values', () => {
    test('should distinguish between false match and false result', () => {
      const noMatch = new SearchResult(false)
      const falseResult = new SearchResult(true, false)

      assert.strictEqual(noMatch.isMatch(), false)
      assert.strictEqual(falseResult.isMatch(), true)
      assert.strictEqual(falseResult.result, false)
    })

    test('should store zero as result', () => {
      const result = new SearchResult(true, 0)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 0)
    })

    test('should store empty string as result', () => {
      const result = new SearchResult(true, '')
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, '')
    })

    test('should store null as result', () => {
      const result = new SearchResult(true, null)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, null)
    })

    test('should store undefined as result', () => {
      const result = new SearchResult(true, undefined)
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, undefined)
    })

    test('should store NaN as result', () => {
      const result = new SearchResult(true, NaN)
      assert.strictEqual(result.isMatch(), true)
      assert.ok(Number.isNaN(result.result))
    })
  })

  describe('immutability', () => {
    test('should not allow changing match status', () => {
      const result = new SearchResult(true, 'value')
      // Properties should be readonly
      assert.strictEqual(result.isMatch(), true)
    })

    test('should maintain object reference', () => {
      const obj = {mutable: 'value'}
      const result = new SearchResult(true, obj)

      obj.mutable = 'changed'
      assert.strictEqual(result.result.mutable, 'changed')
    })

    test('should maintain array reference', () => {
      const arr = [1, 2, 3]
      const result = new SearchResult(true, arr)

      arr.push(4)
      assert.strictEqual(result.result.length, 4)
    })
  })
})
