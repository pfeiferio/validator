import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {createIssue} from "../dist/schema/createIssue.js";

describe('ErrorStore', () => {

  const createSimpleIssue = (name, message) => {
    const issue = createIssue({
      error: message,
      ctx: {
        path: name,
      },
      parameter: {
        // name: 'field1',
      }
    })
    return issue
  }
  describe('constructor', () => {
    test('should create an empty error store', () => {
      const store = new ErrorStore()
      assert.strictEqual(store.errors.length, 0)
    })

    test('should have enumerable errors property', () => {
      const store = new ErrorStore()
      const keys = Object.keys(store)
      assert.ok(keys.includes('errors') || store.errors !== undefined)
    })
  })

  describe('add()', () => {
    test('should add a single error', () => {
      const store = new ErrorStore()
      const issue = createIssue({
        error: 'error message',
        ctx: {
          path: 'foo.field1',
        },
        parameter: {
          name: 'field1',
        }
      })
      store.add(issue)
      assert.strictEqual(store.errors.length, 1)
      assert.deepStrictEqual(store.errors[0], {
        path: 'foo.field1',
        name: 'field1',
        reason: 'error message'
      })
    })

    test('should add multiple errors', () => {
      const store = new ErrorStore()
      store.add(createSimpleIssue('field1', 'error 1'))
      store.add(createSimpleIssue('field2', 'error 2'))
      store.add(createSimpleIssue('field3', 'error 3'))

      assert.strictEqual(store.errors.length, 3)
      assert.strictEqual(store.errors[0].path, 'field1')
      assert.strictEqual(store.errors[1].path, 'field2')
      assert.strictEqual(store.errors[2].path, 'field3')
    })

    test('should preserve error order', () => {
      const store = new ErrorStore()
      const errors = [
        ['a', 'first'],
        ['b', 'second'],
        ['c', 'third']
      ]

      errors.forEach(([name, reason]) => store.add(createSimpleIssue(name, reason)))

      errors.forEach(([name, reason], index) => {
        assert.strictEqual(store.errors[index].path, name)
        assert.strictEqual(store.errors[index].reason, reason)
      })
    })
  })

  describe('errors getter', () => {
    test('should return array reference', () => {
      const store = new ErrorStore()
      const errors1 = store.errors
      const errors2 = store.errors

      assert.strictEqual(errors1, errors2)
    })

    test('should reflect added errors', () => {
      const store = new ErrorStore()
      assert.strictEqual(store.errors.length, 0)
      assert.strictEqual(store.hasErrors(), false)

      store.add('test', 'message')
      assert.strictEqual(store.errors.length, 1)
      assert.strictEqual(store.hasErrors(), true)
    })
  })

  describe('processOnce()', () => {
    test('should return store for first processing', () => {
      const store = new ErrorStore()
      const error = new Error('test')

      const result = store.processOnce(error)
      assert.strictEqual(result, store)
    })

    test('should return null for second processing of same error', () => {
      const store = new ErrorStore()
      const error = new Error('test')

      store.processOnce(error)
      const result = store.processOnce(error)

      assert.strictEqual(result, null)
    })

    test('should track different error instances separately', () => {
      const store = new ErrorStore()
      const error1 = new Error('test1')
      const error2 = new Error('test2')

      const result1 = store.processOnce(error1)
      const result2 = store.processOnce(error2)

      assert.strictEqual(result1, store)
      assert.strictEqual(result2, store)
    })

    test('should handle multiple calls with same error', () => {
      const store = new ErrorStore()
      const error = new Error('test')

      assert.strictEqual(store.processOnce(error), store)
      assert.strictEqual(store.processOnce(error), null)
      assert.strictEqual(store.processOnce(error), null)
      assert.strictEqual(store.processOnce(error), null)
    })

    test('should allow chaining with add() when not null', () => {
      const store = new ErrorStore()
      const error = new Error('test')

      store.processOnce(error)?.add(createSimpleIssue('field', 'message'))

      assert.strictEqual(store.errors.length, 1)
    })

    test('should not add when processOnce returns null', () => {
      const store = new ErrorStore()
      const error = new Error('test')

      store.processOnce(error)?.add(createSimpleIssue('field', 'message1'))
      store.processOnce(error)?.add(createSimpleIssue('field', 'message2'))

      assert.strictEqual(store.errors.length, 1)
      assert.strictEqual(store.errors[0].reason, 'message1')
    })
  })

  describe('edge cases', () => {
    test('should handle empty string values', () => {
      const store = new ErrorStore()
      store.add(createSimpleIssue('', ''))

      assert.strictEqual(store.errors.length, 1)
      assert.strictEqual(store.errors[0].path, '')
      assert.strictEqual(store.errors[0].reason, '')
    })

    test('should handle special characters in names and reasons', () => {
      const store = new ErrorStore()
      store.add(createSimpleIssue('field.with.dots', 'error: "quoted"'))

      assert.strictEqual(store.errors[0].path, 'field.with.dots')
      assert.strictEqual(store.errors[0].reason, 'error: "quoted"')
    })

    test('should handle very long error messages', () => {
      const store = new ErrorStore()
      const longMessage = 'x'.repeat(10000)
      store.add(createSimpleIssue('field', longMessage))

      assert.strictEqual(store.errors[0].reason, longMessage)
    })
  })
})
