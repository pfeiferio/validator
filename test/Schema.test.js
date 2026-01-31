import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {Schema} from "../dist/schema/Schema.js";
import {ParameterReference, SearchStore} from "../dist/index.js";
import {checkNumber, checkString} from "@pfeiferio/check-primitives";
describe('Schema test', () => {

  test('Schema - add() adds parameter to schema', () => {
    const schema = new Schema()
    const param = new ParameterReference('name')

    schema.add(param)

    assert.equal(schema.parameters.length, 1)
    assert.equal(schema.parameters[0], param)
  })

  test('Schema - add() returns this for chaining', () => {
    const schema = new Schema()
    const param1 = new ParameterReference('name')
    const param2 = new ParameterReference('age')

    const result = schema.add(param1).add(param2)

    assert.equal(result, schema)
    assert.equal(schema.parameters.length, 2)
  })

  test('Schema - validate() with empty schema', () => {
    const schema = new Schema()
    const store = new SearchStore({})

    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
  })

  test('Schema - validate() with simple parameter', () => {
    const schema = new Schema()
    const param = new ParameterReference('name')
    param.validation((value) => checkString(value))

    schema.add(param)

    const store = new SearchStore({name: 'Alice'})
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(param.value, 'Alice')
  })

  test('Schema - validate() with multiple parameters', () => {
    const schema = new Schema()

    const nameParam = new ParameterReference('name')
    nameParam.validation((value) => checkString(value))

    const ageParam = new ParameterReference('age')
    ageParam.validation((value) => checkNumber(value))

    schema.add(nameParam).add(ageParam)

    const store = new SearchStore({name: 'Alice', age: 30})
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(nameParam.value, 'Alice')
    assert.equal(ageParam.value, 30)
  })

  test('Schema - validate() collects validation errors', () => {
    const schema = new Schema()
    const param = new ParameterReference('age')
    param.validation((value) => checkNumber(value))

    schema.add(param)

    const store = new SearchStore({age: 'not-a-number'})
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), true)
    assert.equal(result.errors.errors.length >= 1, true)
  })

  test('Schema - validate() with required missing parameter', () => {
    const schema = new Schema()
    const param = new ParameterReference('name', true)
    param.validation((value) => checkString(value))

    schema.add(param)

    const store = new SearchStore({})
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), true)
  })

  test('Schema - validate() with optional parameter uses default', () => {
    const schema = new Schema()
    const param = new ParameterReference('name', false, 'default-name')
    param.validation((value) => checkString(value))

    schema.add(param)

    const store = new SearchStore({})
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(param.value, 'default-name')
  })

  test('Schema - validate() with async validation', async () => {
    const schema = new Schema()
    const param = new ParameterReference('email')
    param.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return checkString(value)
    })

    schema.add(param)

    const store = new SearchStore({email: 'test@example.com'})
    const result = await schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(param.value, 'test@example.com')
  })

  test('Schema - validate() with mixed sync and async parameters', async () => {
    const schema = new Schema()

    const nameParam = new ParameterReference('name')
    nameParam.validation((value) => checkString(value))

    const emailParam = new ParameterReference('email')
    emailParam.asyncValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return checkString(value)
    })

    schema.add(nameParam).add(emailParam)

    const store = new SearchStore({name: 'Alice', email: 'alice@example.com'})
    const result = await schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(nameParam.value, 'Alice')
    assert.equal(emailParam.value, 'alice@example.com')
  })

  test('Schema - validate() executes rules', async () => {
    const schema = new Schema()

    const passwordParam = new ParameterReference('password', false)
    passwordParam.validation((value) => checkString(value))

    const confirmParam = new ParameterReference('confirmPassword')
    confirmParam.validation((value) => checkString(value))

    let ruleExecuted = false
    passwordParam.requiredIf(() => {
      ruleExecuted = true
      return false
    })

    schema.add(passwordParam).add(confirmParam)
    const store = new SearchStore({confirmPassword: 'secret'})
    const result = schema.validate(store)
    console.log({ruleExecuted})

    assert.equal(ruleExecuted, true)
  })

  test('Schema - validate() with requiredIf rule that fails', async () => {
    const schema = new Schema()

    const emailParam = new ParameterReference('email', false)
    emailParam.validation((value) => checkString(value))

    const notifyParam = new ParameterReference('notify')
    notifyParam.validation((value) => value === true)

    emailParam.requiredIf((values) => values.notify === true)

    schema.add(notifyParam).add(emailParam)

    const store = new SearchStore({notify: true})
    const result = await schema.validate(store)

    assert.equal(result.errors.hasErrors(), true)
  })

  test('Schema - validate() with requiredIf rule that passes', async () => {
    const schema = new Schema()

    const emailParam = new ParameterReference('email', false)
    emailParam.validation((value) => checkString(value))

    const notifyParam = new ParameterReference('notify')
    notifyParam.validation((value) => value === true || value === false)

    emailParam.requiredIf((values) => values.notify === true)

    schema.add(notifyParam).add(emailParam)

    const store = new SearchStore({notify: true, email: 'test@example.com'})
    const result = await schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
  })

  test('Schema - validate() with async requiredIf rule', async () => {
    const schema = new Schema()

    const emailParam = new ParameterReference('email', false)
    emailParam.validation((value) => checkString(value))

    const notifyParam = new ParameterReference('notify')
    notifyParam.validation((value) => value === false)

    emailParam.requiredIf((values) => {
      return !(values.notify === true)
    })

    schema.add(notifyParam).add(emailParam)

    const store = new SearchStore({notify: false})
    const result = await schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
  })

  test('Schema - validate() returns GlobalContext', () => {
    const schema = new Schema()
    const param = new ParameterReference('name')
    param.validation((value) => checkString(value))

    schema.add(param)

    const store = new SearchStore({name: 'Alice'})
    const result = schema.validate(store)

    assert.ok(result.global)
    assert.equal(typeof result.global, 'object')
  })

  test('Schema - parameters getter returns all parameters', () => {
    const schema = new Schema()
    const param1 = new ParameterReference('name')
    const param2 = new ParameterReference('age')
    const param3 = new ParameterReference('email')

    schema.add(param1).add(param2).add(param3)

    assert.equal(schema.parameters.length, 3)
    assert.deepEqual(schema.parameters, [param1, param2, param3])
  })

  test('Schema - validate() with object parameter', () => {
    const schema = new Schema()

    const streetParam = new ParameterReference('street')
    streetParam.validation((value) => checkString(value))

    const cityParam = new ParameterReference('city')
    cityParam.validation((value) => checkString(value))

    const addressParam = new ParameterReference('address')
    addressParam.object({
      street: streetParam,
      city: cityParam
    })

    schema.add(addressParam)

    const store = new SearchStore({
      address: {
        street: 'Main St',
        city: 'NYC'
      }
    })
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(addressParam.value.street, 'Main St')
    assert.equal(addressParam.value.city, 'NYC')
  })

  test('Schema - validate() with array parameter', () => {
    const schema = new Schema()

    const itemParam = new ParameterReference('tags')
    itemParam.many()
    itemParam.validation((value) => checkString(value))

    schema.add(itemParam)

    const store = new SearchStore({
      tags: ['javascript', 'typescript', 'nodejs']
    })
    const result = schema.validate(store)

    assert.equal(result.errors.hasErrors(), false)
    assert.equal(Array.isArray(itemParam.value), true)
    assert.equal(itemParam.value.length, 3)
  })
})
