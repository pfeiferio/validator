import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {checkString, checkNumber} from "@pfeiferio/check-primitives";
import {Schema} from "../dist/schema/Schema.js";

describe('postValidation', () => {

  test('callback is called with the validated value', () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation((value) => { received = value })

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'Alice'})

    assert.equal(received, 'Alice')
  })

  test('callback receives transformed value, not raw', () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v).toUpperCase())
    param.postValidation((value) => { received = value })

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
    param.postValidation(() => { called = true })

    const schema = new Schema()
    schema.add(param)
    schema.validate({})

    assert.equal(called, false)
  })

  test('multiple postValidations stack', () => {
    const calls = []
    const param = new ParameterReference('name').validation((v) => checkString(v))
    param.postValidation((value) => { calls.push('first') })
    param.postValidation((value) => { calls.push('second') })

    const schema = new Schema()
    schema.add(param)
    schema.validate({name: 'Alice'})

    assert.deepEqual(calls, ['first', 'second'])
  })

  test('error path matches parameter path', () => {
    const param = new ParameterReference('age').validation((v) => checkNumber(v))
    param.postValidation(() => { throw new Error('invalid') })

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
    param.asyncPostValidation(async (value) => { received = value })

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
    param.asyncPostValidation(async (value) => {})

    const schema = new Schema()
    schema.add(param)
    const result = schema.validate({name: 'Alice'})

    assert.equal(result instanceof Promise, true)
  })

  test('callback does not run when optional parameter is missing', async () => {
    let called = false
    const param = new ParameterReference('name', false).validation((v) => checkString(v))
    param.asyncPostValidation(async () => { called = true })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({})

    assert.equal(called, false)
  })

  test('receives transformed value, not raw', async () => {
    let received
    const param = new ParameterReference('name').validation((v) => checkString(v).toUpperCase())
    param.asyncPostValidation(async (value) => { received = value })

    const schema = new Schema()
    schema.add(param)
    await schema.validate({name: 'alice'})

    assert.equal(received, 'ALICE')
  })
})
