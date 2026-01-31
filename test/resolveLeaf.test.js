import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveLeaf} from '../dist/resolver/resolveLeaf.js'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {ResolveContext} from '../dist/context/ResolveContext.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'

describe('resolveLeaf', () => {
  describe('mode routing', () => {
    test('should call resolveMany for many mode', async () => {
      const param = new ParameterReference('field').many().noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf([1, 2, 3], param, errorStore, ctx)

      assert.ok(Array.isArray(result.sanitized))
      assert.strictEqual(result.sanitized.length, 3)
    })

    test('should call resolveObject for object parameters', async () => {
      const param = new ParameterReference('field').object({
        name: new ParameterReference('name').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf({name: 'test'}, param, errorStore, ctx)

      assert.strictEqual(typeof result.sanitized, 'object')
      assert.strictEqual(result.sanitized.name, 'test')
    })

    test('should call resolveValue for simple values', async () => {
      const param = new ParameterReference('field').noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf('simple', param, errorStore, ctx)

      assert.strictEqual(result.raw, 'simple')
      assert.strictEqual(result.sanitized, 'simple')
    })
  })

  describe('forceOne behavior', () => {
    test('should use resolveValue when forceOne is true', async () => {
      const param = new ParameterReference('field').many().noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext(), forceOne: true})

      // Even though parameter is many, forceOne should treat it as one
      const result = await resolveLeaf('single', param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'single')
    })

    test('should respect ctx.forceOne over parameter mode', async () => {
      const param = new ParameterReference('field').many().noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext(), forceOne: true})

      const result = await resolveLeaf({key: 'value'}, param, errorStore, ctx)

      // forceOne forces single value resolution
      assert.ok(!Array.isArray(result.sanitized))
    })
  })

  describe('object resolution', () => {
    test('should resolve object with properties', async () => {
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').noValidation(),
        age: new ParameterReference('age').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('user', {global: new GlobalContext()})

      const result = await resolveLeaf({
        name: 'John',
        age: 30
      }, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'John')
      assert.strictEqual(result.sanitized.age, 30)
    })

    test('should handle nested objects', async () => {
      const param = new ParameterReference('user').object({
        profile: new ParameterReference('profile').object({
          bio: new ParameterReference('bio').noValidation()
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('user', {global: new GlobalContext()})

      const result = await resolveLeaf({
        profile: {bio: 'Developer'}
      }, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.profile.bio, 'Developer')
    })
  })

  describe('array resolution', () => {
    test('should resolve array with many mode', async () => {
      const param = new ParameterReference('items').many().noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('items', {global: new GlobalContext()})

      const result = await resolveLeaf(['a', 'b', 'c'], param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, ['a', 'b', 'c'])
    })

    test('should resolve array of objects', async () => {
      const param = new ParameterReference('users')
        .many()
        .object({
          name: new ParameterReference('name').noValidation()
        })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('users', {global: new GlobalContext()})

      const result = await resolveLeaf([
        {name: 'Alice'},
        {name: 'Bob'}
      ], param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 2)
      assert.strictEqual(result.sanitized[0].name, 'Alice')
      assert.strictEqual(result.sanitized[1].name, 'Bob')
    })

    test('should apply validation to array items', async () => {
      const param = new ParameterReference('numbers')
        .many()
        .validation(v => v * 2)
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('numbers', {global: new GlobalContext()})

      const result = await resolveLeaf([1, 2, 3], param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, [2, 4, 6])
    })
  })

  describe('value resolution with validation', () => {
    test('should apply validation to simple values', async () => {
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf('hello', param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 'HELLO')
    })

    test('should transform values', async () => {
      const param = new ParameterReference('age').validation(v => Number(v))
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('age', {global: new GlobalContext()})

      const result = await resolveLeaf('42', param, errorStore, ctx)

      assert.strictEqual(result.sanitized, 42)
    })
  })

  describe('combined modes', () => {
    test('should handle array of objects with validation', async () => {
      const param = new ParameterReference('users')
        .many()
        .object({
          email: new ParameterReference('email').validation(v => v.toLowerCase())
        })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('users', {global: new GlobalContext()})

      const result = await resolveLeaf([
        {email: 'ALICE@TEST.COM'},
        {email: 'BOB@TEST.COM'}
      ], param, errorStore, ctx)

      assert.strictEqual(result.sanitized[0].email, 'alice@test.com')
      assert.strictEqual(result.sanitized[1].email, 'bob@test.com')
    })

    test('should handle object with array properties', async () => {
      const param = new ParameterReference('data').object({
        tags: new ParameterReference('tags').many().noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('data', {global: new GlobalContext()})

      const result = await resolveLeaf({
        tags: ['tag1', 'tag2', 'tag3']
      }, param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized.tags, ['tag1', 'tag2', 'tag3'])
    })
  })

  describe('freeze requirement', () => {
    test('should call freeze on parameter', async () => {
      let freezeCalled = false
      const param = new ParameterReference('field').noValidation()
      const originalFreeze = param.freeze.bind(param)
      param.freeze = function() {
        freezeCalled = true
        return originalFreeze()
      }

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveLeaf('test', param, errorStore, ctx)

      assert.strictEqual(freezeCalled, true)
    })
  })

  describe('error propagation', () => {
    test('should propagate errors from resolveValue', async () => {
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Value error')
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveLeaf('test', param, errorStore, ctx),
        /Value error/
      )
    })

    test('should propagate errors from resolveMany', async () => {
      const param = new ParameterReference('field').many((values) => {
        throw new Error('Shape error')
      }).noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveLeaf([1, 2], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.match(errorStore.errors[0].reason, /Shape error/)
    })

    test('should propagate errors from resolveObject', async () => {
      const param = new ParameterReference('obj').object({
        field: new ParameterReference('field', true).noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await resolveLeaf({}, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
    })
  })

  describe('edge cases', () => {
    test('should handle null values', async () => {
      const param = new ParameterReference('field').noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf(null, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, null)
    })

    test('should handle undefined values', async () => {
      const param = new ParameterReference('field').noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf(undefined, param, errorStore, ctx)

      assert.strictEqual(result.sanitized, undefined)
    })

    test('should handle empty arrays', async () => {
      const param = new ParameterReference('field').many().noValidation()
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf([], param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, [])
    })

    test('should handle empty objects', async () => {
      const param = new ParameterReference('field').object({})
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveLeaf({}, param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, {})
    })
  })
})
