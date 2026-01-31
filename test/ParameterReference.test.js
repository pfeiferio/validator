import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'

describe('ParameterReference', () => {
  describe('constructor', () => {

    test('should throw an error on invalid argument combination', () => {
      assert.throws(
        () => new ParameterReference('field', true, 'default'),
        /cannot be required and have a default value/)
    })

    test('should create parameter with name', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.name, 'field')
    })

    test('should default to required', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.isRequired, true)
    })

    test('should accept required flag', () => {
      const param1 = new ParameterReference('field', true)
      const param2 = new ParameterReference('field', false)

      assert.strictEqual(param1.isRequired, true)
      assert.strictEqual(param2.isRequired, false)
    })

    test('should accept default value', () => {
      const param = new ParameterReference('field', false, 'default')
      assert.strictEqual(param.defaultValue, 'default')
    })

    test('should default to undefined default value', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.defaultValue, undefined)
    })

    test('should accept null as default value', () => {
      const param = new ParameterReference('field', false, null)
      assert.strictEqual(param.defaultValue, null)
    })
  })

  describe('name getter', () => {
    test('should return parameter name', () => {
      const param = new ParameterReference('myField')
      assert.strictEqual(param.name, 'myField')
    })

    test('should handle special characters', () => {
      const param = new ParameterReference('field-with-dashes')
      assert.strictEqual(param.name, 'field-with-dashes')
    })
  })

  describe('isRequired getter', () => {
    test('should return true for required parameters', () => {
      const param = new ParameterReference('field', true)
      assert.strictEqual(param.isRequired, true)
    })

    test('should return false for optional parameters', () => {
      const param = new ParameterReference('field', false)
      assert.strictEqual(param.isRequired, false)
    })
  })

  describe('defaultValue getter', () => {
    test('should return default value', () => {
      const param = new ParameterReference('field', false, 'default')
      assert.strictEqual(param.defaultValue, 'default')
    })

    test('should transform defaultValue to an array', async () => {
      const param = new ParameterReference('field', false, 'default').noValidation()
      assert.strictEqual(param.defaultValue, 'default')
      await param.many().freeze()
      assert.deepEqual(param.defaultValue, ['default'])
    })

    test('should return undefined when not set', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.defaultValue, undefined)
    })

    test('should handle object default values', () => {
      const defaultObj = {key: 'value'}
      const param = new ParameterReference('field', false, defaultObj)
      assert.strictEqual(param.defaultValue, defaultObj)
    })

    test('should handle array default values', () => {
      const defaultArr = [1, 2, 3]
      const param = new ParameterReference('field', false, defaultArr)
      assert.strictEqual(param.defaultValue, defaultArr)
    })
  })

  describe('value property', () => {
    test('should default to null', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.value, undefined)
    })

    test('should allow setting value', () => {
      const param = new ParameterReference('field')
      param.value = 'test'
      assert.strictEqual(param.value, 'test')
    })

    test('should allow updating value', () => {
      const param = new ParameterReference('field')
      param.value = 'first'
      assert.strictEqual(param.value, 'first')

      param.value = 'second'
      assert.strictEqual(param.value, 'second')
    })

    test('should allow setting to null', () => {
      const param = new ParameterReference('field')
      param.value = 'test'
      param.value = null
      assert.strictEqual(param.value, null)
    })

    test('should allow setting to undefined', () => {
      const param = new ParameterReference('field')
      param.value = undefined
      assert.strictEqual(param.value, undefined)
    })
  })

  describe('meta property', () => {
    test('should default to null', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.meta, null)
    })

    test('should allow setting object meta', () => {
      const param = new ParameterReference('field')
      const meta = {key: 'value'}
      param.meta = meta
      assert.strictEqual(param.meta, meta)
    })

    test('should allow setting array meta', () => {
      const param = new ParameterReference('field')
      const meta = [1, 2, 3]
      param.meta = meta
      assert.strictEqual(param.meta, meta)
    })

    test('should allow updating meta', () => {
      const param = new ParameterReference('field')
      param.meta = {first: 1}
      param.meta = {second: 2}
      assert.deepStrictEqual(param.meta, {second: 2})
    })
  })

  describe('mode property', () => {
    test('should default to "one"', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.mode, 'one')
    })

    test('should be "many" after calling many()', () => {
      const param = new ParameterReference('field').many()
      assert.strictEqual(param.mode, 'many')
    })

    test('should return to "one" after calling one()', () => {
      const param = new ParameterReference('field').many().one()
      assert.strictEqual(param.mode, 'one')
    })
  })

  describe('isArray getter', () => {
    test('should return false for mode "one"', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.isArray, false)
    })

    test('should return true for mode "many"', () => {
      const param = new ParameterReference('field').many()
      assert.strictEqual(param.isArray, true)
    })
  })

  describe('isObject getter', () => {
    test('should return false by default', () => {
      const param = new ParameterReference('field')
      assert.strictEqual(param.isObject, false)
    })

    test('should return true after calling object()', () => {
      const param = new ParameterReference('field').object({})
      assert.strictEqual(param.isObject, true)
    })
  })

  describe('one()', () => {
    test('should return this for chaining', () => {
      const param = new ParameterReference('field')
      const result = param.one()
      assert.strictEqual(result, param)
    })

    test('should set mode to "one"', () => {
      const param = new ParameterReference('field').many().one()
      assert.strictEqual(param.mode, 'one')
    })
  })

  describe('many()', () => {
    test('should return this for chaining', () => {
      const param = new ParameterReference('field')
      const result = param.many()
      assert.strictEqual(result, param)
    })

    test('should set mode to "many"', () => {
      const param = new ParameterReference('field').many()
      assert.strictEqual(param.mode, 'many')
    })

    test('should accept shape validation function', () => {
      const validateShape = (values) => {
        if (values.length < 2) throw new Error('Too few')
      }

      const param = new ParameterReference('field').many(validateShape)
      assert.strictEqual(param.mode, 'many')
    })

    test('should not throw when no validation function provided', () => {
      assert.doesNotThrow(() => {
        new ParameterReference('field').many()
      })
    })
  })

  describe('validation()', () => {
    test('should return this for chaining', () => {
      const param = new ParameterReference('field')
      const result = param.validation(v => v)
      assert.strictEqual(result, param)
    })

    test('should set validation function', () => {
      const validate = (v) => v
      const param = new ParameterReference('field').validation(validate)
      // Validation is set internally
      assert.ok(param)
    })
  })

  describe('object()', () => {
    test('should return this for chaining', () => {
      const param = new ParameterReference('field')
      const result = param.object({})
      assert.strictEqual(result, param)
    })

    test('should accept object properties', () => {
      const properties = {
        nested: new ParameterReference('nested')
      }
      const param = new ParameterReference('field').object(properties)
      assert.strictEqual(param.isObject, true)
    })

    test('should accept function returning properties', () => {
      const propertiesFn = () => ({
        nested: new ParameterReference('nested')
      })
      const param = new ParameterReference('field').object(propertiesFn)
      assert.strictEqual(param.isObject, true)
    })
  })

  describe('validate()', () => {
    test('should return value when no validation set', () => {
      const param = new ParameterReference('field')
      const result = param.validate('test')
      assert.strictEqual(result, 'test')
    })

    test('should apply validation function', () => {
      const param = new ParameterReference('field').validation(v => v.toUpperCase())
      const result = param.validate('hello')
      assert.strictEqual(result, 'HELLO')
    })

    test('should pass value through validation', () => {
      const param = new ParameterReference('field').validation(v => {
        if (typeof v !== 'string') throw new Error('Must be string')
        return v
      })

      assert.strictEqual(param.validate('test'), 'test')
      assert.throws(() => param.validate(123), /Must be string/)
    })

    test('should allow transformation', () => {
      const param = new ParameterReference('field').validation(v => Number(v))
      assert.strictEqual(param.validate('42'), 42)
    })
  })

  describe('validateShape()', () => {
    test('should return this for chaining', () => {
      const param = new ParameterReference('field').many()
      const result = param.validateShape([1, 2, 3])
      assert.strictEqual(result, param)
    })

    test('should call shape validation when set', () => {
      let called = false
      const param = new ParameterReference('field').many((values) => {
        called = true
        assert.strictEqual(values.length, 3)
      })

      param.validateShape([1, 2, 3])
      assert.strictEqual(called, true)
    })

    test('should not throw when no validation set', () => {
      const param = new ParameterReference('field').many()
      assert.doesNotThrow(() => param.validateShape([1, 2, 3]))
    })

    test('should throw when shape validation fails', () => {
      const param = new ParameterReference('field').many((values) => {
        if (values.length < 5) throw new Error('Need at least 5')
      })

      assert.throws(() => param.validateShape([1, 2]), /Need at least 5/)
    })
  })

  describe('freeze()', () => {
    test('should not be async', async () => {
      const param = new ParameterReference('field')
      param.asyncValidation(() => null)
      const result = param.freeze()
      assert.ok(!(result instanceof Promise))
      await result
    })

    test('should freeze parameter', async () => {
      const param = new ParameterReference('field').object({
        nested: new ParameterReference('nested')
      })

      await param.freeze()
      // After freeze, properties should be accessible
      assert.ok(param.properties)
    })

    test('should resolve properties from function', async () => {
      const param = new ParameterReference('field').object(() => ({
        nested: new ParameterReference('nested')
      }))

      await param.freeze()
      assert.ok(param.properties.nested)
      assert.strictEqual(param.properties.nested.name, 'nested')
    })

    test('should only freeze once', async () => {
      const param = new ParameterReference('field').noValidation()
      await param.freeze()
      await param.freeze()
      await param.freeze()
      // Multiple calls should not cause issues
      assert.ok(true)
    })

    test('should throw when accessing properties before freeze', () => {
      const param = new ParameterReference('field').object({})

      assert.throws(() => {
        const _props = param.properties
      }, /ParameterReference not frozen/)
    })

    test('should allow accessing properties after freeze', async () => {
      const param = new ParameterReference('field').object({
        nested: new ParameterReference('nested')
      })

      await param.freeze()
      assert.doesNotThrow(() => {
        const _props = param.properties
      })
    })
  })
})
