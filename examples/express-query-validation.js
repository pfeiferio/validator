import express from 'express';
import {assertString, checkNumber, ValidationError} from '@pfeiferio/check-primitives';
import {createParameter, Schema, SearchStore} from "@pfeiferio/validator";
/* -------------------------------------------------------------------------- */
/* Parameter Container                                                         */

/* -------------------------------------------------------------------------- */
class ParameterContainer {
  querySearch;
  querySchema;

  constructor(req) {
    this.querySearch = new SearchStore(req.query);
    this.querySchema = new Schema();
  }

  addQueryParameter(param) {
    this.querySchema.add(param);
    return this;
  }

  validate() {
    return this.querySchema.validate(this.querySearch);
  }
}

/* -------------------------------------------------------------------------- */
/* Validation Exception                                                        */

/* -------------------------------------------------------------------------- */
class ParameterException extends Error {
  errorStore;

  constructor(errors) {
    super('parameter validation failed');
    this.errorStore = errors;
  }
}

/* -------------------------------------------------------------------------- */
/* Express App                                                                */
/* -------------------------------------------------------------------------- */
const app = express();
app.use((req, res, next) => {
  req.parameterInitialize = async (fn) => {
    const container = new ParameterContainer(req);
    await fn(container);
    const result = await container.validate();
    if (result.errors.hasErrors()) {
      throw new ParameterException(result.errors);
    }
  };
  next();
});
/* -------------------------------------------------------------------------- */
/* Reusable Parameter Definitions                                             */
/* -------------------------------------------------------------------------- */
const createUserIdParameter = (required = true) => {
  return createParameter('id', required).validation(value => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (parsed.toString() !== value) {
        throw new ValidationError('id.number_expected');
      }
      return parsed;
    }
    return checkNumber(value);
  });
};
const createUserParameter = (required = true) => createParameter('user', required).object({
  id: createUserIdParameter(true),
  name: createNameParameter(true),
});
const createNameParameter = (required = true) => createParameter('name', required).validation(value => {
  assertString(value);
  if (value.length < 3 || value.length > 8) {
    throw new ValidationError('name.length', {
      min: 3,
      max: 8
    });
  }
  return value;
});
/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */
app.get('/dummy', async (req, res) => {
  const id = createUserIdParameter();
  const name = createNameParameter();
  await req.parameterInitialize(container => {
    container
      .addQueryParameter(id)
      .addQueryParameter(name);
  });
  res.json({
    input: {
      id: id.value,
      name: name.value
    },
    status: 'ok',
    timestamp: Date.now()
  });
});
app.get('/dummy2', async (req, res) => {
  const user = createUserParameter(false);
  await req.parameterInitialize(container => {
    container
      .addQueryParameter(user);
  });
  res.json({
    exists: user.exists,
    input: user.value,
    status: 'ok',
    timestamp: Date.now()
  });
});
/* -------------------------------------------------------------------------- */
/* Error Handling                                                             */
/* -------------------------------------------------------------------------- */
app.use((err, req, res, next) => {
  if (err instanceof ParameterException) {
    res.status(400).json(err.errorStore.errors);
    return;
  }
  res.status(500).json({
    error: String(err)
  });
});
/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */
app.listen(8080, () => {
  console.log('Server listening on port 8080');
});
//# sourceMappingURL=fo.js.map
