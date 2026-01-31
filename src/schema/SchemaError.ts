export class SchemaError extends Error {

  constructor(message: string) {
    super(`[schema-error] ${message}`);
  }
}
