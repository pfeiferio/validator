import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {Schema} from '../dist/schema/Schema.js'
import {checkNumber} from "@pfeiferio/check-primitives";

describe('Schema Async Validation', () => {
  test('should handle null values in async validation within a schema context', async () => {
    // Setup
    const to = new ParameterReference('to')

    // Wir simulieren die asynchrone Prüfung
    to.asyncValidation(async (val) => {
      return checkNumber(val)
    })

    const store = new SearchStore({
      to: null
    })

    const schema = new Schema()
    schema.add(to)

    // Execution
    const result = await schema.validate(store)

    // Validation
    // Da checkNumber einen Fehler wirft, wenn der Wert nicht vom Typ 'number' ist,
    // erwarten wir hier einen Eintrag im ErrorStore.
    assert.strictEqual(result.errors.hasErrors(), true, 'Should have errors due to null value')

    const issue = result.errors.errors[0]
    assert.strictEqual(issue.path, 'to')
    assert.strictEqual(issue.reason, 'number.expected')
  })

  test('should resolve successfully when async validation passes', async () => {
    const to = new ParameterReference('to')
    to.asyncValidation(async (val) => checkNumber(val))

    const store = new SearchStore({to: 42})
    const schema = new Schema()
    const result = await schema.add(to).validate(store)

    assert.strictEqual(result.errors.hasErrors(), false)
    assert.strictEqual(to.value, 42)
  })
})
