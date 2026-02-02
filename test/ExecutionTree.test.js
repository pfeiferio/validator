import {createParameter, Schema} from '../dist/index.js';
import assert from 'node:assert';
import {describe, test} from 'node:test'


describe('Execution Tree & Node Navigation', () => {
  test('should navigate between siblings and parents', async () => {
    const paramA = createParameter('a', false).noValidation()
    const paramB = createParameter('b', false).noValidation()

    const schema = new Schema()
      .add(paramA)
      .add(
        paramB.requiredIf((_, __, ctx) => {
          const nodeA = ctx.global.postValidations.find(v => v.parameter === paramA).ctx.node
          const nodeB = ctx.global.postValidations.find(v => v.parameter === paramB).ctx.node

          assert.strictEqual(nodeA.parent, undefined)
          assert.strictEqual(nodeB.parent, undefined)

          const siblingsOfA = nodeA.siblings()
          assert.strictEqual(siblingsOfA.length, 1)
          assert.strictEqual(siblingsOfA.eq(), nodeB)

          return false
        })
      )

    await schema.validate({a: 1, b: 2})
  })

  test('should navigate children of many object parameter', async () => {
    const age = createParameter('age').noValidation()
    const user = createParameter('user').many().object({age})

    const result = await new Schema()
      .add(user)
      .validate({
        user: [
          {age: 10},
          {age: 20}
        ]
      })

    const userNodes = result.nodes(user)

    // container + items
    assert.strictEqual(userNodes.length, 3)

    const children = userNodes.children()
    // assert.strictEqual(children.length, 2)

    assert.strictEqual(children.eq(0).children.eq().is(age), true)
    assert.strictEqual(children.eq(1).children.eq().value, 20)
  })

  test('parent and children references must be consistent', async () => {
    const age = createParameter('age').noValidation()
    const user = createParameter('user').many().object({age})

    const result = await new Schema()
      .add(user)
      .validate({
        user: [{age: 5}]
      })

    const ageNode = result.nodes(age).eq()
    const userItemNode = ageNode.parent
    const userContainerNode = userItemNode.parent

    assert.ok(userItemNode)
    assert.ok(userContainerNode)

    assert.ok(userItemNode.children.includes(ageNode))
    assert.ok(userContainerNode.children.includes(userItemNode))
  })

  test('NodeList.eq should handle bounds and default index', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a)
      .add(b)
      .validate({a: 1, b: 2})

    const nodes = result.nodes(a)

    assert.strictEqual(nodes.eq(), nodes.eq(0))
    assert.strictEqual(nodes.eq(1), undefined)
    assert.strictEqual(nodes.eq(999), undefined)
  })

  test('siblings should be symmetric', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()
    const c = createParameter('c').noValidation()

    const result = await new Schema()
      .add(a)
      .add(b)
      .add(c)
      .validate({a: 1, b: 2, c: 3})

    const nodeA = result.nodes(a).eq()
    const nodeB = result.nodes(b).eq()
    const nodeC = result.nodes(c).eq()

    assert.ok(nodeA.siblings().includes(nodeB))
    assert.ok(nodeA.siblings().includes(nodeC))
    assert.ok(nodeB.siblings().includes(nodeA))
  })

  test('siblings() on root node returns empty NodeList', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const nodeA = result.nodes(a).eq()
    const siblings = nodeA.siblings()

    assert.strictEqual(siblings.length, 0)
  })

  test('siblings should be empty for single child', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const nodeA = result.nodes(a).eq()
    assert.strictEqual(nodeA.siblings().length, 0)
  })

  test('children of leaf node should be empty NodeList', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const nodeA = result.nodes(a).eq()
    assert.strictEqual(nodeA.children.length, 0)
  })
  test('deep tree navigation should remain consistent', async () => {
    const age = createParameter('age').noValidation()
    const profile = createParameter('profile').object({age})
    const user = createParameter('user').many().object({profile})

    const result = await new Schema()
      .add(user)
      .validate({
        user: [
          {profile: {age: 10}},
          {profile: {age: 20}}
        ]
      })

    const ageNodes = result.nodes(age)
    assert.strictEqual(ageNodes.length, 2)

    const firstAge = ageNodes.eq()
    assert.strictEqual(firstAge.parent.parent.is(user), true)
  })
  test('result.nodes should return stable node identities', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const n1 = result.nodes(a).eq()
    const n2 = result.nodes(a).eq()

    assert.strictEqual(n1, n2)
  })

  test('NodeList.filter should preserve NodeList semantics', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a)
      .add(b)
      .validate({a: 1, b: 2})

    const filtered = result.nodes(a).filter(n => n.value === 1)

    assert.ok(filtered.eq())
    assert.strictEqual(filtered.eq().value, 1)
  })

  test('NodeList must be immutable', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    const nodes = result.nodes(a)
    const before = nodes.eq()

    nodes.filter(() => true)
    assert.strictEqual(nodes.eq(), before)
  })

  test('NodeList.filter preserves order', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    const nodes = result.nodes(a)
    const filtered = nodes.filter(() => true)

    assert.strictEqual(filtered.eq(), nodes.eq())
  })

  test('children() on empty NodeList returns empty NodeList', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({})

    const nodes = result.nodes(a)
    assert.strictEqual(nodes.length, 0)
    assert.strictEqual(nodes.children().length, 0)
  })

  test('NodeList.eq supports negative indices', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    const nodes = result.nodes(a)

    assert.strictEqual(nodes.eq(0), nodes.eq(-1))
    assert.strictEqual(nodes.eq(-2), undefined)
    assert.strictEqual(nodes.eq(1), undefined)
  })

  test('siblings never include self', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a).add(b)
      .validate({a: 1, b: 2})

    const nodeA = result.nodes(a).eq()
    assert.ok(!nodeA.siblings().includes(nodeA))
  })

  test('siblings work correctly for many root items', async () => {
    const user = createParameter('user').many().noValidation()

    const result = await new Schema()
      .add(user)
      .validate({user: [1, 2, 3]})

    const nodes = result.nodes(user).children()
    assert.strictEqual(nodes.eq(0).siblings().length, 2)
  })

  test('parent chain must end at root', async () => {
    const a = createParameter('a').noValidation()
    const user = createParameter('user').object({a})

    const result = await new Schema()
      .add(user)
      .validate({user: {a: 1}})

    const nodeA = result.nodes(a).eq()
    assert.strictEqual(nodeA.parent.parent, undefined)
  })

  test('many parameter without input creates only container node', async () => {
    const user = createParameter('user', false).many().noValidation()

    const result = await new Schema()
      .add(user)
      .validate({user: []})

    assert.strictEqual(result.nodes(user).length, 1)
  })

  test('missing object field does not create node', async () => {
    const age = createParameter('age').noValidation()
    const user = createParameter('user').many().object({age})

    const result = await new Schema()
      .add(user)
      .validate({user: [{}]})

    assert.strictEqual(result.nodes(age).length, 0)
  })

  test('requiredIf runs per execution node', async () => {
    let calls = 0

    const age = createParameter('age').noValidation()
    const parentName = createParameter('parentName', false)
      .noValidation()
      .requiredIf(() => {
        calls++
        return false
      })

    const user = createParameter('user').many().object({age, parentName})

    await new Schema()
      .add(user)
      .validate({
        user: [
          {age: 10},
          {age: 20}
        ]
      })

    assert.strictEqual(calls, 2)
  })

  test('requiredIf can navigate siblings safely', async () => {
    const age = createParameter('age').noValidation()
    const parentName = createParameter('parentName', false)
      .noValidation()
      .requiredIf((_, node) => {
        const ageNode = node.siblings().filter(n => n.is(age)).eq()
        return ageNode.value < 14
      })

    const user = createParameter('user').object({age, parentName})

    const result = await new Schema()
      .add(user)
      .validate({user: {age: 10}})

    assert.strictEqual(result.errors.errors.length, 1)
  })

  test('accessing parent of root does not throw', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    assert.strictEqual(result.nodes(a).eq().parent, undefined)
  })

  test('children on leaf node is always empty NodeList', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    assert.strictEqual(result.nodes(a).eq().children.length, 0)
  })

  test('get value should correctly resolve leaf, object and array nodes', async () => {
    const age = createParameter('age').noValidation()
    const name = createParameter('name').noValidation()
    const optional = createParameter('optional', false).noValidation()

    const user = createParameter('user')
      .many()
      .object({
        age,
        name,
        optional
      })

    const result = await new Schema()
      .add(user)
      .validate({
        user: [
          {age: 10, name: 'Alice'},
          {age: 20, name: 'Bob'}
        ]
      })

    // 🔹 ARRAY (root many)
    const userNode = result.nodes(user).eq()
    assert.deepStrictEqual(userNode.value, [
      {age: 10, name: 'Alice', optional: undefined},
      {age: 20, name: 'Bob', optional: undefined}
    ])

    // 🔹 OBJECT
    const firstUser = userNode.children.eq()
    assert.deepStrictEqual(firstUser.value, {
      age: 10,
      name: 'Alice',
      optional: undefined
    })

    // 🔹 LEAF
    const ageNode = firstUser.children.filter(n => n.is(age)).eq()
    assert.strictEqual(ageNode.value, 10)

    // 🔹 UNDEFINED (optional, not provided)
    const optionalNode = firstUser.children.filter(n => n.is(optional)).eq()
    assert.strictEqual(optionalNode.value, undefined)
  })

  test('get value never throws for valid collect states', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    assert.doesNotThrow(() => {
      result.nodes(a).eq().value
    })
  })

  test('ExecutionNode.toJSON returns serializable debug object', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const node = result.nodes(a).eq()
    const json = node.toJSON()

    assert.deepStrictEqual(json, {name: 'a', children: [], parent: undefined, value: 1, raw: 1, path: 'a'})
  })

  test('siblings() without filter returns all siblings in same scope', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()
    const c = createParameter('c').noValidation()

    const result = await new Schema()
      .add(a).add(b).add(c)
      .validate({a: 1, b: 2, c: 3})

    const nodeA = result.nodes(a).eq()
    const siblings = nodeA.siblings()

    assert.strictEqual(siblings.length, 2)
    assert.ok(siblings.includes(result.nodes(b).eq()))
    assert.ok(siblings.includes(result.nodes(c).eq()))
  })

  test('siblings(filter) returns only siblings matching parameter', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()
    const c = createParameter('c').noValidation()

    const result = await new Schema()
      .add(a).add(b).add(c)
      .validate({a: 1, b: 2, c: 3})

    const nodeA = result.nodes(a).eq()
    const siblingsB = nodeA.siblings(b)

    assert.strictEqual(siblingsB.length, 1)
    assert.strictEqual(siblingsB.eq(), result.nodes(b).eq())
  })

  test('ExecutionNode.name returns parameter name', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const node = result.nodes(a).eq()
    assert.strictEqual(node.name, 'a')
  })

  test('ExecutionNode.path returns correct path', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').object({a})

    const result = await new Schema()
      .add(b)
      .validate({b: {a: 1}})

    const nodeA = result.nodes(a).eq()
    assert.strictEqual(nodeA.path, 'b.a')
  })

  test('siblings(filter) returns empty NodeList if no match', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a).add(b)
      .validate({a: 1, b: 2})

    const nodeA = result.nodes(a).eq()
    const filtered = nodeA.siblings(createParameter('c'))

    assert.strictEqual(filtered.length, 0)
  })

  test('ExecutionNode throws on invalid collect state', async () => {
    const a = createParameter('a').noValidation()

    const result = await new Schema()
      .add(a)
      .validate({a: 1})

    const node = result.nodes(a).eq()

    // Whitebox: force invalid internal state
    node._collectAs = Symbol('INVALID')

    assert.throws(
      () => node.value,
      /Invalid collect state/
    )
  })
  test('ExecutionNode.is accepts another ExecutionNode', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a)
      .add(b)
      .validate({a: 1, b: 2})

    const nodeA = result.nodes(a).eq()
    const nodeB = result.nodes(b).eq()

    assert.strictEqual(nodeA.is(nodeA), true)
    assert.strictEqual(nodeA.is(nodeB), false)
  })

  test('NodeList.toJSON returns array of node JSONs', async () => {
    const a = createParameter('a').noValidation()
    const b = createParameter('b').noValidation()

    const result = await new Schema()
      .add(a)
      .add(b)
      .validate({a: 1, b: 2})

    const nodes = result.nodes(a).toJSON()

    assert.deepStrictEqual(nodes, [
      {name: 'a', children: [], parent: undefined, value: 1, raw: 1, path: 'a'}
    ])
  })
  test('NodeList.first is equivalent to eq(0)', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    const nodes = result.nodes(a)

    assert.strictEqual(nodes.first(), nodes.eq(0))
  })
  test('NodeList.last is equivalent to eq(-1)', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({a: 1})

    const nodes = result.nodes(a)

    assert.strictEqual(nodes.last(), nodes.eq(-1))
  })

  test('NodeList.first and last return undefined on empty list', async () => {
    const a = createParameter('a').noValidation()
    const result = await new Schema().add(a).validate({})

    const nodes = result.nodes(a)

    assert.strictEqual(nodes.first(), undefined)
    assert.strictEqual(nodes.last(), undefined)
  })

})

