import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ParameterReference} from '../dist/schema/ParameterReference.js'
import {SearchStore} from '../dist/search/SearchStore.js'
import {validateParameter} from "../dist/index.js";

test('should handle async validation in objects and arrays', async () => {
  const store = new SearchStore({
    items: [{id: '1'}]
  });

  const param = new ParameterReference('items').many().object({
    id: new ParameterReference('id').asyncValidation(async (v) => {
      await new Promise(res => setTimeout(res, 10)); // Simuliere Latenz
      return Number(v);
    })
  });

  const {errors} = await validateParameter(store, param);
  assert.strictEqual(errors.hasErrors(), false);
  assert.strictEqual(param.value[0].id, 1);
});
