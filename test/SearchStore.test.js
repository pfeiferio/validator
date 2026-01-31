import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { SearchStore } from '../dist/search/SearchStore.js'

describe('SearchStore', () => {
  describe('constructor', () => {
    test('should create store with data', () => {
      const data = { key1: 'value1', key2: 'value2' }
      const store = new SearchStore(data)
      
      assert.ok(store)
    })

    test('should accept empty object', () => {
      const store = new SearchStore({})
      assert.ok(store)
    })

    test('should accept nested objects', () => {
      const data = {
        nested: { deep: { value: 123 } }
      }
      const store = new SearchStore(data)
      
      assert.ok(store.has('nested'))
    })

    test('should accept arrays as values', () => {
      const data = { arr: [1, 2, 3] }
      const store = new SearchStore(data)
      
      assert.ok(store.has('arr'))
    })
  })

  describe('has()', () => {
    test('should return true for existing keys', () => {
      const store = new SearchStore({ key1: 'value1' })
      assert.strictEqual(store.has('key1'), true)
    })

    test('should return false for non-existing keys', () => {
      const store = new SearchStore({ key1: 'value1' })
      assert.strictEqual(store.has('key2'), false)
    })

    test('should return false for inherited properties', () => {
      const store = new SearchStore({})
      assert.strictEqual(store.has('toString'), false)
      assert.strictEqual(store.has('constructor'), false)
    })

    test('should return true for falsy values', () => {
      const store = new SearchStore({ 
        null: null, 
        undef: undefined, 
        zero: 0, 
        false: false,
        empty: '' 
      })
      
      assert.strictEqual(store.has('null'), true)
      assert.strictEqual(store.has('undef'), true)
      assert.strictEqual(store.has('zero'), true)
      assert.strictEqual(store.has('false'), true)
      assert.strictEqual(store.has('empty'), true)
    })

    test('should handle special characters in keys', () => {
      const store = new SearchStore({ 
        'key.with.dots': 'value',
        'key-with-dashes': 'value',
        'key_with_underscores': 'value'
      })
      
      assert.strictEqual(store.has('key.with.dots'), true)
      assert.strictEqual(store.has('key-with-dashes'), true)
      assert.strictEqual(store.has('key_with_underscores'), true)
    })
  })

  describe('get()', () => {
    test('should return value for existing key', () => {
      const store = new SearchStore({ key1: 'value1' })
      assert.strictEqual(store.get('key1'), 'value1')
    })

    test('should return undefined for non-existing key', () => {
      const store = new SearchStore({ key1: 'value1' })
      assert.strictEqual(store.get('key2'), undefined)
    })

    test('should return nested objects', () => {
      const nested = { deep: 'value' }
      const store = new SearchStore({ key: nested })
      
      assert.strictEqual(store.get('key'), nested)
    })

    test('should return arrays', () => {
      const arr = [1, 2, 3]
      const store = new SearchStore({ key: arr })
      
      assert.strictEqual(store.get('key'), arr)
    })

    test('should return null value', () => {
      const store = new SearchStore({ key: null })
      assert.strictEqual(store.get('key'), null)
    })

    test('should return undefined value', () => {
      const store = new SearchStore({ key: undefined })
      assert.strictEqual(store.get('key'), undefined)
    })

    test('should return zero', () => {
      const store = new SearchStore({ key: 0 })
      assert.strictEqual(store.get('key'), 0)
    })

    test('should return false', () => {
      const store = new SearchStore({ key: false })
      assert.strictEqual(store.get('key'), false)
    })

    test('should return empty string', () => {
      const store = new SearchStore({ key: '' })
      assert.strictEqual(store.get('key'), '')
    })

    test('should not return inherited properties', () => {
      const store = new SearchStore({})
      assert.strictEqual(store.get('toString'), undefined)
    })
  })

  describe('data types', () => {
    test('should store strings', () => {
      const store = new SearchStore({ str: 'hello' })
      assert.strictEqual(store.get('str'), 'hello')
    })

    test('should store numbers', () => {
      const store = new SearchStore({ num: 42 })
      assert.strictEqual(store.get('num'), 42)
    })

    test('should store booleans', () => {
      const store = new SearchStore({ bool: true })
      assert.strictEqual(store.get('bool'), true)
    })

    test('should store objects', () => {
      const obj = { nested: 'value' }
      const store = new SearchStore({ obj })
      assert.strictEqual(store.get('obj'), obj)
    })

    test('should store arrays', () => {
      const arr = [1, 2, 3]
      const store = new SearchStore({ arr })
      assert.strictEqual(store.get('arr'), arr)
    })

    test('should store symbols', () => {
      const sym = Symbol('test')
      const store = new SearchStore({ sym })
      assert.strictEqual(store.get('sym'), sym)
    })

    test('should store functions', () => {
      const fn = () => {}
      const store = new SearchStore({ fn })
      assert.strictEqual(store.get('fn'), fn)
    })
  })

  describe('edge cases', () => {
    test('should handle __proto__ key safely', () => {
      const store = new SearchStore({ __proto__: 'value' })
      // Should not pollute prototype
      assert.strictEqual(store.has('__proto__'), false)
    })

    test('should handle constructor key', () => {
      const store = new SearchStore({ constructor: 'value' })
      assert.strictEqual(store.has('constructor'), true)
      assert.strictEqual(store.get('constructor'), 'value')
    })

    test('should handle numeric string keys', () => {
      const store = new SearchStore({ '123': 'value' })
      assert.strictEqual(store.has('123'), true)
      assert.strictEqual(store.get('123'), 'value')
    })

    test('should handle empty string key', () => {
      const store = new SearchStore({ '': 'value' })
      assert.strictEqual(store.has(''), true)
      assert.strictEqual(store.get(''), 'value')
    })
  })
})
