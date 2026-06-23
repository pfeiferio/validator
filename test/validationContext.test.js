import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {Schema} from '../dist/schema/Schema.js'
import {validateParameter} from '../dist/index.js'
import {checkString} from '@pfeiferio/check-primitives'

describe('validationContext', () => {

  describe('validateParameter', () => {

    test('passes global validationContext to the validation handle', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const store = new SearchStore({name: 'Alice'})
      validateParameter(store, param, null, null, {global: {tenant: 'acme'}, local: undefined})

      assert.deepEqual(receivedCtx?.global, {tenant: 'acme'})
      assert.equal(receivedCtx?.local, undefined)
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

    test('global validationContext can influence validation logic', () => {
      const param = new ParameterReference('role')
      param.validation((value, ctx) => {
        const str = checkString(value)
        if (ctx?.global?.allowedRoles && !ctx.global.allowedRoles.includes(str)) {
          throw new Error(`role "${str}" not allowed`)
        }
        return str
      })

      const store = new SearchStore({role: 'admin'})
      const result = validateParameter(store, param, null, null, {global: {allowedRoles: ['user', 'moderator']}, local: undefined})

      assert.equal(result.errors.hasErrors(), true)
    })

    test('validationContext is propagated to nested parameters', () => {
      const receivedCtxValues = []
      const param = new ParameterReference('tags')
      param.many()
      param.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.global?.scope)
        return checkString(value)
      })

      const store = new SearchStore({tags: ['a', 'b', 'c']})
      validateParameter(store, param, null, null, {global: {scope: 'test'}, local: undefined})

      assert.deepEqual(receivedCtxValues, ['test', 'test', 'test'])
    })

  })

  describe('Schema', () => {

    test('passes global validationContext through schema.validate()', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(param)
      schema.validate({name: 'Alice'}, {tenant: 'acme'})

      assert.deepEqual(receivedCtx?.global, {tenant: 'acme'})
      assert.equal(receivedCtx?.local, undefined)
    })

    test('validationContext always present from schema, fields undefined when not provided', () => {
      let receivedCtx = 'sentinel'
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(param)
      schema.validate({name: 'Alice'})

      assert.deepEqual(receivedCtx, {global: undefined, local: undefined})
    })

    test('global validationContext is shared across all parameters in schema', () => {
      const receivedCtxValues = []
      const paramA = new ParameterReference('a')
      paramA.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.global?.scope)
        return checkString(value)
      })
      const paramB = new ParameterReference('b')
      paramB.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.global?.scope)
        return checkString(value)
      })

      const schema = new Schema()
      schema.add(paramA).add(paramB)
      schema.validate({a: 'foo', b: 'bar'}, {scope: 'shared'})

      assert.deepEqual(receivedCtxValues, ['shared', 'shared'])
    })

    test('local validationContext is set per parameter via addParameterValidationContext', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.addParameterValidationContext(param, {role: 'admin'})
      schema.add(param)
      schema.validate({name: 'Alice'})

      assert.deepEqual(receivedCtx?.local, {role: 'admin'})
      assert.equal(receivedCtx?.global, undefined)
    })

    test('local and global context are both accessible together', () => {
      let receivedCtx
      const param = new ParameterReference('name')
      param.validation((value, ctx) => {
        receivedCtx = ctx
        return checkString(value)
      })

      const schema = new Schema()
      schema.addParameterValidationContext(param, {role: 'admin'})
      schema.add(param)
      schema.validate({name: 'Alice'}, {tenant: 'acme'})

      assert.deepEqual(receivedCtx?.local, {role: 'admin'})
      assert.deepEqual(receivedCtx?.global, {tenant: 'acme'})
    })

    test('local context is only visible to the parameter it was bound to', () => {
      const receivedCtxValues = []
      const paramA = new ParameterReference('a')
      paramA.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.local ?? null)
        return checkString(value)
      })
      const paramB = new ParameterReference('b')
      paramB.validation((value, ctx) => {
        receivedCtxValues.push(ctx?.local ?? null)
        return checkString(value)
      })

      const schema = new Schema()
      schema.addParameterValidationContext(paramA, {only: 'a'})
      schema.add(paramA).add(paramB)
      schema.validate({a: 'foo', b: 'bar'})

      assert.deepEqual(receivedCtxValues, [{only: 'a'}, null])
    })

  })

})
