import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { Search } from '../dist/search/Search.js'
import { SearchStore } from '../dist/search/SearchStore.js'
import { ParameterReference } from '../dist/schema/ParameterReference.js'

describe('Search', () => {
  describe('search()', () => {
    test('should return match when parameter exists in store', () => {
      const store = new SearchStore({ field1: 'value1' })
      const param = new ParameterReference('field1')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 'value1')
    })

    test('should return no match when parameter does not exist', () => {
      const store = new SearchStore({ field1: 'value1' })
      const param = new ParameterReference('field2')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), false)
      assert.strictEqual(result.result, undefined)
    })

    test('should find parameter with exact name match', () => {
      const store = new SearchStore({ 
        field: 'value',
        field1: 'value1',
        field2: 'value2'
      })
      const param = new ParameterReference('field1')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 'value1')
    })

    test('should return null value when stored', () => {
      const store = new SearchStore({ field: null })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, null)
    })

    test('should return undefined value when stored', () => {
      const store = new SearchStore({ field: undefined })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, undefined)
    })

    test('should return zero when stored', () => {
      const store = new SearchStore({ field: 0 })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 0)
    })

    test('should return false when stored', () => {
      const store = new SearchStore({ field: false })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, false)
    })

    test('should return empty string when stored', () => {
      const store = new SearchStore({ field: '' })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, '')
    })

    test('should find objects', () => {
      const obj = { nested: 'value' }
      const store = new SearchStore({ field: obj })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, obj)
    })

    test('should find arrays', () => {
      const arr = [1, 2, 3]
      const store = new SearchStore({ field: arr })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, arr)
    })

    test('should handle special characters in parameter name', () => {
      const store = new SearchStore({ 
        'field.with.dots': 'value1',
        'field-with-dashes': 'value2'
      })
      
      const param1 = new ParameterReference('field.with.dots')
      const result1 = Search.search(store, param1)
      assert.strictEqual(result1.isMatch(), true)
      assert.strictEqual(result1.result, 'value1')
      
      const param2 = new ParameterReference('field-with-dashes')
      const result2 = Search.search(store, param2)
      assert.strictEqual(result2.isMatch(), true)
      assert.strictEqual(result2.result, 'value2')
    })

    test('should not match inherited properties', () => {
      const store = new SearchStore({})
      const param = new ParameterReference('toString')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), false)
    })

    test('should work with empty store', () => {
      const store = new SearchStore({})
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), false)
    })

    test('should be case-sensitive', () => {
      const store = new SearchStore({ Field: 'value' })
      const param = new ParameterReference('field')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), false)
    })

    test('should handle numeric string keys', () => {
      const store = new SearchStore({ '123': 'value' })
      const param = new ParameterReference('123')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 'value')
    })

    test('should handle empty string as key', () => {
      const store = new SearchStore({ '': 'value' })
      const param = new ParameterReference('')
      
      const result = Search.search(store, param)
      
      assert.strictEqual(result.isMatch(), true)
      assert.strictEqual(result.result, 'value')
    })
  })

  describe('multiple searches', () => {
    test('should handle multiple searches on same store', () => {
      const store = new SearchStore({ 
        field1: 'value1',
        field2: 'value2',
        field3: 'value3'
      })
      
      const param1 = new ParameterReference('field1')
      const param2 = new ParameterReference('field2')
      const param3 = new ParameterReference('field3')
      
      const result1 = Search.search(store, param1)
      const result2 = Search.search(store, param2)
      const result3 = Search.search(store, param3)
      
      assert.strictEqual(result1.result, 'value1')
      assert.strictEqual(result2.result, 'value2')
      assert.strictEqual(result3.result, 'value3')
    })

    test('should not interfere with previous search results', () => {
      const store = new SearchStore({ field: 'value' })
      const param = new ParameterReference('field')
      
      const result1 = Search.search(store, param)
      const result2 = Search.search(store, param)
      
      assert.strictEqual(result1.result, result2.result)
      assert.notStrictEqual(result1, result2) // Different SearchResult instances
    })
  })
})
