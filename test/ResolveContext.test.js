import {describe, test} from 'node:test'
import assert from 'node:assert/strict'
import {ResolveContext} from '../dist/context/ResolveContext.js'
import {GlobalContext} from '../dist/context/GlobalContext.js'

describe('ResolveContext', () => {
  describe('constructor', () => {
    test('should create context with string path', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      assert.strictEqual(ctx.path, 'field')
    })

    test('should create context with array path', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext(['root', 'field'], {global})

      assert.strictEqual(ctx.path, 'root.field')
    })

    test('should default forceOne to false', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      assert.strictEqual(ctx.forceOne, false)
    })

    test('should accept forceOne option', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global, forceOne: true})

      assert.strictEqual(ctx.forceOne, true)
    })

    test('should share global context', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      global.postValidations.push({
        parameter: {name: 'test'},
        value: 'value',
        path: 'path',
        ctx: {}
      })

      assert.strictEqual(ctx.postValidations.length, 1)
    })
  })

  describe('path getter', () => {
    test('should return single path element', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      assert.strictEqual(ctx.path, 'field')
    })

    test('should join multiple path elements with dots', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext(['root', 'nested', 'field'], {global})

      assert.strictEqual(ctx.path, 'root.nested.field')
    })

    test('should handle empty array', async () => {
      const global = new GlobalContext()

      await assert.rejects(
        async () => new ResolveContext([], {global}),
        /string\.expected/
      )
    })

    test('should handle single element array', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext(['field'], {global})

      assert.strictEqual(ctx.path, 'field')
    })

    test('should handle deep nesting', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext(['a', 'b', 'c', 'd', 'e'], {global})

      assert.strictEqual(ctx.path, 'a.b.c.d.e')
    })
  })

  describe('forceOne getter', () => {
    test('should return false by default', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      assert.strictEqual(ctx.forceOne, false)
    })

    test('should return true when set', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global, forceOne: true})

      assert.strictEqual(ctx.forceOne, true)
    })

    test('should be immutable', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global, forceOne: false})

      // Attempting to change forceOne should not work
      assert.strictEqual(ctx.forceOne, false)
    })
  })

  describe('postValidations getter', () => {
    test('should return global postValidations', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('field', {global})

      assert.strictEqual(ctx.postValidations, global.postValidations)
    })

    test('should share postValidations across contexts', () => {
      const global = new GlobalContext()
      const ctx1 = new ResolveContext('field1', {global})
      const ctx2 = new ResolveContext('field2', {global})

      ctx1.postValidations.push({
        parameter: {name: 'test'},
        value: 'value',
        path: 'path',
        ctx: {}
      })

      assert.strictEqual(ctx1.postValidations.length, 1)
      assert.strictEqual(ctx2.postValidations.length, 1)
    })
  })

  describe('child()', () => {
    test('should create child context with extended path', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('root', {global})
      const child = parent.child('field')

      assert.strictEqual(child.path, 'root.field')
    })

    test('should preserve global context', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('root', {global})
      const child = parent.child('field')

      assert.strictEqual(child.postValidations, parent.postValidations)
    })

    test('should set forceOne to false', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('root', {global, forceOne: true})
      const child = parent.child('field')

      assert.strictEqual(child.forceOne, false)
    })

    test('should handle nested children', () => {
      const global = new GlobalContext()
      const root = new ResolveContext('root', {global})
      const child1 = root.child('level1')
      const child2 = child1.child('level2')
      const child3 = child2.child('level3')

      assert.strictEqual(child3.path, 'root.level1.level2.level3')
    })

    test('should create independent child contexts', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('root', {global})
      const child1 = parent.child('field1')
      const child2 = parent.child('field2')

      assert.strictEqual(child1.path, 'root.field1')
      assert.strictEqual(child2.path, 'root.field2')
    })

    test('should handle special characters in child path', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('root', {global})
      const child = parent.child('field-with-dashes')

      assert.strictEqual(child.path, 'root.field-with-dashes')
    })
  })

  describe('item()', () => {
    test('should create item context with extended path', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('array', {global})
      const item = parent.item('0')

      assert.strictEqual(item.path, 'array.0')
    })

    test('should set forceOne to true', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('array', {global, forceOne: false})
      const item = parent.item('0')

      assert.strictEqual(item.forceOne, true)
    })

    test('should preserve global context', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('array', {global})
      const item = parent.item('0')

      assert.strictEqual(item.postValidations, parent.postValidations)
    })

    test('should handle multiple items', () => {
      const global = new GlobalContext()
      const parent = new ResolveContext('array', {global})

      const item0 = parent.item('0')
      const item1 = parent.item('1')
      const item2 = parent.item('2')

      assert.strictEqual(item0.path, 'array.0')
      assert.strictEqual(item1.path, 'array.1')
      assert.strictEqual(item2.path, 'array.2')
    })

    test('should handle nested items', () => {
      const global = new GlobalContext()
      const root = new ResolveContext('root', {global})
      const array = root.child('arrays')
      const item = array.item('0')
      const nested = item.child('nestedArray')
      const nestedItem = nested.item('5')

      assert.strictEqual(nestedItem.path, 'root.arrays.0.nestedArray.5')
      assert.strictEqual(nestedItem.forceOne, true)
    })
  })

  describe('path building', () => {
    test('should build complex paths', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('root', {global})
      const user = ctx.child('user')
      const addresses = user.child('addresses')
      const first = addresses.item('0')
      const street = first.child('street')

      assert.strictEqual(street.path, 'root.user.addresses.0.street')
    })

    test('should handle array indices as strings', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('items', {global})
      const item = ctx.item('42')

      assert.strictEqual(item.path, 'items.42')
    })

    test('should maintain path consistency', () => {
      const global = new GlobalContext()
      const ctx1 = new ResolveContext(['a', 'b', 'c'], {global})
      const ctx2 = new ResolveContext('a', {global}).child('b').child('c')

      assert.strictEqual(ctx1.path, ctx2.path)
    })
  })

  describe('forceOne propagation', () => {
    test('should reset forceOne in child()', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('root', {global, forceOne: true})
      const child = ctx.child('field')

      assert.strictEqual(ctx.forceOne, true)
      assert.strictEqual(child.forceOne, false)
    })

    test('should set forceOne in item()', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('root', {global, forceOne: false})
      const item = ctx.item('0')

      assert.strictEqual(ctx.forceOne, false)
      assert.strictEqual(item.forceOne, true)
    })

    test('should maintain forceOne through multiple items', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('root', {global})
      const item1 = ctx.item('0')
      const child = item1.child('field')
      const item2 = child.item('1')

      assert.strictEqual(item1.forceOne, true)
      assert.strictEqual(child.forceOne, false)
      assert.strictEqual(item2.forceOne, true)
    })
  })

  describe('shared global state', () => {
    test('should accumulate postValidations from different contexts', () => {
      const global = new GlobalContext()
      const ctx1 = new ResolveContext('field1', {global})
      const ctx2 = new ResolveContext('field2', {global})

      ctx1.postValidations.push({
        parameter: {name: 'param1'},
        value: 'value1',
        path: ctx1.path,
        ctx: {}
      })

      ctx2.postValidations.push({
        parameter: {name: 'param2'},
        value: 'value2',
        path: ctx2.path,
        ctx: {}
      })

      assert.strictEqual(global.postValidations.length, 2)
      assert.strictEqual(ctx1.postValidations.length, 2)
      assert.strictEqual(ctx2.postValidations.length, 2)
    })
  })

  describe('edge cases', () => {
    test('should handle empty string paths', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext('', {global})

      assert.strictEqual(ctx.path, '')
    })

    test('should handle numeric paths', () => {
      const global = new GlobalContext()
      const ctx = new ResolveContext(['0', '1', '2'], {global})

      assert.strictEqual(ctx.path, '0.1.2')
    })

    test('should handle very deep nesting', () => {
      const global = new GlobalContext()
      let ctx = new ResolveContext('root', {global})

      for (let i = 0; i < 100; i++) {
        ctx = ctx.child(`level${i}`)
      }

      assert.ok(ctx.path.startsWith('root.level0.level1'))
      assert.ok(ctx.path.includes('level99'))
    })
  })

  test('ResolveContext - constructor with single path string', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    assert.equal(ctx.path, 'user')
    assert.equal(ctx.name, 'user')
    assert.equal(ctx.forceOne, false)
  })

  test('ResolveContext - constructor with array of paths', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext(['user', 'address', 'street'], {
      global: globalContext
    })

    assert.equal(ctx.path, 'user.address.street')
    assert.equal(ctx.name, 'street')
  })

  test('ResolveContext - constructor with custom name', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext(['user', 'email'], {
      global: globalContext,
      name: 'emailAddress'
    })

    assert.equal(ctx.path, 'user.email')
    assert.equal(ctx.name, 'emailAddress')
  })

  test('ResolveContext - constructor with custom name and single path', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('field', {
      global: globalContext,
      name: 'customName'
    })

    assert.equal(ctx.path, 'field')
    assert.equal(ctx.name, 'customName')
  })

  test('ResolveContext - constructor with forceOne option', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {
      global: globalContext,
      forceOne: true
    })

    assert.equal(ctx.forceOne, true)
  })

  test('ResolveContext - forceOne is false by default', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    assert.equal(ctx.forceOne, false)
  })

  test('ResolveContext - child() creates child context with extended path', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext('user', {global: globalContext})
    const child = parent.child('address')

    assert.equal(child.path, 'user.address')
    assert.equal(child.name, 'address')
  })

  test('ResolveContext - child() from multi-level parent', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext(['root', 'user'], {global: globalContext})
    const child = parent.child('email')

    assert.equal(child.path, 'root.user.email')
    assert.equal(child.name, 'email')
  })

  test('ResolveContext - child() does not inherit forceOne', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext('user', {
      global: globalContext,
      forceOne: true
    })
    const child = parent.child('address')

    assert.equal(parent.forceOne, true)
    assert.equal(child.forceOne, false)
  })

  test('ResolveContext - child() shares same global context', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext('user', {global: globalContext})
    const child = parent.child('address')

    assert.equal(child.postValidations, parent.postValidations)
  })

  test('ResolveContext - supports deep nesting with child()', () => {
    const globalContext = new GlobalContext()
    const ctx1 = new ResolveContext('user', {global: globalContext})
    const ctx2 = ctx1.child('address')
    const ctx3 = ctx2.child('street')
    const ctx4 = ctx3.child('number')

    assert.equal(ctx4.path, 'user.address.street.number')
    assert.equal(ctx4.name, 'number')
  })

  test('ResolveContext - item() creates item context with forceOne', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext('users', {global: globalContext})
    const item = parent.item('0')

    assert.equal(item.path, 'users.0')
    assert.equal(item.name, '0')
    assert.equal(item.forceOne, true)
  })

  test('ResolveContext - item() with custom name', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext('users', {global: globalContext})
    const item = parent.item('5')

    assert.equal(item.path, 'users.5')
    assert.equal(item.name, '5')
  })

  test('ResolveContext - item() from multi-level parent', () => {
    const globalContext = new GlobalContext()
    const parent = new ResolveContext(['data', 'users'], {global: globalContext})
    const item = parent.item('0')

    assert.equal(item.path, 'data.users.0')
    assert.equal(item.forceOne, true)
  })

  test('ResolveContext - postValidations returns global postValidations', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    assert.equal(ctx.postValidations, globalContext.postValidations)
    assert.equal(Array.isArray(ctx.postValidations), true)
  })

  test('ResolveContext - pushRules adds rules to global context', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    const rule1 = async () => {
    }
    const rule2 = async () => {
    }

    ctx.pushRules([rule1, rule2])

    assert.equal(globalContext.rules.length, 2)
    assert.equal(globalContext.rules[0]?.rule, rule1)
    assert.equal(globalContext.rules[1]?.rule, rule2)
    assert.equal(globalContext.rules[0]?.ctx, ctx)
    assert.equal(globalContext.rules[1]?.ctx, ctx)
  })

  test('ResolveContext - pushRules with empty array', () => {
    const globalContext = new GlobalContext()
    const ctx = new ResolveContext('user', {global: globalContext})

    ctx.pushRules([])

    assert.equal(globalContext.rules.length, 0)
  })

  test('ResolveContext - multiple contexts share same global', () => {
    const globalContext = new GlobalContext()
    const ctx1 = new ResolveContext('user', {global: globalContext})
    const ctx2 = new ResolveContext('email', {global: globalContext})

    const rule1 = async () => {
    }
    const rule2 = async () => {
    }

    ctx1.pushRules([rule1])
    ctx2.pushRules([rule2])

    assert.equal(globalContext.rules.length, 2)
  })
})
