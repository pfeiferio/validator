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
