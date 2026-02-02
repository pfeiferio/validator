import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveObject} from '../dist/resolver/resolveObject.js'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {ResolveContext} from '../dist/context/ResolveContext.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'
import {INVALID} from '../dist/resolver/utils.js'
import {checkNumber, checkString} from "@pfeiferio/check-primitives";

describe('resolveObject', () => {
  describe('basic object resolution', () => {
    test('should resolve simple object', async () => {
      const param = new ParameterReference('obj').object({
        name: new ParameterReference('name').noValidation(),
        age: new ParameterReference('age').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const value = {name: 'John', age: 30}
      const result = await resolveObject(value, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'John')
      assert.strictEqual(result.sanitized.age, 30)
      assert.strictEqual(errorStore.errors.length, 0)
    })

    test('should resolve empty object with empty properties', async () => {
      const param = new ParameterReference('obj').object({})
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({}, param, errorStore, ctx)

      assert.deepStrictEqual(result.sanitized, {})
      assert.deepStrictEqual(result.raw, {})
    })

    test('should throw if value is not an object', async () => {
      const param = new ParameterReference('obj').object({})
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveObject('not object', param, errorStore, ctx),
        /object\.expected/
      )
    })

    test('should throw for null', async () => {
      const param = new ParameterReference('obj').object({})
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveObject(null, param, errorStore, ctx),
        /object\.expected/
      )
    })

    test('should throw for array', async () => {
      const param = new ParameterReference('obj').object({})
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveObject([], param, errorStore, ctx),
        /object\.expected/
      )
    })
  })

  describe('nested properties', () => {
    test('should resolve nested objects', async () => {
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').noValidation(),
        address: new ParameterReference('address').object({
          street: new ParameterReference('street').noValidation(),
          city: new ParameterReference('city').noValidation()
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('user', {global: new GlobalContext()})

      const value = {
        name: 'John',
        address: {
          street: 'Main St',
          city: 'NYC'
        }
      }

      const result = await resolveObject(value, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'John')
      assert.strictEqual(result.sanitized.address.street, 'Main St')
      assert.strictEqual(result.sanitized.address.city, 'NYC')
    })

    test('should handle deep nesting', async () => {
      const param = new ParameterReference('root').object({
        level1: new ParameterReference('level1').object({
          level2: new ParameterReference('level2').object({
            level3: new ParameterReference('level3').noValidation()
          })
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('root', {global: new GlobalContext()})

      const value = {
        level1: {
          level2: {
            level3: 'deep'
          }
        }
      }

      const result = await resolveObject(value, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.level1.level2.level3, 'deep')
    })
  })

  describe('property validation', () => {
    test('should apply validation to properties', async () => {
      const param = new ParameterReference('obj').object({
        name: new ParameterReference('name').validation(v => v.toUpperCase())
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({name: 'john'}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'JOHN')
    })

    test('should handle property validation errors', async () => {
      const param = new ParameterReference('obj').object({
        age: new ParameterReference('age').validation(v => {
          if (v < 0) throw new Error('Age must be positive')
          return v
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({age: -5}, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(errorStore.errors[0].path, 'obj.age')
      assert.strictEqual(errorStore.errors[0].reason, 'Age must be positive')
      assert.strictEqual(result.raw.age, INVALID)
    })

    test('should validate multiple properties', async () => {
      const param = new ParameterReference('obj').object({
        name: new ParameterReference('name').validation(v => v.toUpperCase()),
        age: new ParameterReference('age').validation(v => v * 2)
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({name: 'john', age: 15}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.name, 'JOHN')
      assert.strictEqual(result.sanitized.age, 30)
    })
  })

  describe('required vs optional properties', () => {
    test('should handle missing required property', async () => {
      const param = new ParameterReference('obj').object({
        required: new ParameterReference('required', true).noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({}, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.match(errorStore.errors[0].reason, /required\.missing/)
    })

    test('should use default for missing optional property', async () => {
      const param = new ParameterReference('obj').object({
        optional: new ParameterReference('optional', false, 'default').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.optional, 'default')
    })

    test('should override default when property is provided', async () => {
      const param = new ParameterReference('obj').object({
        field: new ParameterReference('field', false, 'default').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({field: 'provided'}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.field, 'provided')
    })
  })

  describe('raw results', () => {
    test('should keep raw values', async () => {
      const param = new ParameterReference('obj').object({
        name: new ParameterReference('name').validation(v => v.toUpperCase())
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({name: 'john'}, param, errorStore, ctx)
      console.log({result})
      process.exit()
      assert.strictEqual(result.raw.name, 'john')
      assert.strictEqual(result.sanitized.name, 'JOHN')
    })

    test('should mark failed properties as INVALID', async () => {
      const param = new ParameterReference('obj').object({
        good: new ParameterReference('good').noValidation(),
        bad: new ParameterReference('bad').validation(v => {
          throw new Error('Validation failed')
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({good: 'ok', bad: 'fail'}, param, errorStore, ctx)

      assert.strictEqual(result.raw.good, 'ok')
      assert.strictEqual(result.raw.bad, INVALID)
    })
  })

  describe('error handling', () => {
    test('should use correct path for nested errors', async () => {
      const param = new ParameterReference('user').object({
        address: new ParameterReference('address').object({
          zip: new ParameterReference('zip').validation(v => {
            throw new Error('Invalid zip')
          })
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('user', {global: new GlobalContext()})

      await resolveObject({
        address: {zip: '12345'}
      }, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(errorStore.errors[0].path, 'user.address.zip')
    })

    test('should continue processing after property error', async () => {
      const param = new ParameterReference('obj').object({
        first: new ParameterReference('first').validation(v => {
          throw new Error('First failed')
        }),
        second: new ParameterReference('second').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({
        first: 'fail',
        second: 'ok'
      }, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 1)
      assert.strictEqual(result.sanitized.second, 'ok')
    })

    test('should collect multiple property errors', async () => {
      const param = new ParameterReference('obj').object({
        first: new ParameterReference('first').validation(v => {
          throw new Error('First error')
        }),
        second: new ParameterReference('second').validation(v => {
          throw new Error('Second error')
        })
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await resolveObject({
        first: 'fail1',
        second: 'fail2'
      }, param, errorStore, ctx)

      assert.strictEqual(errorStore.errors.length, 2)
    })
  })

  describe('edge cases', () => {
    test('should handle object with extra properties', async () => {
      const param = new ParameterReference('obj').object({
        expected: new ParameterReference('expected').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({
        expected: 'value',
        extra: 'ignored'
      }, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.expected, 'value')
      assert.strictEqual(result.sanitized.extra, undefined)
    })

    test('should handle properties with special characters', async () => {
      const param = new ParameterReference('obj').object({
        'field-with-dash': new ParameterReference('field-with-dash').noValidation(),
        'field.with.dot': new ParameterReference('field.with.dot').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({
        'field-with-dash': 'value1',
        'field.with.dot': 'value2'
      }, param, errorStore, ctx)

      assert.strictEqual(result.sanitized['field-with-dash'], 'value1')
      assert.strictEqual(result.sanitized['field.with.dot'], 'value2')
    })

    test('should handle null property values', async () => {
      const param = new ParameterReference('obj').object({
        nullable: new ParameterReference('nullable').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({nullable: null}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.nullable, null)
    })

    test('should handle undefined property values', async () => {
      const param = new ParameterReference('obj').object({
        undefinable: new ParameterReference('undefinable').noValidation()
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      const result = await resolveObject({undefinable: undefined}, param, errorStore, ctx)

      assert.strictEqual(result.sanitized.undefinable, undefined)
    })

    test('should throw if properties definition is missing', async () => {
      const param = new ParameterReference('obj').object({
        field: null  // Force null property
      })
      await param.freeze()

      const errorStore = new ErrorStore()
      const ctx = new ResolveContext('obj', {global: new GlobalContext()})

      await assert.rejects(
        async () => await resolveObject({field: 'value'}, param, errorStore, ctx),
        /missing properties/
      )
    })

    test('resolveObject - resolves simple object', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const ageParam = new ParameterReference('age')
      ageParam.validation((value) => checkNumber(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        age: ageParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      const value = {name: 'Alice', age: 30}
      const result = resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'Alice')
      assert.equal(result.sanitized.age, 30)
      assert.equal(errorStore.hasErrors(), false)
    })

    test('resolveObject - throws on non-object input', () => {
      const param = new ParameterReference('user')
      param.object({})

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      assert.throws(() => {
        resolveObject('not-an-object', param, errorStore, ctx)
      })
    })

    test('resolveObject - throws on array input', () => {
      const param = new ParameterReference('user')
      param.object({})

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      assert.throws(() => {
        resolveObject([], param, errorStore, ctx)
      })
    })

    test('resolveObject - throws on null input', () => {
      const param = new ParameterReference('user')
      param.object({})

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      assert.throws(() => {
        resolveObject(null, param, errorStore, ctx)
      })
    })

    test('resolveObject - handles empty object', () => {
      const param = new ParameterReference('user')
      param.object({})

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      param.freeze()

      const value = {}
      const result = resolveObject(value, param, errorStore, ctx)

      assert.deepEqual(result.sanitized, {})
    })

    test('resolveObject - collects validation errors for properties', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const ageParam = new ParameterReference('age')
      ageParam.validation((value) => checkNumber(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        age: ageParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      param.freeze()

      const value = {name: 123, age: 'invalid'}
      resolveObject(value, param, errorStore, ctx)

      assert.equal(errorStore.hasErrors(), true)
      assert.equal(errorStore.errors.length, 2)
    })

    test('resolveObject - continues processing after property errors', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const emailParam = new ParameterReference('email')
      emailParam.validation((value) => checkString(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        email: emailParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      param.freeze()

      const value = {name: 123, email: 'test@example.com'}
      const result = resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.email, 'test@example.com')
      assert.equal(errorStore.hasErrors(), true)
    })

    test('resolveObject - handles nested objects', () => {
      const streetParam = new ParameterReference('street')
      streetParam.validation((value) => checkString(value))

      const cityParam = new ParameterReference('city')
      cityParam.validation((value) => checkString(value))

      const addressParam = new ParameterReference('address')
      addressParam.object({
        street: streetParam,
        city: cityParam
      })

      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        address: addressParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      const value = {
        name: 'Alice',
        address: {
          street: 'Main St',
          city: 'NYC'
        }
      }
      param.freeze()
      const result = resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'Alice')
      assert.equal(result.sanitized.address.street, 'Main St')
      assert.equal(result.sanitized.address.city, 'NYC')
      assert.equal(errorStore.hasErrors(), false)
    })

    test('resolveObject - handles optional properties', () => {
      const nameParam = new ParameterReference('name', true)
      nameParam.validation((value) => checkString(value))

      const emailParam = new ParameterReference('email', false, 'default@example.com')
      emailParam.validation((value) => checkString(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        email: emailParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      const value = {name: 'Alice'}
      param.freeze()
      const result = resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'Alice')
      assert.equal(result.sanitized.email, 'default@example.com')
    })

    test('resolveObject - handles async property validation', async () => {
      const nameParam = new ParameterReference('name')
      nameParam.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        if (typeof value !== 'string') {
          throw new Error('Expected string')
        }
        return value.toUpperCase()
      })

      const param = new ParameterReference('user')
      param.object({
        name: nameParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      const value = {name: 'alice'}
      param.freeze()

      const result = await resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'ALICE')
    })

    test('resolveObject - handles mixed sync and async validations', async () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const emailParam = new ParameterReference('email')
      emailParam.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return checkString(value)
      })

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        email: emailParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})
      param.freeze()

      const value = {name: 'Alice', email: 'alice@example.com'}
      const result = await resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'Alice')
      assert.equal(result.sanitized.email, 'alice@example.com')
    })

    test('resolveObject - raw results contain original values', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value).toUpperCase())

      const param = new ParameterReference('user')
      param.object({
        name: nameParam
      })

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      const value = {name: 'alice'}

      param.freeze()

      const result = resolveObject(value, param, errorStore, ctx)

      assert.ok(result.raw)
      assert.equal(typeof result.raw, 'object')
    })

    test('resolveObject - supports lazy property definitions', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const param = new ParameterReference('user')
      param.object(() => ({
        name: nameParam
      }))

      const errorStore = new ErrorStore()
      const globalContext = new GlobalContext()
      const ctx = new ResolveContext('user', {global: globalContext})

      param.freeze()

      const value = {name: 'Alice'}
      const result = resolveObject(value, param, errorStore, ctx)

      assert.equal(result.sanitized.name, 'Alice')
    })
  })
  test('resolveObject - handles async property error in catch block', async () => {
    const nameParam = new ParameterReference('name')
    nameParam.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      throw new Error('Async validation failed')
    })

    const emailParam = new ParameterReference('email')
    emailParam.validation((value) => checkString(value))

    const param = new ParameterReference('user')
    param.object({
      name: nameParam,
      email: emailParam
    })

    const errorStore = new ErrorStore()
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    const value = {name: 'alice', email: 'test@example.com'}
    const result = await resolveObject(value, param, errorStore, ctx)

    assert.equal(errorStore.hasErrors(), true)
    assert.equal(result.sanitized.email, 'test@example.com')
    assert.ok(result.raw.name)
  })

  test('resolveObject - continues processing after async property error', async () => {
    const field1Param = new ParameterReference('field1')
    field1Param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      throw new Error('Field1 failed')
    })

    const field2Param = new ParameterReference('field2')
    field2Param.validation((value) => checkString(value))

    const field3Param = new ParameterReference('field3')
    field3Param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return checkNumber(value)
    })

    const param = new ParameterReference('data')
    param.object({
      field1: field1Param,
      field2: field2Param,
      field3: field3Param
    })

    const errorStore = new ErrorStore()
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('data', {global: globalContext})

    const value = {field1: 'will-fail', field2: 'success', field3: 42}
    const result = await resolveObject(value, param, errorStore, ctx)

    assert.equal(errorStore.hasErrors(), true)
    assert.equal(result.sanitized.field2, 'success')
    assert.equal(result.sanitized.field3, 42)
  })

  test('resolveObject - sets INVALID marker in raw results for async errors', async () => {
    const nameParam = new ParameterReference('name')
    nameParam.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      throw new Error('Validation error')
    })

    const param = new ParameterReference('user')
    param.object({
      name: nameParam
    })

    const errorStore = new ErrorStore()
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    const value = {name: 'test'}
    const result = await resolveObject(value, param, errorStore, ctx)

    assert.ok(result.raw)
    assert.ok(result.raw.name)
  })

  test('resolveObject - async error does not stop other async validations', async () => {
    const field1Param = new ParameterReference('field1')
    field1Param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      throw new Error('Failed')
    })

    const field2Param = new ParameterReference('field2')
    field2Param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return checkString(value).toUpperCase()
    })

    const field3Param = new ParameterReference('field3')
    field3Param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 15))
      return checkNumber(value) * 2
    })

    const param = new ParameterReference('data')
    param.object({
      field1: field1Param,
      field2: field2Param,
      field3: field3Param
    })

    const errorStore = new ErrorStore()
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('data', {global: globalContext})

    const value = {field1: 'error', field2: 'hello', field3: 21}
    const result = await resolveObject(value, param, errorStore, ctx)

    assert.equal(errorStore.hasErrors(), true)
    assert.equal(result.sanitized.field2, 'HELLO')
    assert.equal(result.sanitized.field3, 42)
  })
})
