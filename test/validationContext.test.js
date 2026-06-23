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

  describe('nested parameters', () => {

    test('global context propagates to properties inside .object()', () => {
      const receivedCtxValues = []
      const city = new ParameterReference('city').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.global?.locale)
        return checkString(v)
      })
      const address = new ParameterReference('address').object({city})

      const schema = new Schema()
      schema.add(address)
      schema.validate({address: {city: 'Berlin'}}, {locale: 'de'})

      assert.deepEqual(receivedCtxValues, ['de'])
    })

    test('global context propagates to each item in a .many() array via schema', () => {
      const receivedCtxValues = []
      const tag = new ParameterReference('tags').many().validation((v, ctx) => {
        receivedCtxValues.push(ctx?.global?.scope)
        return checkString(v)
      })

      const schema = new Schema()
      schema.add(tag)
      schema.validate({tags: ['a', 'b', 'c']}, {scope: 'shared'})

      assert.deepEqual(receivedCtxValues, ['shared', 'shared', 'shared'])
    })

    test('global context propagates through object-in-object', () => {
      const receivedCtxValues = []
      const street = new ParameterReference('street').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.global?.locale)
        return checkString(v)
      })
      const address = new ParameterReference('address').object({street})
      const user = new ParameterReference('user').object({address})

      const schema = new Schema()
      schema.add(user)
      schema.validate({user: {address: {street: 'Hauptstraße'}}}, {locale: 'de'})

      assert.deepEqual(receivedCtxValues, ['de'])
    })

    test('global context propagates to properties inside array of objects', () => {
      const receivedCtxValues = []
      const name = new ParameterReference('name').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.global?.locale)
        return checkString(v)
      })
      const item = new ParameterReference('items').many().object({name})

      const schema = new Schema()
      schema.add(item)
      schema.validate({items: [{name: 'foo'}, {name: 'bar'}]}, {locale: 'de'})

      assert.deepEqual(receivedCtxValues, ['de', 'de'])
    })

    test('local context on parent parameter is inherited by nested properties without own local', () => {
      const receivedCtxValues = []
      const city = new ParameterReference('city').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.local?.region)
        return checkString(v)
      })
      const address = new ParameterReference('address').object({city})

      const schema = new Schema()
      schema.addParameterValidationContext(address, {region: 'EU'})
      schema.add(address)
      schema.validate({address: {city: 'Berlin'}})

      assert.deepEqual(receivedCtxValues, ['EU'])
    })

    test('nested parameter can have its own local context', () => {
      const receivedCtxValues = []
      const city = new ParameterReference('city').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.local?.allowed)
        return checkString(v)
      })
      const address = new ParameterReference('address').object({city})

      const schema = new Schema()
      schema.addParameterValidationContext(city, {allowed: ['Berlin', 'Hamburg']})
      schema.add(address)
      schema.validate({address: {city: 'Berlin'}})

      assert.deepEqual(receivedCtxValues, [['Berlin', 'Hamburg']])
    })

    test("nested parameter's own local overrides parent's local", () => {
      const receivedCtxValues = []
      const city = new ParameterReference('city').validation((v, ctx) => {
        receivedCtxValues.push(ctx?.local)
        return checkString(v)
      })
      const address = new ParameterReference('address').object({city})

      const schema = new Schema()
      schema.addParameterValidationContext(address, {region: 'EU'})
      schema.addParameterValidationContext(city, {allowed: ['Berlin']})
      schema.add(address)
      schema.validate({address: {city: 'Berlin'}})

      assert.deepEqual(receivedCtxValues, [{allowed: ['Berlin']}])
    })

  })

})
