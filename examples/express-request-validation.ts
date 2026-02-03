import express, {type NextFunction, type Request, type Response} from 'express'
import bodyParser from 'body-parser'

import {assertString, checkNumber, ValidationError} from '@pfeiferio/check-primitives'
import {
  createParameter,
  ErrorStore,
  type Parameter,
  type ParameterSync,
  Schema,
  type SchemaValidationResult,
  SearchStore
} from "@pfeiferio/validator";

/* -------------------------------------------------------------------------- */
/* Express Request Extension                                                   */
/* -------------------------------------------------------------------------- */

declare module 'express-serve-static-core' {
  interface Request {
    parameterInitialize(
      callback: (container: ParameterContainer) => void | Promise<void>
    ): Promise<void>
  }
}

/* -------------------------------------------------------------------------- */
/* Parameter Container                                                         */

/* -------------------------------------------------------------------------- */

class ParameterContainer {

  readonly search: SearchStore
  readonly schema: Schema<false>

  bodyParams: Record<string, Parameter> = {}
  queryParams: Record<string, Parameter> = {}

  constructor(req: Request) {
    const body = createParameter('body').object(this.bodyParams)
    const query = createParameter('query').object(this.queryParams)
    this.search = new SearchStore({
      body: req.body,
      query: req.query
    })

    this.schema = new Schema()
    this.schema
      .add(body)
      .add(query)
  }

  addQueryParameter(param: Parameter): this {
    this.queryParams[param.name] = param
    return this
  }

  addBodyParameter(param: Parameter): this {
    this.bodyParams[param.name] = param
    return this
  }

  validate(): Promise<SchemaValidationResult> | SchemaValidationResult {
    return this.schema.validate(this.search)
  }
}

/* -------------------------------------------------------------------------- */
/* Validation Exception                                                        */

/* -------------------------------------------------------------------------- */

class ParameterException extends Error {

  readonly errorStore: ErrorStore

  constructor(errors: ErrorStore) {
    super('parameter validation failed')
    this.errorStore = errors
  }
}

/* -------------------------------------------------------------------------- */
/* Express App                                                                */
/* -------------------------------------------------------------------------- */

const app = express()

app.use(bodyParser.json())
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.parameterInitialize = async (fn): Promise<void> => {

    const container = new ParameterContainer(req)

    await fn(container)
    const result = await container.validate()

    if (result.errors.hasErrors()) {
      throw new ParameterException(result.errors)
    }
  }
  next()
})

/* -------------------------------------------------------------------------- */
/* Reusable Parameter Definitions                                             */
/* -------------------------------------------------------------------------- */

const createUserIdParameter = (required = true): ParameterSync => {
  return createParameter('id', required).validation(value => {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10)

      if (parsed.toString() !== value) {
        throw new ValidationError('id.number_expected')
      }

      return parsed
    }

    return checkNumber(value)
  })
}

const createNameParameter = (required = true) =>
  createParameter('name', required).validation(value => {

    assertString(value)

    if (value.length < 3 || value.length > 8) {
      throw new ValidationError('name.length', {
        min: 3,
        max: 8
      })
    }

    return value
  })

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

app.get('/', (_req, res) => {
  res.send(`

Response:
<div id="response" style="white-space: pre;font-family: monospace;"></div>
Name: <input type="text" id="name"><br>
<input type="button" value="Send" onclick="send()">
  <script>
  const send = async ()=>{
    const response = await fetch("/post_test"+ window.location.search, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: document.querySelector("#name").value }),
  });
  const result = await response.json();
  document.querySelector("#response").innerText = JSON.stringify(result, null, 2)
}  
  </script>
  `)
})

app.post('/post_test', async (req, res) => {

  const id = createUserIdParameter()
  const name = createNameParameter()

  name.validation((val) => {
    if (typeof val !== 'string') {
      throw new Error('string expected')
    }

    if (val.toLowerCase() === 'johnny') {
      throw new Error('must not be johnny')
    }

    if (val.length > 30) {
      throw new Error('max 30 chars expected')
    }

    if (val.length < 3) {
      throw new Error('min 3 chars expected')
    }
    return val
  })

  id.validation((val) => {

    if (typeof val !== 'string') {
      throw new Error('string expected')
    }

    if (val.length > 3) {
      throw new Error('max 3 chars expected')
    }

    if (val.length < 1) {
      throw new Error('min 1 char expected')
    }

    return val
  })
  await req.parameterInitialize(container => {
    container
      .addQueryParameter(id)
      .addBodyParameter(name)
  })

  res.json({
    input: {
      id: id.value,
      name: name.value
    },
    status: 'ok',
    timestamp: Date.now()
  })
})


/* -------------------------------------------------------------------------- */
/* Error Handling                                                             */
/* -------------------------------------------------------------------------- */

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {

  if (err instanceof ParameterException) {
    res.status(400).json(err.errorStore.errors)
    return
  }

  res.status(500).json({
    error: String(err)
  })
})

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

app.listen(8080, () => {
  console.log('Server listening on port 8080')
})


//refactor(schema): simplify Schema.add API and extend express integration example
