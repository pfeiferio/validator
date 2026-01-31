import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {ErrorStore} from '../dist/schema/ErrorStore.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'
import {validateParameter} from "../dist/index.js";
import {checkNumber, checkString} from "@pfeiferio/check-primitives";

describe('validateParameter', () => {
  describe('new tests after async/sync refactoring', () => {

    test('validateParameter - validates simple string parameter', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const store = new SearchStore({name: 'Alice'})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(param.value, 'Alice')
    })

    test('validateParameter - validates number parameter', () => {
      const param = new ParameterReference('age')
      param.validation((value) => checkNumber(value))

      const store = new SearchStore({age: 30})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(param.value, 30)
    })

    test('validateParameter - handles missing required parameter', () => {
      const param = new ParameterReference('name', true)
      param.validation((value) => checkString(value))

      const store = new SearchStore({})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validateParameter - uses default value for optional missing parameter', () => {
      const param = new ParameterReference('status', false, 'active')
      param.validation((value) => checkString(value))

      const store = new SearchStore({})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(param.value, 'active')
    })

    test('validateParameter - collects validation errors', () => {
      const param = new ParameterReference('age')
      param.validation((value) => checkNumber(value))

      const store = new SearchStore({age: 'not-a-number'})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
      assert.ok(result.errors.errors.length > 0)
    })

    test('validateParameter - sets parameter value on success', () => {
      const param = new ParameterReference('email')
      param.validation((value) => checkString(value))

      const store = new SearchStore({email: 'test@example.com'})
      validateParameter(store, param)

      assert.equal(param.value, 'test@example.com')
    })

    test('validateParameter - sets parameter meta', () => {
      const param = new ParameterReference('data').noValidation()

      const store = new SearchStore({data: 'raw-value'})
      validateParameter(store, param)

      assert.equal(param.meta, 'raw-value')
    })

    test('validateParameter - accepts custom error store', () => {
      const param = new ParameterReference('age')
      param.validation((value) => checkNumber(value))

      const customErrorStore = new ErrorStore()
      const store = new SearchStore({age: 'invalid'})

      const result = validateParameter(store, param, customErrorStore)

      assert.equal(result.errors, customErrorStore)
      assert.equal(customErrorStore.hasErrors(), true)
    })

    test('validateParameter - accepts custom global context', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const customGlobal = new GlobalContext()
      const store = new SearchStore({name: 'Alice'})

      const result = validateParameter(store, param, null, customGlobal)

      assert.ok(result.ctx)
      assert.equal(result.ctx.postValidations, customGlobal.postValidations)
    })

    test('validateParameter - creates new error store if not provided', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const store = new SearchStore({name: 'Alice'})
      const result = validateParameter(store, param)

      assert.ok(result.errors)
      assert.equal(result.errors instanceof ErrorStore, true)
    })

    test('validateParameter - creates new global context if not provided', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const store = new SearchStore({name: 'Alice'})
      const result = validateParameter(store, param)

      assert.ok(result.ctx)
    })

    test('validateParameter - handles async validation', async () => {
      const param = new ParameterReference('email')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return checkString(value)
      })

      const store = new SearchStore({email: 'test@example.com'})
      const result = await validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(param.value, 'test@example.com')
    })

    test('validateParameter - async validation with errors', async () => {
      const param = new ParameterReference('age')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return checkNumber(value)
      })

      const store = new SearchStore({age: 'invalid'})
      const result = await validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validateParameter - returns Promise for async validation', () => {
      const param = new ParameterReference('email')
      param.asyncValidation(async (value) => checkString(value))

      const store = new SearchStore({email: 'test@example.com'})
      const result = validateParameter(store, param)

      assert.equal(result instanceof Promise, true)
    })

    test('validateParameter - returns sync result for sync validation', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const store = new SearchStore({name: 'Alice'})
      const result = validateParameter(store, param)

      assert.equal(result instanceof Promise, false)
    })

    test('validateParameter - validates array parameter', () => {
      const param = new ParameterReference('tags')
      param.many()
      param.validation((value) => checkString(value))

      const store = new SearchStore({tags: ['javascript', 'typescript']})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(Array.isArray(param.value), true)
      assert.equal(param.value.length, 2)
    })

    test('validateParameter - validates object parameter', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const ageParam = new ParameterReference('age')
      ageParam.validation((value) => checkNumber(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        age: ageParam
      })

      const store = new SearchStore({
        user: {
          name: 'Alice',
          age: 30
        }
      })
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), false)
      assert.equal(param.value.name, 'Alice')
      assert.equal(param.value.age, 30)
    })

    test('validateParameter - handles nested validation errors', () => {
      const nameParam = new ParameterReference('name')
      nameParam.validation((value) => checkString(value))

      const ageParam = new ParameterReference('age')
      ageParam.validation((value) => checkNumber(value))

      const param = new ParameterReference('user')
      param.object({
        name: nameParam,
        age: ageParam
      })

      const store = new SearchStore({
        user: {
          name: 123,
          age: 'invalid'
        }
      })
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
      assert.ok(result.errors.errors.length >= 2)
    })

    test('validateParameter - returns context with correct path', () => {
      const param = new ParameterReference('email')
      param.validation((value) => checkString(value))

      const store = new SearchStore({email: 'test@example.com'})
      const result = validateParameter(store, param)

      assert.equal(result.ctx.path, 'email')
      assert.equal(result.ctx.name, 'email')
    })

    test('validateParameter - handles transform in validation', () => {
      const param = new ParameterReference('name')
      param.validation((value) => {
        const str = checkString(value)
        return str.toUpperCase()
      })

      const store = new SearchStore({name: 'alice'})
      const result = validateParameter(store, param)

      assert.equal(param.value, 'ALICE')
    })

    test('validateParameter - handles async transform', async () => {
      const param = new ParameterReference('name')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        const str = checkString(value)
        return str.toLowerCase()
      })

      const store = new SearchStore({name: 'ALICE'})
      const result = await validateParameter(store, param)

      assert.equal(param.value, 'alice')
    })

    test('validateParameter - handles thrown errors gracefully', () => {
      const param = new ParameterReference('value')
      param.validation((value) => {
        throw new Error('Custom validation error')
      })

      const store = new SearchStore({value: 'anything'})
      const result = validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validateParameter - handles async thrown errors', async () => {
      const param = new ParameterReference('value')
      param.asyncValidation(async (value) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        throw new Error('Async validation error')
      })

      const store = new SearchStore({value: 'anything'})
      const result = await validateParameter(store, param)

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validateParameter - processes parameter only once for same error', () => {
      const param = new ParameterReference('age')
      param.validation((value) => {
        throw new Error('Validation failed')
      })

      const errorStore = new ErrorStore()
      const store = new SearchStore({age: 25})

      validateParameter(store, param, errorStore)

      // Same error object shouldn't be processed twice
      assert.equal(errorStore.errors.length, 1)
    })

    test('validateParameter - sets exists to true when value present', () => {
      const param = new ParameterReference('name')
      param.validation((value) => checkString(value))

      const store = new SearchStore({name: 'Alice'})
      validateParameter(store, param)

      assert.equal(param.exists, true)
    })

    test('validateParameter - sets exists to false when value missing', () => {
      const param = new ParameterReference('name', false, 'default')
      param.validation((value) => checkString(value))

      const store = new SearchStore({})
      validateParameter(store, param)

      assert.equal(param.exists, false)
    })
  })
  describe('basic validation', () => {
    test('should validate simple parameter', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field').noValidation()

      const {errors, ctx} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 0)
      assert.strictEqual(param.value, 'value')
      assert.strictEqual(ctx.path, 'field')
    })

    test('should create ErrorStore if not provided', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field').noValidation()

      const {errors} = await validateParameter(store, param, null)

      assert.ok(errors instanceof ErrorStore)
    })

    test('should use provided ErrorStore', async () => {
      const store = new SearchStore({field: 'value'})
      const param = new ParameterReference('field').noValidation()
      const existingErrors = new ErrorStore()

      const {errors} = await validateParameter(store, param, existingErrors)

      assert.strictEqual(errors, existingErrors)
    })

    test('should set parameter value', async () => {
      const store = new SearchStore({field: 'test'})
      const param = new ParameterReference('field').noValidation()

      await validateParameter(store, param)

      assert.strictEqual(param.value, 'test')
    })

    test('should set parameter meta', async () => {
      const store = new SearchStore({field: 'test'})
      const param = new ParameterReference('field').noValidation()

      await validateParameter(store, param)

      assert.strictEqual(param.meta, 'test')
    })
  })

  describe('validation with transformations', () => {
    test('should apply validation transformation', async () => {
      const store = new SearchStore({email: 'TEST@EXAMPLE.COM'})
      const param = new ParameterReference('email').validation(v => v.toLowerCase())

      await validateParameter(store, param)

      assert.strictEqual(param.value, 'test@example.com')
      assert.strictEqual(param.meta, 'TEST@EXAMPLE.COM')
    })

    test('should keep raw in meta and sanitized in value', async () => {
      const store = new SearchStore({count: '42'})
      const param = new ParameterReference('count').validation(v => Number(v))

      await validateParameter(store, param)

      assert.strictEqual(param.value, 42)
      assert.strictEqual(param.meta, '42')
    })
  })

  describe('error handling', () => {
    test('should collect validation errors', async () => {
      const store = new SearchStore({age: -5})
      const param = new ParameterReference('age').validation(v => {
        if (v < 0) throw new Error('Age must be positive')
        return v
      })

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 1)
      assert.strictEqual(errors.errors[0].path, 'age')
      assert.strictEqual(errors.errors[0].reason, 'Age must be positive')
    })

    test('should handle required parameter missing', async () => {
      const store = new SearchStore({})
      const param = new ParameterReference('required', true).validation(v => v)

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 1)
      assert.match(errors.errors[0].reason, /required\.missing/)
    })

    test('should not throw on validation errors', async () => {
      const store = new SearchStore({field: 'bad'})
      const param = new ParameterReference('field').validation(v => {
        throw new Error('Validation failed')
      })

      await assert.doesNotReject(
        async () => await validateParameter(store, param)
      )
    })

    test('should process error only once', async () => {
      const sharedError = new Error('Shared error')
      const store = new SearchStore({field: 'test'})
      const param = new ParameterReference('field').validation(v => {
        throw sharedError
      })
      const errorStore = new ErrorStore()

      await validateParameter(store, param, errorStore)

      assert.strictEqual(errorStore.errors.length, 1)
    })
  })

  describe('array validation', () => {
    test('should validate array parameters', async () => {
      const store = new SearchStore({items: [1, 2, 3]})
      const param = new ParameterReference('items').many().noValidation()

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 0)
      assert.deepStrictEqual(param.value, [1, 2, 3])
    })

    test('should validate array items', async () => {
      const store = new SearchStore({numbers: ['1', '2', '3']})
      const param = new ParameterReference('numbers')
        .many()
        .validation(v => Number(v))

      await validateParameter(store, param)

      assert.deepStrictEqual(param.value, [1, 2, 3])
    })

    test('should handle array shape validation', async () => {
      const store = new SearchStore({items: [1]})
      const param = new ParameterReference('items').many((values) => {
        if (values.length < 2) throw new Error('Need at least 2')
      }).noValidation()

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 1)
      assert.match(errors.errors[0].reason, /Need at least 2/)
    })

    test('should collect errors from array items', async () => {

      const store = new SearchStore({items: [1, -2, 3, -4]})
      const param = new ParameterReference('items')
        .many()
        .validation(v => {
          if (v < 0) throw new Error('Must be positive')
          return v
        })

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 2)
      assert.strictEqual(errors.errors[0].path, 'items.1')
      assert.strictEqual(errors.errors[1].path, 'items.3')
    })

    test('should validate empty required array as error', async () => {
      const store = new SearchStore({items: []})
      const param = new ParameterReference('items', true).many().noValidation()

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 1)
      assert.match(errors.errors[0].reason, /required\.missing/)
    })
  })

  describe('object validation', () => {
    test('should validate object parameters', async () => {
      const store = new SearchStore({
        user: {name: 'John', age: 30}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').validation(v => v),
        age: new ParameterReference('age').validation(v => v)
      })

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 0)
      assert.strictEqual(param.value.name, 'John')
      assert.strictEqual(param.value.age, 30)
    })

    test('should validate nested objects', async () => {
      const store = new SearchStore({
        user: {
          profile: {
            bio: 'Developer'
          }
        }
      })
      const param = new ParameterReference('user').object({
        profile: new ParameterReference('profile').object({
          bio: new ParameterReference('bio').validation(v => v)
        })
      })

      await validateParameter(store, param)

      assert.strictEqual(param.value.profile.bio, 'Developer')
    })

    test('should collect errors from object properties', async () => {

      const store = new SearchStore({
        user: {name: 'a', age: -5}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').validation(v => {
          if (v.length < 2) throw new Error('Name too short')
          return v
        }),
        age: new ParameterReference('age').validation(v => {
          if (v < 0) throw new Error('Age must be positive')
          return v
        })
      })

      const {errors} = await validateParameter(store, param)

      assert.strictEqual(errors.errors.length, 2)
      const paths = errors.errors.map(e => e.path)
      assert.ok(paths.includes('user.name'))
      assert.ok(paths.includes('user.age'))
    })

    test('should validate object with missing required property', async () => {
      const store = new SearchStore({
        user: {name: 'John'}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').validation(v => v),
        age: new ParameterReference('age', true).validation(v => v)
      })

      const {errors} = await validateParameter(store, param)
      assert.strictEqual(errors.errors.length, 1)
      assert.strictEqual(errors.errors[0].path, 'user.age')
    })

    test('should use default for missing optional property', async () => {
      const store = new SearchStore({
        user: {name: 'John'}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').validation(v => v),
        age: new ParameterReference('age', false, 25).validation(v => v)
      })

      await validateParameter(store, param)

      assert.strictEqual(param.value.age, 25)
    })
  })

  describe('complex nested structures', () => {
    test('should validate array of objects', async () => {
      const store = new SearchStore({
        users: [
          {name: 'Alice', age: 25},
          {name: 'Bob', age: 30}
        ]
      })
      const param = new ParameterReference('users')
        .many()
        .object({
          name: new ParameterReference('name').validation(v => v),
          age: new ParameterReference('age').validation(v => v)
        })

      await validateParameter(store, param)

      assert.strictEqual(param.value.length, 2)
      assert.strictEqual(param.value[0].name, 'Alice')
      assert.strictEqual(param.value[1].name, 'Bob')
    })

    test('should validate object with array properties', async () => {
      const store = new SearchStore({
        data: {
          tags: ['tag1', 'tag2'],
          counts: [1, 2, 3]
        }
      })
      const param = new ParameterReference('data').object({
        tags: new ParameterReference('tags').many().noValidation(),
        counts: new ParameterReference('counts').many().noValidation()
      })

      await validateParameter(store, param)

      assert.deepStrictEqual(param.value.tags, ['tag1', 'tag2'])
      assert.deepStrictEqual(param.value.counts, [1, 2, 3])
    })

    test('should handle deeply nested structure', async () => {
      const store = new SearchStore({
        company: {
          departments: [
            {
              name: 'Engineering',
              employees: [
                {name: 'Alice', skills: ['JS', 'TS']},
                {name: 'Bob', skills: ['Python']}
              ]
            }
          ]
        }
      })

      const param = new ParameterReference('company').object({
        departments: new ParameterReference('departments').many().object({
          name: new ParameterReference('name').validation(v => v),
          employees: new ParameterReference('employees').many().object({
            name: new ParameterReference('name').validation(v => v),
            skills: new ParameterReference('skills').many().noValidation()
          })
        })
      })

      await validateParameter(store, param)

      assert.strictEqual(param.value.departments[0].name, 'Engineering')
      assert.strictEqual(param.value.departments[0].employees[0].name, 'Alice')
      assert.deepStrictEqual(param.value.departments[0].employees[0].skills, ['JS', 'TS'])
    })
  })

  describe('context and postValidations', () => {
    test('should create context with parameter name', async () => {
      const store = new SearchStore({myField: 'value'})
      const param = new ParameterReference('myField').validation(v => v)

      const {ctx} = await validateParameter(store, param)

      assert.strictEqual(ctx.path, 'myField')
    })

    test('should accumulate postValidations', async () => {
      const store = new SearchStore({
        user: {name: 'John', age: 30}
      })
      const param = new ParameterReference('user').object({
        name: new ParameterReference('name').validation(v => v),
        age: new ParameterReference('age').validation(v => v)
      })

      const {ctx} = await validateParameter(store, param)

      assert.ok(ctx.postValidations.length > 0)
    })
  })

  describe('edge cases', () => {
    test('should handle null values in store', async () => {
      const store = new SearchStore({field: null})
      const param = new ParameterReference('field').validation(v => v)

      await validateParameter(store, param)

      assert.strictEqual(param.value, null)
    })

    test('should handle undefined values in store', async () => {
      const store = new SearchStore({field: undefined})
      const param = new ParameterReference('field').validation(v => v)

      await validateParameter(store, param)

      assert.strictEqual(param.value, undefined)
    })

    test('should handle falsy values', async () => {
      const store = new SearchStore({
        zero: 0,
        false: false,
        empty: ''
      })

      const param = new ParameterReference('zero').validation(v => v)
      await validateParameter(store, param)
      assert.strictEqual(param.value, 0)
    })

    test('should handle large nested structures', async () => {
      const largeArray = Array.from({length: 100}, (_, i) => ({
        id: i,
        value: `item${i}`
      }))

      const store = new SearchStore({items: largeArray})
      const param = new ParameterReference('items').many().object({
        id: new ParameterReference('id').validation(v => v),
        value: new ParameterReference('value').validation(v => v)
      })

      await validateParameter(store, param)

      assert.strictEqual(param.value.length, 100)
      assert.strictEqual(param.value[99].id, 99)
    })
  })
})
