# Examples

This directory contains real-world examples demonstrating how
`@pfeiferio/validator` can be integrated into existing applications.

The focus is on:

- reusable parameter definitions
- framework integration
- execution-node based validation
- structured error handling

---

## Express.js

### Query parameter validation

This example shows how to validate query parameters in an Express application
using execution nodes instead of manual parsing.

Features demonstrated:

- reusable parameter factories
- schema validation via middleware
- structured validation errors
- direct access to validated values

➡️ [`express-query-validation.js`](../express-query-validation.js)

### Request body and query validation

This example demonstrates a more advanced Express integration
covering both request body and query parameters.

Features demonstrated:

- unified validation of `req.body` and `req.query`
- request extension via `parameterInitialize`
- reusable parameter factories
- structured error handling
- direct access to validated values

➡️ [`express-request-validation.ts`](./express-request-validation.ts)
