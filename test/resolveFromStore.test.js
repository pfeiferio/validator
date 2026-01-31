import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {resolveFromStore} from '../dist/resolver/resolveFromStore.js'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {ResolveContext} from '../dist/context/ResolveContext.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'

describe('resolveFromStore', () => {
  describe('basic store resolution', () => {
    test('should resolve value from store', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'value')
      assert.strictEqual(result.raw, 'value')
    })

    test('should throw if parameter is missing', async () => {
      const store = new SearchStore({})
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveFromStore(store, null, errorStore, ctx),
        /ParameterReference missing at path/
      )
    })

    test('should call freeze on parameter', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field').noValidation()
      let freezeCalled = false

      const originalFreeze = param.freeze.bind(param)
      param.freeze = async function() {
        freezeCalled = true
        return originalFreeze()
      }

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(freezeCalled, true)
    })
  })

  describe('required parameters', () => {
    test('should throw for missing required parameter', async () => {
      const store = new SearchStore({})
      const param = new ParameterReference('field', true).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveFromStore(store, param, errorStore, ctx),
        /required\.missing/
      )
    })

    test('should not throw for present required parameter', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field', true).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.doesNotReject(
        async () => await resolveFromStore(store, param, errorStore, ctx)
      )
    })

    test('should throw for empty array when required many', async () => {
      const store = new SearchStore({field: []})
      const param = new ParameterReference('field', true).many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveFromStore(store, param, errorStore, ctx),
        /required\.missing/
      )
    })

    test('should not throw for non-empty array when required many', async () => {
      const store = new SearchStore({field: [1, 2]})
      const param = new ParameterReference('field', true).many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 2)
    })
  })

  describe('optional parameters with defaults', () => {
    test('must return default for missing optional parameter', async () => {
      const store = new SearchStore({})
      const param = new ParameterReference('field', false, 'default').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'default')
      assert.strictEqual(result.raw, undefined)
    })

    test('should override default when value present', async () => {
      const store = new SearchStore({field: 'provided'})
      const param = new ParameterReference('field', false, 'default').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'provided')
    })

    test('should use null as default', async () => {
      const store = new SearchStore({})
      const param = new ParameterReference('field', false, null).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, null)
    })

    test('should use undefined as default', async () => {
      const store = new SearchStore({})
      const param = new ParameterReference('field', false, undefined).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, undefined)
    })

    test('should use object as default', async () => {
      const defaultObj = {key: 'value'}
      const store = new SearchStore({})
      const param = new ParameterReference('field', false, defaultObj).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, defaultObj)
    })

    test('should use array as default', async () => {
      const defaultArr = [1, 2, 3]
      const store = new SearchStore({})
      const param = new ParameterReference('field', false, defaultArr).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, defaultArr)
    })
  })

  describe('forceOne handling', () => {
    test('should not treat as many when forceOne is true', async () => {
      const store = new SearchStore({field: 'single'})
      const param = new ParameterReference('field').noValidation().many()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext(), forceOne: true})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      // Should treat as single value, not array
      assert.strictEqual(result.sanitized, 'single')
    })

    test('should treat as many when forceOne is false', async () => {
      const store = new SearchStore({field: ['a', 'b']})
      const param = new ParameterReference('field').noValidation().many()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext(), forceOne: false})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.ok(Array.isArray(result.sanitized))
      assert.strictEqual(result.sanitized.length, 2)
    })
  })

  describe('search behavior', () => {
    test('should find value by parameter name', async () => {
      const store = new SearchStore({
        field1: 'value1',
        field2: 'value2'
      })
      const param = new ParameterReference('field2').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field2', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'value2')
    })

    test('should handle parameter not in store', async () => {
      const store = new SearchStore({other: 'value'})
      const param = new ParameterReference('missing', false, 'default').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('missing', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'default')
    })
  })

  describe('value resolution delegation', () => {
    test('should resolve simple values', async () => {
      const store = new SearchStore({field: 'simple'})
      const param = new ParameterReference('field').noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'simple')
    })

    test('should resolve arrays', async () => {
      const store = new SearchStore({field: [1, 2, 3]})
      const param = new ParameterReference('field').noValidation().many()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, [1, 2, 3])
    })

    test('should resolve objects', async () => {
      const store = new SearchStore({
        user: {name: 'John', age: 30}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').noValidation(),
        age: new ParameterReference('age').noValidation()
      })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('user', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'John')
      assert.strictEqual(result.sanitized.age, 30)
    })

    test('should resolve with validation', async () => {
      const store = new SearchStore({field: 'hello'})
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'HELLO')
    })
  })

  describe('edge cases', () => {
    test('should handle falsy values in store', async () => {
      const store = new SearchStore({
        zero: 0,
        false: false,
        empty: '',
        null: null
      })

      const tests = [
        {name: 'zero', expected: 0},
        {name: 'false', expected: false},
        {name: 'empty', expected: ''},
        {name: 'null', expected: null}
      ]

      for (const {name, expected} of tests) {
        const param = new ParameterReference(name).noValidation()
        const errorStore = new ErrorStore()
        const ctx = new ResolveContext(name, {global: new GlobalContext()})

        const result = await resolveFromStore(store, param, errorStore, ctx)
        assert.strictEqual(result.sanitized, expected)
      }
    })

    test('should handle special characters in parameter names', async () => {
      const store = new SearchStore({
        'field-with-dash': 'value1',
        'field.with.dot': 'value2'
      })

      const param1 = new ParameterReference('field-with-dash').noValidation()
      const errorStore1 = new ErrorStore()
      const ctx1 = new ResolveContext('field-with-dash', {global: new GlobalContext()})
      const result1 = await resolveFromStore(store, param1, errorStore1, ctx1)
      assert.strictEqual(result1.sanitized, 'value1')

      const param2 = new ParameterReference('field.with.dot').noValidation()
      const errorStore2 = new ErrorStore()
      const ctx2 = new ResolveContext('field.with.dot', {global: new GlobalContext()})
      const result2 = await resolveFromStore(store, param2, errorStore2, ctx2)
      assert.strictEqual(result2.sanitized, 'value2')
    })

    test('should handle nested resolution from store', async () => {
      const store = new SearchStore({
        data: {
          items: [
            {id: 1},
            {id: 2}
          ]
        }
      })

      const param = new ParameterReference('data').object({
        items: new ParameterReference('items').many().object({
          id: new ParameterReference('id').noValidation()
        })
      })

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('data', {global: new GlobalContext()})

      const result = await resolveFromStore(store, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.items.length, 2)
      assert.strictEqual(result.sanitized.items[0].id, 1)
      assert.strictEqual(result.sanitized.items[1].id, 2)
    })
  })
})
