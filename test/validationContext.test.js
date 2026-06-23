import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {Schema} from '../dist/schema/Schema.js'
import {validateParameter} from '../dist/index.js'
import {checkString} from '@pfeiferio/check-primitives'

describe('validationContext', () => {

  describe('validateParameter', () => {

    test('passes validationContext to the validation handle', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const store = new SearchStore({name: 'Alice'})
      validateParameter(store, param, null, null, {tenant: 'acme'})

      assert.deepEqual(receivedCtx, {tenant: 'acme'})
    })

    test('validationContext is undefined when not provided', () => {
      let receivedCtx = 'sentinel'
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const store = new SearchStore({name: 'Alice'})
      validateParameter(store, param)

      assert.equal(receivedCtx, undefined)
    })

    test('validationContext can influence validation logic', () => {
      const param = new ParameterReference('role')
      param.validation((value, ctx) => {
        const str = checkString(value)
        if (ctx?.allowedRoles && !ctx.allowedRoles.includes(str)) {
          throw new Error(`role "${str}" not allowed`)
        }
        return str
      })

      const store = new SearchStore({role: 'admin'})
      const result = validateParameter(store, param, null, null, {allowedRoles: ['user', 'moderator']})

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validationContext is propagated to nested parameters', () => {
      const receivedCtxValues = []
      const param = new ParameterReference('tags')
      param.many()
      param.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.scope)
        return checkString(value)
      })

      const store = new SearchStore({tags: ['a', 'b', 'c']})
      validateParameter(store, param, null, null, {scope: 'test'})

      assert.deepEqual(receivedCtxValues, ['test', 'test', 'test'])
    })

  })

  describe('Schema', () => {

    test('passes validationContext through schema.validate()', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(param)
      schema.validate({name: 'Alice'}, {tenant: 'acme'})

      assert.deepEqual(receivedCtx, {tenant: 'acme'})
    })

    test('validationContext is undefined when not provided via schema', () => {
      let receivedCtx = 'sentinel'
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(param)
      schema.validate({name: 'Alice'})

      assert.equal(receivedCtx, undefined)
    })

    test('validationContext is shared across all parameters in schema', () => {
      const receivedCtxValues = []
      const paramA = new ParameterReference('a')
      paramA.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.scope)
        return checkString(value)
      })
      const paramB = new ParameterReference('b')
      paramB.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.scope)
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(paramA).add(paramB)
      schema.validate({a: 'foo', b: 'bar'}, {scope: 'shared'})

      assert.deepEqual(receivedCtxValues, ['shared', 'shared'])
    })

  })

})
