import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveMany} from '../dist/resolver/resolveMany.js'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {ResolveContext} from '../dist/context/ResolveContext.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'
import {INVALID} from '../dist/resolver/utils.js'
import {checkString} from "@pfeiferio/check-primitives";

describe('resolveMany', () => {
  describe('basic array resolution', () => {
    test('should resolve empty array', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([], param, errorStore, ctx)

      assert.deepStrictEqual(result.raw, [])
      assert.deepStrictEqual(result.sanitized, [])
      assert.strictEqual(errorStore.errors.length, 0)
    })

    test('should resolve array of strings', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany(['a', 'b', 'c'], param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 3)
      assert.deepStrictEqual(result.sanitized, ['a', 'b', 'c'])
    })

    test('should resolve array of numbers', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([1, 2, 3], param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, [1, 2, 3])
    })

    test('should throw if value is not an array', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveMany('not array', param, errorStore, ctx),
        /array\.expected/
      )
    })

    test('should throw for null', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveMany(null, param, errorStore, ctx),
        /array\.expected/
      )
    })

    test('should throw for object', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveMany({}, param, errorStore, ctx),
        /array\.expected/
      )
    })
  })

  describe('shape validation', () => {
    test('should call shape validation', async () => {
      let called = false
      const param = new ParameterReference('field').many((values) => {
        called = true
        assert.strictEqual(values.length, 3)
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveMany([1, 2, 3], param, errorStore, ctx)

      assert.strictEqual(called, true)
    })

    test('should store shape validation errors', async () => {
      const param = new ParameterReference('field').many((values) => {
        throw new Error('Shape validation failed')
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([1, 2, 3], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(errorStore.errors[0].path, 'field')
      assert.strictEqual(errorStore.errors[0].reason, 'Shape validation failed')

      assert.strictEqual(result.sanitized.length, 3)
    })

    test('should not throw for shape validation errors', async () => {
      const param = new ParameterReference('field').many((values) => {
        throw new Error('Shape error')
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await assert.doesNotReject(
        async () => await resolveMany([1, 2, 3], param, errorStore, ctx)
      )
    })

    test('should validate min count', async () => {
      const param = new ParameterReference('field').many((values) => {
        if (values.length < 2) throw new Error('Need at least 2')
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveMany([1], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.match(errorStore.errors[0].reason, /Need at least 2/)
    })

    test('should validate max count', async () => {
      const param = new ParameterReference('field').many((values) => {
        if (values.length > 2) throw new Error('Max 2 allowed')
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveMany([1, 2, 3], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.match(errorStore.errors[0].reason, /Max 2 allowed/)
    })
  })

  describe('item validation', () => {
    test('should validate each item', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany(['a', 'b', 'c'], param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, ['A', 'B', 'C'])
    })

    test('should keep raw values', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => v.toUpperCase())
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany(['a', 'b', 'c'], param, errorStore, ctx)

      assert.strictEqual(result.raw.length, 3)
      assert.strictEqual(result.raw[0].raw, 'a')
      assert.strictEqual(result.raw[1].raw, 'b')
      assert.strictEqual(result.raw[2].raw, 'c')
    })

    test('should handle item validation errors', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => {
          if (v < 0) throw new Error('Must be positive')
          return v
        })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([1, -2, 3], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(errorStore.errors[0].path, 'field.1')
      assert.strictEqual(errorStore.errors[0].reason, 'Must be positive')

      assert.strictEqual(result.sanitized.length, 3)
      assert.strictEqual(result.sanitized[0], 1)
      assert.strictEqual(result.sanitized[1], INVALID)
      assert.strictEqual(result.sanitized[2], 3)
    })

    test('should mark failed items as INVALID in raw', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => {
          if (v === 'bad') throw new Error('Bad value')
          return v
        })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany(['good', 'bad', 'good'], param, errorStore, ctx)

      assert.strictEqual(result.raw[0].raw, 'good')
      assert.strictEqual(result.raw[1].raw, INVALID)
      assert.strictEqual(result.raw[2].raw, 'good')
    })

    test('should use correct path for each item', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => {
          throw new Error(`Error for ${v}`)
        })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('root', {global: new GlobalContext()})

      await resolveMany(['a', 'b', 'c'], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 3)
      assert.strictEqual(errorStore.errors[0].path, 'root.0')
      assert.strictEqual(errorStore.errors[1].path, 'root.1')
      assert.strictEqual(errorStore.errors[2].path, 'root.2')
    })
  })

  describe('mixed successes and failures', () => {
    test('should process all items even with some failures', async () => {
      const param = new ParameterReference('field')
        .many()
        .validation(v => {
          if (v % 2 === 0) throw new Error('Even numbers not allowed')
          return v * 2
        })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([1, 2, 3, 4, 5], param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 2)
      assert.strictEqual(result.sanitized.length, 5)
      assert.strictEqual(result.sanitized[0], 2) // 1 * 2
      assert.strictEqual(result.sanitized[1], INVALID) // 1 * 2
      assert.strictEqual(result.sanitized[2], 6) // 3 * 2
      assert.strictEqual(result.sanitized[3], INVALID) // 5 * 2
      assert.strictEqual(result.sanitized[4], 10) // 5 * 2
    })

    test('should count all items in results', async () => {

      const param = new ParameterReference('field')
        .many()
        .validation(v => {
          if (!v) throw new Error('Falsy')
          return v
        })
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([1, 0, 2, false, 3], param, errorStore, ctx)

      assert.strictEqual(result.raw.length, 5)
      assert.strictEqual(result.sanitized.length, 5)
      assert.strictEqual(result.raw.filter(({raw}) => raw === INVALID).length, 2)
    })
  })

  describe('forceOne handling', () => {
    test('should set forceOne on item contexts', async () => {
      const global = new GlobalContext()
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global})

      await resolveMany([1, 2, 3], param, errorStore, ctx)

      assert.strictEqual(global.postValidations.length, 3)
    })
  })

  describe('edge cases', () => {
    test('should handle array with single element', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([42], param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 1)
      assert.strictEqual(result.sanitized[0], 42)
    })

    test('should handle array with null elements', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([null, null], param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 2)
      assert.strictEqual(result.sanitized[0], null)
      assert.strictEqual(result.sanitized[1], null)
    })

    test('should handle array with undefined elements', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const result = await resolveMany([undefined, undefined], param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 2)
      assert.strictEqual(result.sanitized[0], undefined)
      assert.strictEqual(result.sanitized[1], undefined)
    })

    test('should handle sparse arrays', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const sparse = [1, , 3] // eslint-disable-line no-sparse-arrays
      const result = await resolveMany(sparse, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 3)
      assert.strictEqual(result.sanitized[0], 1)
      assert.strictEqual(result.sanitized[1], undefined)
      assert.strictEqual(result.sanitized[2], 3)
    })

    test('should handle large arrays', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const largeArray = Array.from({length: 1000}, (_, i) => i)
      const result = await resolveMany(largeArray, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 1000)
      assert.strictEqual(result.sanitized[0], 0)
      assert.strictEqual(result.sanitized[999], 999)
    })

    test('should handle mixed types in array', async () => {
      const param = new ParameterReference('field').many().noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      const mixed = [1, 'two', {three: 3}, [4], null, true]
      const result = await resolveMany(mixed, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.length, 6)
      assert.deepStrictEqual(result.sanitized, mixed)
    })

    test('should not process same error twice', async () => {
      const sharedError = new Error('Shared error')
      const param = new ParameterReference('field').many((values) => {
        throw sharedError
      }).noValidation()
      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('field', {global: new GlobalContext()})

      await resolveMany([1, 2], param, errorStore, ctx)

      // Error should only be added once even though shape validation is called once
      assert.strictEqual(errorStore.errors.length, 1)
    })

    test('resolveMany - resolves array of simple values', () => {
      const param = new ParameterReference('items')
      param.validation((value) => checkString(value))

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['apple', 'banana', 'cherry']
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(Array.isArray(result.sanitized), true)
      assert.deepEqual(result.sanitized, ['apple', 'banana', 'cherry'])
      assert.equal(errorStore.hasErrors(), false)
    })

    test('resolveMany - throws on non-array input', () => {
      const param = new ParameterReference('items').noValidation()
      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      assert.throws(() => {
        resolveMany('not-an-array', param, errorStore, ctx)
      })
    })

    test('resolveMany - handles empty array', () => {
      const param = new ParameterReference('items')
      param.validation((value) => checkString(value))

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = []
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(Array.isArray(result.sanitized), true)
      assert.equal(result.sanitized.length, 0)
    })

    test('resolveMany - collects validation errors for invalid items', () => {
      const param = new ParameterReference('numbers')
      param.validation((value) => {
        if (typeof value !== 'number') {
          throw new Error('Expected number')
        }
        return value
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('numbers', {global: globalContext})

      const values = [1, 'invalid', 3, 'also-invalid', 5]
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(errorStore.hasErrors(), true)
      assert.equal(errorStore.errors.length, 2)
    })

    test('resolveMany - continues processing after errors', () => {
      const param = new ParameterReference('items')
      param.validation((value) => {
        if (typeof value !== 'string') {
          throw new Error('Expected string')
        }
        return value.toUpperCase()
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['hello', 123, 'world']
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(result.sanitized[0], 'HELLO')
      assert.equal(result.sanitized[2], 'WORLD')
      assert.equal(errorStore.hasErrors(), true)
    })

    test('resolveMany - validates shape with custom validator', () => {
      const param = new ParameterReference('items').many((values) => {
        if (values.length < 2) throw new Error('At least 2 items required')
      }).noValidation()

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['single']
      resolveMany(values, param, errorStore, ctx)

      assert.equal(errorStore.hasErrors(), true)
    })

    test('resolveMany - shape validation passes with valid array', () => {
      const param = new ParameterReference('items')
      param.many((values) => {
        if (values.length < 2) {
          throw new Error('At least 2 items required')
        }
      })
      param.validation((value) => checkString(value))

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['first', 'second']
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(errorStore.hasErrors(), false)
      assert.equal(result.sanitized.length, 2)
    })

    test('resolveMany - handles async validation', async () => {
      const param = new ParameterReference('items')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        if (typeof value !== 'string') {
          throw new Error('Expected string')
        }
        return value.toUpperCase()
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['hello', 'world']
      const result = await resolveMany(values, param, errorStore, ctx)

      assert.equal(result.sanitized[0], 'HELLO')
      assert.equal(result.sanitized[1], 'WORLD')
    })

    test('resolveMany - handles mixed async validation with errors', async () => {
      const param = new ParameterReference('items')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        if (typeof value !== 'number') {
          throw new Error('Expected number')
        }
        return value * 2
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = [1, 'invalid', 3]
      const result = await resolveMany(values, param, errorStore, ctx)

      assert.equal(result.sanitized[0], 2)
      assert.equal(result.sanitized[2], 6)
      assert.equal(errorStore.hasErrors(), true)
    })

    test('resolveMany - raw results contain original values', () => {
      const param = new ParameterReference('items')
      param.validation((value) => {
        if (typeof value !== 'string') {
          throw new Error('Expected string')
        }
        return value.toUpperCase()
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = ['hello', 'world']
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(Array.isArray(result.raw), true)
      assert.equal(result.raw.length, 2)
    })

    test('resolveMany - handles nested objects in array', () => {
      const childParam = new ParameterReference('name')
      childParam.validation((value) => checkString(value))

      const param = new ParameterReference('items')
      param.object(() => ({
        name: childParam
      }))

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('items', {global: globalContext})

      const values = [
        {name: 'Alice'},
        {name: 'Bob'}
      ]
      const result = resolveMany(values, param, errorStore, ctx)

      assert.equal(errorStore.hasErrors(), false)
      assert.equal(result.sanitized.length, 2)
    })
  })
})
