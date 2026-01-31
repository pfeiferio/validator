# @pfeiferio/validator

![npm](https://img.shields.io/npm/v/@pfeiferio/validator)
![types](https://img.shields.io/npm/types/@pfeiferio/validator)
![license](https://img.shields.io/npm/l/@pfeiferio/validator)
![downloads](https://img.shields.io/npm/dm/@pfeiferio/validator)
![node](https://img.shields.io/node/v/@pfeiferio/validator)
![size](https://img.shields.io/bundlephobia/min/@pfeiferio/validator)

A small, TypeScript-first validation framework for APIs and forms.

It focuses on **explicit parameters**, **schema-based validation**, and **full control over validation logic** – including synchronous and asynchronous rules, nested objects, and precise error paths.

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
````

---

## Quick Example

```ts
import {Schema, ParameterReference, SearchStore} from '@pfeiferio/validator'
import {checkString, checkNumber} from '@pfeiferio/check-primitives'

const schema = new Schema()
  .add(new ParameterReference('name').validation(checkString))
  .add(new ParameterReference('age').validation(checkNumber))

const store = new SearchStore({name: 'Alice', age: 30})
const result = schema.validate(store)

if (result.errors.hasErrors()) {
  console.log(result.errors.errors)
} else {
  const name = schema.parameters[0].value
  const age = schema.parameters[1].value
}
```

---

## Core Concepts

### ParameterReference

Represents a single input parameter.

* defines whether a value is required
* validates and transforms the value
* supports conditional requirements
* supports arrays and nested objects

```ts
new ParameterReference('email')
  .validation(value => value.toLowerCase())
```

---

### Schema

A schema groups multiple parameters and controls validation execution.

```ts
const schema = new Schema()
  .add(param1)
  .add(param2)

const result = schema.validate(store)
```

Schemas automatically become **async** if any parameter uses async validation.

---

### SearchStore

A simple container for input data.

```ts
const store = new SearchStore(req.body)
```

---

## Error Handling

Validation errors include precise paths, making them easy to map back to APIs or UIs.

```ts
{
  path: 'user.email',
  name: 'email',
  reason: 'email.invalidFormat'
}
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

Full documentation and advanced examples can be found in:

```
/docs
```

---

## Related Packages

* `@pfeiferio/check-primitives` – primitive validation helpers

---

## License

MIT
