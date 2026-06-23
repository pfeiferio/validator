import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {checkNumber, checkString} from "@pfeiferio/check-primitives";
import {Schema} from "../dist/schema/Schema.js";

describe('postValidation', () => {

  test('callback is called with the validated value', () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation((value) => {
      received = value
    })

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'Alice'})

    assert.equal(received, 'Alice')
  })

  test('callback receives transformed value, not raw', () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v).toUpperCase())
    param.postValidation((value) => {
      received = value
    })

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'alice'})

    assert.equal(received, 'ALICE')
  })

  test('throwing inside callback adds error to errorStore', () => {
    const param = new ParameterReference('age').validation((v) => checkNumber(v))
    param.postValidation((value) => {
      if (value < 18) throw new Error('must be at least 18')
    })

    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({age: 16})

    assert.equal(result.errors.hasErrors(), true)
    assert.match(result.errors.errors[0].reason, /must be at least 18/)
  })

  test('no error when validation passes and callback does not throw', () => {
    const param = new ParameterReference('age').validation((v) => checkNumber(v))
    param.postValidation((value) => {
      if (value < 18) throw new Error('must be at least 18')
    })

    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({age: 25})

    assert.equal(result.errors.hasErrors(), false)
  })

  test('callback does not run when optional parameter is missing', () => {
    let called = false
    const param = new ParameterReference('name', false).validation((v) => checkString(v))
    param.postValidation(() => {
      called = true
    })

    const schema = new Schema()
    schema.add(param)
    schema.validate({})

    assert.equal(called, false)
  })

  test('multiple postValidations stack', () => {
    const calls = []
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation((value) => {
      calls.push('first')
    })
    param.postValidation((value) => {
      calls.push('second')
    })

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'Alice'})

    assert.deepEqual(calls, ['second'])
  })

  test('error path matches parameter path', () => {
    const param = new ParameterReference('age').validation((v) => checkNumber(v))
    param.postValidation(() => {
      throw new Error('invalid')
    })

    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({age: 5})

    assert.equal(result.errors.errors[0].path, 'age')
  })
})

describe('asyncPostValidation', () => {

  test('callback is called with the validated value', async () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.asyncPostValidation(async (value) => {
      received = value
    })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({name: 'Alice'})

    assert.equal(received, 'Alice')
  })

  test('throwing inside callback adds error to errorStore', async () => {
    const param = new ParameterReference('age').validation((v) => checkNumber(v))
    param.asyncPostValidation(async (value) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      if (value < 18) throw new Error('must be at least 18')
    })

    const schema = new Schema()
    schema.add(param)
    const result = await schema.validate({age: 16})

    assert.equal(result.errors.hasErrors(), true)
    assert.match(result.errors.errors[0].reason, /must be at least 18/)
  })

  test('schema returns Promise when asyncPostValidation is used', () => {
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.asyncPostValidation(async (value) => {
    })

    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({name: 'Alice'})

    assert.equal(result instanceof Promise, true)
  })

  test('callback does not run when optional parameter is missing', async () => {
    let called = false
    const param = new ParameterReference('name', false).validation((v) => checkString(v))
    param.asyncPostValidation(async () => {
      called = true
    })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({})

    assert.equal(called, false)
  })

  test('receives transformed value, not raw', async () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v).toUpperCase())
    param.asyncPostValidation(async (value) => {
      received = value
    })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({name: 'alice'})

    assert.equal(received, 'ALICE')
  })
})

describe('postValidation - object parameters', () => {

  test('postValidation callback runs for nested property', () => {
    let received
    const fooParam = new ParameterReference('foo').validation((v) => checkString(v))
    fooParam.postValidation((value) => { received = value })

    const param = new ParameterReference('user').object({foo: fooParam})
    const schema = new Schema()
    schema.add(param)
    schema.validate({user: {foo: 'bar'}})

    assert.equal(received, 'bar')
  })

  test('asyncPostValidation callback runs for nested property', async () => {
    let received
    const fooParam = new ParameterReference('foo').validation((v) => checkString(v))
    fooParam.asyncPostValidation(async (value) => { received = value })

    const param = new ParameterReference('user').object({foo: fooParam})
    const schema = new Schema()
    schema.add(param)
    await schema.validate({user: {foo: 'bar'}})

    assert.equal(received, 'bar')
  })

  test('error in postValidation on nested property has correct path', () => {
    const fooParam = new ParameterReference('foo').validation((v) => checkString(v))
    fooParam.postValidation(() => { throw new Error('invalid foo') })

    const param = new ParameterReference('user').object({foo: fooParam})
    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({user: {foo: 'bar'}})

    assert.equal(result.errors.hasErrors(), true)
    assert.equal(result.errors.errors[0].path, 'user.foo')
  })

  test('asyncPostValidation transforms nested property value', async () => {
    const fooParam = new ParameterReference('foo').validation((v) => checkString(v))
    fooParam.asyncPostValidation(async (value) => value.toUpperCase())

    const param = new ParameterReference('user').object({foo: fooParam})
    const schema = new Schema()
    schema.add(param)
    await schema.validate({user: {foo: 'bar'}})

    assert.equal(param.value.foo, 'BAR')
  })

  test('asyncPostValidation transforms array property within object', async () => {
    const tagsParam = new ParameterReference('tags').many().validation((v) => checkString(v))
    tagsParam.asyncPostValidation(async (value) => value.toUpperCase())

    const param = new ParameterReference('user').object({tags: tagsParam})
    const schema = new Schema()
    schema.add(param)
    await schema.validate({user: {tags: ['foo', 'bar']}})

    assert.deepEqual(param.value.tags, ['FOO', 'BAR'])
  })
})

describe('postValidation - data manipulation', () => {

  test('asyncPostValidation transforms array items', async () => {
    const param = new ParameterReference('numbers').many().validation((v) => checkNumber(v))
    param.asyncPostValidation(async (value) => value * 2)

    const schema = new Schema()
    schema.add(param)
    await schema.validate({numbers: [1, 2, 3]})

    assert.deepEqual(param.value, [2, 4, 6])
  })

  test('asyncPostValidation transforms array items with strings', async () => {
    const param = new ParameterReference('tags').many().validation((v) => checkString(v))
    param.asyncPostValidation(async (value) => value.toUpperCase())

    const schema = new Schema()
    schema.add(param)
    await schema.validate({tags: ['foo', 'bar']})

    assert.deepEqual(param.value, ['FOO', 'BAR'])
  })

  test('asyncPostValidation does not run when array contains invalid items', async () => {
    let called = false
    const param = new ParameterReference('numbers').many().validation((v) => {
      if (typeof v !== 'number') throw new Error('not a number')
      return v
    })
    param.asyncPostValidation(async (value) => { called = true; return value * 10 })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({numbers: [1, 'bad', 3]})

    assert.equal(called, false)
  })

  test('postValidation transforms scalar value', () => {
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation((value) => value.toUpperCase())

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'alice'})

    assert.equal(param.value, 'ALICE')
  })

  test('asyncPostValidation transforms scalar value', async () => {
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.asyncPostValidation(async (value) => value.toUpperCase())

    const schema = new Schema()
    schema.add(param)
    await schema.validate({name: 'alice'})

    assert.equal(param.value, 'ALICE')
  })
})

describe('postValidation - skipped on validation failure', () => {

  test('postValidation does not run when validation throws', () => {
    let called = false
    const param = new ParameterReference('age').validation((v) => {
      if (v < 0) throw new Error('negative')
      return v
    })
    param.postValidation(() => { called = true })

    const schema = new Schema()
    schema.add(param)
    schema.validate({age: -1})

    assert.equal(called, false)
  })

  test('asyncPostValidation does not run when validation throws', async () => {
    let called = false
    const param = new ParameterReference('age').validation((v) => {
      if (v < 0) throw new Error('negative')
      return v
    })
    param.asyncPostValidation(async () => { called = true })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({age: -1})

    assert.equal(called, false)
  })

  test('postValidation does not run when a sibling parameter fails', () => {
    let called = false
    const name = new ParameterReference('name').validation((v) => checkString(v))
    const age = new ParameterReference('age').validation((v) => checkNumber(v))
    age.postValidation(() => { called = true })

    const schema = new Schema()
    schema.add(name)
    schema.add(age)
    schema.validate({name: 123, age: 30})

    assert.equal(called, false)
  })
})

describe('postValidation - guards', () => {

  test('postValidation throws on noValidation() parameter', () => {
    assert.throws(
      () => new ParameterReference('name').noValidation().postValidation(() => {}),
      /\[schema-error\]/
    )
  })

  test('asyncPostValidation throws on noValidation() parameter', () => {
    assert.throws(
      () => new ParameterReference('name').noValidation().asyncPostValidation(async () => {}),
      /\[schema-error\]/
    )
  })

  test('asyncPostValidation handler returning sync throws SchemaError at runtime', () => {
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.asyncPostValidation(() => 'not a promise')

    const schema = new Schema()
    schema.add(param)

    assert.throws(
      () => schema.validate({name: 'alice'}),
      /must return a Promise/
    )
  })

  test('postValidation handler returning Promise throws SchemaError at runtime', () => {
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation(() => Promise.resolve('async from sync'))

    const schema = new Schema()
    schema.add(param)

    assert.throws(
      () => schema.validate({name: 'alice'}),
      /postValidationAsync/
    )
  })
})
