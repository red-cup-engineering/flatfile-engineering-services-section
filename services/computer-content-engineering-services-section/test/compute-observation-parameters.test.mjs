import test from 'node:test';
import assert from 'node:assert/strict';
import {validateJsonSchema} from '@red-cup-engineering/json-schema-services-section/validation';
import schema from '../src/compute-observation-parameters.schema.json' with {type:'json'};
import instance from './fixtures/compute-instance.json' with {type:'json'};

test('the authored instance binds the Data-owned compute parameter model',()=>{
  assert.equal(validateJsonSchema(instance.configuration,schema).valid,true);
});
test('missing policy, unsafe record paths, and invalid environment names refuse',()=>{
  for(const change of [x=>delete x.policy.witnessType,x=>x.policy.recordFile='../outside.json',
    x=>x.policy.freshnessMs=0,x=>x.delivery.peerActorEnvironmentVariable='unsafe value']) {
    const value=structuredClone(instance.configuration);change(value);
    assert.equal(validateJsonSchema(value,schema).valid,false);
  }
});
test('unknown parameters and executable-shaped values are not accepted as instance data',()=>{
  const value=structuredClone(instance.configuration);value.operation.run='arbitrary implementation';
  assert.equal(validateJsonSchema(value,schema).valid,false);
});
