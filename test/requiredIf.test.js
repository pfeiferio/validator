import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {Schema} from "../dist/schema/Schema.js";
import {SearchStore} from "../dist/search/SearchStore.js";


test('requiredIf should work regardless of parameter order', () => {
  const email = new ParameterReference('email', false).noValidation()
  const notify = new ParameterReference('notify').noValidation()

  email.requiredIf((values) => values.notify === true)

  const schema1 = new Schema().add(notify).add(email)
  const schema2 = new Schema().add(email).add(notify)

  const store = new SearchStore({notify: true})

  const result1 = schema1.validate(store)
  const result2 = schema2.validate(store)

  assert.strictEqual(result1.errors.hasErrors(), true)
  assert.strictEqual(result2.errors.hasErrors(), true)
})

test('weakset', () => {
  const notify = new ParameterReference('notify').validation(()=>{
    throw 'wrong one'
  })

  const schema = new Schema().add(notify)
  const store = new SearchStore({notify: true})

  const result = schema.validate(store)
  assert.strictEqual(result.errors.hasErrors(), true)
})

describe('RequiredIfCtx', () => {

  test('reason() appears in error context', () => {
    const email = new ParameterReference('email', false).noValidation()
    const notify = new ParameterReference('notify').noValidation()

    email.requiredIf((values, node, ctx) => {
      ctx.reason('notify is set to true')
      return values.notify === true
    })

    const result = new Schema().add(notify).add(email).validate({notify: true})

    assert.strictEqual(result.errors.hasErrors(), true)
    assert.deepStrictEqual(result.errors.errors[0].context.reasons, ['notify is set to true'])
  })

  test('dependsOn() appears in error context', () => {
    const email = new ParameterReference('email', false).noValidation()
    const notify = new ParameterReference('notify').noValidation()

    email.requiredIf((values, node, ctx) => {
      ctx.dependsOn(node)
      return values.notify === true
    })

    const result = new Schema().add(notify).add(email).validate({notify: true})

    assert.strictEqual(result.errors.hasErrors(), true)
    assert.deepStrictEqual(result.errors.errors[0].context.dependsOn, ['email'])
  })

  test('reason() and dependsOn() can be chained', () => {
    const email = new ParameterReference('email', false).noValidation()
    const notify = new ParameterReference('notify').noValidation()

    email.requiredIf((values, node, ctx) => {
      ctx.dependsOn(node).reason('first').reason('second')
      return true
    })

    const result = new Schema().add(notify).add(email).validate({notify: true})

    assert.deepStrictEqual(result.errors.errors[0].context.reasons, ['first', 'second'])
    assert.strictEqual(result.errors.errors[0].context.dependsOn.length, 1)
  })

  test('async predicate in requiredIf throws SchemaError', () => {
    const email = new ParameterReference('email', false).noValidation()
    const notify = new ParameterReference('notify').noValidation()

    email.requiredIf(async () => true)

    const schema = new Schema().add(notify).add(email)

    assert.throws(
      () => schema.validate({notify: true}),
      /Unexpected Promise/
    )
  })
})
