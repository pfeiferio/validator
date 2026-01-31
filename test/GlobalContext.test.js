import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {GlobalContext} from '../dist/context/GlobalContext.js'

describe('GlobalContext', () => {
  describe('constructor', () => {
    test('should create global context with empty postValidations', () => {
      const ctx = new GlobalContext()
      assert.strictEqual(ctx.postValidations.length, 0)
    })

    test('should create independent instances', () => {
      const ctx1 = new GlobalContext()
      const ctx2 = new GlobalContext()

      assert.notStrictEqual(ctx1, ctx2)
      assert.notStrictEqual(ctx1.postValidations, ctx2.postValidations)
    })
  })

  describe('postValidations getter', () => {
    test('should return array of postValidations', () => {
      const ctx = new GlobalContext()
      const validations = ctx.postValidations

      assert.ok(Array.isArray(validations))
      assert.strictEqual(validations.length, 0)
    })

    test('should return same array instance', () => {
      const ctx = new GlobalContext()
      const validations1 = ctx.postValidations
      const validations2 = ctx.postValidations

      assert.strictEqual(validations1, validations2)
    })

    test('should allow modifications to returned array', () => {
      const ctx = new GlobalContext()
      const validations = ctx.postValidations

      const mockValidation = {
        parameter: {name: 'test'},
        value: 'test-value',
        path: 'test.path',
        ctx: {}
      }

      validations.push(mockValidation)

      assert.strictEqual(ctx.postValidations.length, 1)
      assert.strictEqual(ctx.postValidations[0], mockValidation)
    })

    test('should reflect pushed items', () => {
      const ctx = new GlobalContext()

      assert.strictEqual(ctx.postValidations.length, 0)

      ctx.postValidations.push({
        parameter: {name: 'field1'},
        value: 'value1',
        path: 'path1',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)

      ctx.postValidations.push({
        parameter: {name: 'field2'},
        value: 'value2',
        path: 'path2',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 2)
    })
  })

  describe('postValidations accumulation', () => {
    test('should accumulate multiple postValidations', () => {
      const ctx = new GlobalContext()

      const validations = [
        {
          parameter: {name: 'field1'},
          value: 'value1',
          path: 'root.field1',
          ctx: {}
        },
        {
          parameter: {name: 'field2'},
          value: 'value2',
          path: 'root.field2',
          ctx: {}
        },
        {
          parameter: {name: 'field3'},
          value: 'value3',
          path: 'root.field3',
          ctx: {}
        }
      ]

      validations.forEach(v => ctx.postValidations.push(v))

      assert.strictEqual(ctx.postValidations.length, 3)
      assert.strictEqual(ctx.postValidations[0].value, 'value1')
      assert.strictEqual(ctx.postValidations[1].value, 'value2')
      assert.strictEqual(ctx.postValidations[2].value, 'value3')
    })

    test('should maintain order of postValidations', () => {
      const ctx = new GlobalContext()

      for (let i = 0; i < 10; i++) {
        ctx.postValidations.push({
          parameter: {name: `field${i}`},
          value: i,
          path: `path${i}`,
          ctx: {}
        })
      }

      assert.strictEqual(ctx.postValidations.length, 10)

      for (let i = 0; i < 10; i++) {
        assert.strictEqual(ctx.postValidations[i].value, i)
      }
    })

    test('should handle nested objects as values', () => {
      const ctx = new GlobalContext()

      const nestedValue = {deep: {nested: {value: 'test'}}}

      ctx.postValidations.push({
        parameter: {name: 'nested'},
        value: nestedValue,
        path: 'root.nested',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)
      assert.strictEqual(ctx.postValidations[0].value, nestedValue)
    })

    test('should handle arrays as values', () => {
      const ctx = new GlobalContext()

      const arrayValue = [1, 2, 3, 4, 5]

      ctx.postValidations.push({
        parameter: {name: 'array'},
        value: arrayValue,
        path: 'root.array',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)
      assert.strictEqual(ctx.postValidations[0].value, arrayValue)
    })
  })

  describe('isolation', () => {
    test('should not share postValidations between instances', () => {
      const ctx1 = new GlobalContext()
      const ctx2 = new GlobalContext()

      ctx1.postValidations.push({
        parameter: {name: 'field1'},
        value: 'value1',
        path: 'path1',
        ctx: {}
      })

      assert.strictEqual(ctx1.postValidations.length, 1)
      assert.strictEqual(ctx2.postValidations.length, 0)
    })

    test('should maintain separate state', () => {
      const ctx1 = new GlobalContext()
      const ctx2 = new GlobalContext()

      ctx1.postValidations.push({parameter: {}, value: '1', path: 'p1', ctx: {}})
      ctx2.postValidations.push({parameter: {}, value: '2', path: 'p2', ctx: {}})
      ctx1.postValidations.push({parameter: {}, value: '3', path: 'p3', ctx: {}})

      assert.strictEqual(ctx1.postValidations.length, 2)
      assert.strictEqual(ctx2.postValidations.length, 1)
      assert.strictEqual(ctx1.postValidations[0].value, '1')
      assert.strictEqual(ctx2.postValidations[0].value, '2')
    })
  })

  describe('edge cases', () => {
    test('should handle many postValidations', () => {
      const ctx = new GlobalContext()

      for (let i = 0; i < 1000; i++) {
        ctx.postValidations.push({
          parameter: {name: `field${i}`},
          value: i,
          path: `path${i}`,
          ctx: {}
        })
      }

      assert.strictEqual(ctx.postValidations.length, 1000)
    })

    test('should handle clearing postValidations', () => {
      const ctx = new GlobalContext()

      ctx.postValidations.push({
        parameter: {name: 'field'},
        value: 'value',
        path: 'path',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)

      ctx.postValidations.length = 0

      assert.strictEqual(ctx.postValidations.length, 0)
    })

    test('should handle undefined values', () => {
      const ctx = new GlobalContext()

      ctx.postValidations.push({
        parameter: {name: 'field'},
        value: undefined,
        path: 'path',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)
      assert.strictEqual(ctx.postValidations[0].value, undefined)
    })

    test('should handle null values', () => {
      const ctx = new GlobalContext()

      ctx.postValidations.push({
        parameter: {name: 'field'},
        value: null,
        path: 'path',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)
      assert.strictEqual(ctx.postValidations[0].value, null)
    })
  })
})
