import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {createParameter} from "../dist/schema/createParameter.js";
import {Schema} from "../dist/schema/Schema.js";

describe('meta.raw', () => {

  test('plain value', async () => {
    const age = createParameter('age').validation(v => v.toString())
    const schema = new Schema()
    schema.add(age)

    await schema.validate({ age: 42 })

    assert.deepEqual(age.meta.raw, 42)
  })

  test('array value (many)', async () => {
    const age = createParameter('age')
      .validation(v => v.toString())
      .many()

    const schema = new Schema()
    schema.add(age)

    await schema.validate({ age: [1, 2, 3] })

    assert.deepEqual(age.meta.raw, [1, 2, 3])
  })

  test('object value', async () => {
    const bar = createParameter('bar').validation(v => v.toString())
    const foo = createParameter('foo').object({ bar })

    const schema = new Schema()
    schema.add(foo)

    await schema.validate({
      foo: { bar: 7 }
    })

    assert.deepEqual(foo.meta.raw, { bar: 7 })
    //assert.deepEqual(bar.meta.raw, 7)
  })

  test('nested object with array', async () => {
    const age = createParameter('age')
      .validation(v => v.toString())
      .many()

    const bar = createParameter('bar').validation(v => v.toString())
    const foo = createParameter('foo').object({ bar })

    const user = createParameter('user').object({
      age,
      foo
    })

    const schema = new Schema()
    schema.add(user)

    await schema.validate({
      user: {
        age: [5, 10],
        foo: { bar: 99 }
      }
    })

    assert.deepEqual(user.meta.raw, {
      age: [5, 10],
      foo: { bar: 99 }
    })

    //assert.deepEqual(age.meta.raw, [5, 10])
    //assert.deepEqual(foo.meta.raw, { bar: 99 })
    // assert.deepEqual(bar.meta.raw, 99)
  })

  test('raw preserves original reference shape', async () => {
    const value = { a: { b: [1, 2] } }

    const inner = createParameter('b').many().noValidation()
    const outer = createParameter('a').object({ b: inner })
    const root = createParameter('root').object({ a: outer })

    const schema = new Schema()
    schema.add(root)

    await schema.validate({ root: value })

    assert.deepEqual(root.meta.raw, value)
  })
})
