# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile TypeScript → dist/
npm run clean          # remove dist/
npm test               # build then run all tests
npm run test:coverage  # build + run tests with coverage report
```

Tests are plain `.js` files in `test/` using Node's built-in `node:test` runner. They import directly from `dist/`, so **build must run before tests**. To run a single test file:

```bash
node --test test/Schema.test.ts
```

## Architecture

This is a TypeScript-first validation library (`@pfeiferio/validator`) published as an ESM-only package. It validates structured input objects against a schema of `Parameter` definitions, supports nested objects and arrays, async validation, and cross-field conditional requirements.

### Core concepts

**`ParameterReference`** (`src/schema/ParameterReference.ts`) — the central class. Created via `createParameter(name, required?, defaultValue?)` and configured via a fluent builder API:
- `.validation(fn)` — sync transform/validate; returns `ParameterSync`
- `.asyncValidation(fn)` — async transform/validate; returns `ParameterAsync`
- `.noValidation()` — pass-through; returns `ParameterRaw`
- `.object({...params})` — mark as a nested object container; mutually exclusive with `.validation()`
- `.many(fn?)` — accept an array of values; optionally validate the array shape
- `.requiredIf(predicate)` — dynamic required check; only valid on optional parameters

`freeze()` is called by the schema before validation; it resolves lazy property definitions and enforces invariants (e.g., validation handle must be set, `requiredIf` cannot be used on required parameters).

**`Schema`** (`src/schema/Schema.ts`) — groups parameters and drives validation. `schema.validate(data)` returns `SchemaValidationResult | Promise<SchemaValidationResult>`. If any parameter uses `asyncValidation`, the return is always a `Promise`. The schema detects async/sync mismatch at runtime and throws `SchemaError`.

**Resolver pipeline** (`src/resolver/`) — the execution path for a single parameter:
1. `resolveFromStore` — looks up the value in `SearchStore`, handles missing/required logic, creates an `ExecutionNode` marked `COLLECT_AS_UNDEFINED` for absent optional params
2. `resolveLeaf` — dispatches to `resolveMany` (array) or `resolveObject` / `resolveValue` (scalar)
3. `resolveValue` — calls `parameter.validate()`, catches errors into `ErrorStore`, registers a node

**`ExecutionNode` / `ExecutionScope`** (`src/nodes/`) — every resolved value produces a node in an execution tree. Nodes know their parent, children, siblings, path, and collected value (`COLLECT_AS_LEAF`, `COLLECT_AS_OBJECT`, `COLLECT_AS_ARRAY`, `COLLECT_AS_UNDEFINED`). The tree is what powers `result.nodes(param)` and `node.siblings(param)` inside `requiredIf` predicates.

**`GlobalContext`** (`src/context/GlobalContext.ts`) — shared across a full `schema.validate()` call. Holds the node registry (by `Parameter` reference) and accumulated post-validation rules.

**`ErrorStore`** (`src/schema/ErrorStore.ts`) — collects `ValidationIssue` objects `{path, name, reason, context?}`. Uses a `WeakSet` to deduplicate errors that may bubble through multiple catch blocks. `SchemaError` is always rethrown immediately (it signals a programming error, not a user input error).

**`SearchStore` / `Search`** (`src/search/`) — thin wrapper over the raw input object. `Search.search()` resolves a parameter by name, returning a `SearchResult` that knows whether it matched and what value was found.

### Type system

`src/schema/types.ts` defines the public `Parameter` union: `ParameterSync | ParameterAsync | ParameterRaw | ParameterUnvalidated`. `ParameterUnvalidated` is the initial state (before calling `.validation()` / `.asyncValidation()` / `.noValidation()`). The `Schema` generic `AsyncGuarantee` propagates to the return type of `validate()`.

### Key invariants

- A parameter must call exactly one of `.validation()`, `.asyncValidation()`, `.noValidation()`, or `.object()` before the schema runs.
- `.object()` and `.validation()` are mutually exclusive.
- `.requiredIf()` can only be used on optional parameters (`required = false`).
- A `required` parameter with a `defaultValue` throws immediately in the constructor.
- Tests always import from `dist/`; source-level imports use `.js` extensions (NodeNext resolution).
