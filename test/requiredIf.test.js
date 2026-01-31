import {test} from 'node:test'
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
