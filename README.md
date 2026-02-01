# @pfeiferio/validator

![npm](https://img.shields.io/npm/v/@pfeiferio/validator)
![types](https://img.shields.io/npm/types/@pfeiferio/validator)
![license](https://img.shields.io/npm/l/@pfeiferio/validator)
![downloads](https://img.shields.io/npm/dm/@pfeiferio/validator)
![node](https://img.shields.io/node/v/@pfeiferio/validator)
![size](https://img.shields.io/bundlephobia/min/@pfeiferio/validator)

A small, TypeScript-first validation framework for APIs and forms.

It focuses on **explicit parameters**, **schema-based validation**, and **full control over validation logic** —
including synchronous and asynchronous rules, nested objects, value transformation, and precise error paths.

If you prefer clarity over magic and want validation and transformation in one place, this library is for you.

---

## Why this library exists

Most validation libraries optimize for brevity or implicit inference.
`@pfeiferio/validator` optimizes for **control and predictability**.

- No decorators
- No hidden schema magic
- No JSON Schema indirection

Instead, you explicitly define:

- which parameters exist
- when they are required
- how they are validated
- how values are transformed

This makes it especially well suited for **backend APIs** and **complex request validation**.

---

## Installation

```bash
npm install @pfeiferio/validator
```

---

## Quick Example

```ts
import {Schema, createParameter} from '@pfeiferio/validator'
import {checkString, checkNumber} from '@pfeiferio/check-primitives'

const name = createParameter('name')
  .validation(checkString)

const age = createParameter('age')
  .validation(checkNumber)

const schema = new Schema()
  .add(name)
  .add(age)

const result = schema.validate({name: 'Alice', age: 30})

if (result.errors.hasErrors()) {
  console.log(result.errors.errors)
} else {
  console.log(name.value, age.value)
}
```

---

## Core Concepts

### Parameters

A parameter represents a single input value.

Parameters:

* can be required or optional
* validate and transform values
* can be synchronous or asynchronous
* support arrays and nested objects
* expose their sanitized value after validation

```ts
const email = createParameter('email')
  .validation(value => value.toLowerCase())
```

Async validation:

```ts
const username = createParameter('username')
  .asyncValidation(async value => {
    await checkAvailability(value)
    return value
  })
```

---

### Schema

A schema groups parameters and controls validation execution.

```ts
const schema = new Schema()
  .add(param1)
  .add(param2)
```

Validation:

```ts
const result = schema.validate(data)
```

`data` can be:

* a plain object
* a `SearchStore` (advanced use)

Schemas automatically handle sync and async parameters.
If async validation is involved, `validate()` returns a Promise.

---

### SearchStore (advanced)

`SearchStore` is a thin abstraction over input data with helper methods like `get()` and `has()`.

```ts
import {SearchStore} from '@pfeiferio/validator'

const store = new SearchStore(req.body)
schema.validate(store)
```

Using plain data is recommended unless you need advanced control.

---

## Error Handling

Validation errors include precise paths, making them easy to map back to APIs or UIs.

```ts
{
  path: 'user.email',
    name
:
  'email',
    reason
:
  'email.invalidFormat'
}
```

---

## Sync vs Async

Parameters can be synchronous or asynchronous.

The schema automatically detects async usage and behaves accordingly.

Helper guards are available:

```ts
import {
  isParameter,
  isParameterSync,
  isParameterAsync
} from '@pfeiferio/validator'
```

---

## When to use this library

* You want full control over validation logic
* You need async validation (e.g. database checks)
* You validate complex, nested request payloads
* You want validation and transformation in one step

## When not to use it

* You only need simple form validation
* You want automatic schema inference
* You prefer JSON Schema–based tooling

---

## Documentation

Advanced examples and internal concepts can be found in:

```
/docs
```

---

## Related Packages

* `@pfeiferio/check-primitives` – primitive validation helpers

---

## License

MIT
