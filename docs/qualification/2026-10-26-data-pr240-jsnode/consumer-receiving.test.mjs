import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

// Independent receiving of a prospective Data source through the original
// JSNode consumer. No provider implementation, digest or schema is replaced.
const consumerRoot=process.env.FABRICATION_CONSUMER_ROOT;
const dataRoot=process.env.FABRICATION_DATA_SOURCE_ROOT;
assert.ok(typeof consumerRoot==='string'&&isAbsolute(consumerRoot));
assert.ok(typeof dataRoot==='string'&&isAbsolute(dataRoot));
const requireConsumer=createRequire(join(consumerRoot,'package.json'));
const custody=JSON.parse(readFileSync(new URL('./source-custody.json',import.meta.url)));
const sha256=(bytes)=>createHash('sha256').update(bytes).digest('hex');
const {moduleFabricationPlan}=await import(pathToFileURL(join(consumerRoot,'src/plan-jsnode-modules.mjs')));
const {deriveJsnodeModules}=await import(pathToFileURL(join(consumerRoot,'src/derive-jsnode-package-from-closure.mjs')));
const {moduleWorkOrder}=await import(pathToFileURL(join(consumerRoot,'test/fixtures/module-work-order.mjs')));

test('original JSNode imports the exact prospective Data source without relabelling its declared release',()=>{
  for(const original of [...custody.receivedSourceFiles,...custody.publishedManifest]){
    const bytes=readFileSync(join(consumerRoot,original.path));
    assert.equal(bytes.length,original.bytes,original.path);
    assert.equal(sha256(bytes),original.sha256,original.path);
  }
  for(const supplier of custody.supplierSelections){
    const bytes=readFileSync(join(consumerRoot,'node_modules',supplier.name,'package.json'));
    const selected=JSON.parse(bytes);
    assert.equal(selected.name,supplier.name);
    assert.equal(selected.version,supplier.selectedVersion??supplier.selectedSourceManifestVersion);
    assert.equal(sha256(bytes),supplier.selectedManifest.sha256,supplier.name);
  }
  for(const original of custody.prospectiveDataSource.blobs){
    assert.equal(sha256(readFileSync(join(dataRoot,original.path))),original.sha256,original.path);
  }
  const manifest=JSON.parse(readFileSync(join(consumerRoot,'package.json')));
  assert.equal(manifest.name,'@red-cup-engineering/jsnode-package-services-section');
  assert.equal(manifest.version,'0.5.1-dev.4');
  assert.equal(manifest.gitHead,'2f4d07de3b92b54bdc7acc95914dfd70fa31a812');
  assert.equal(manifest.dependencies['@red-cup-engineering/computer-data-engineering-services-section'],'0.7.0');
  const resolved=requireConsumer.resolve('@red-cup-engineering/computer-data-engineering-services-section/artifact-fabrication');
  assert.equal(realpathSync(resolved),realpathSync(join(dataRoot,'src/artifact-fabrication.mjs')));
  const bytes=readFileSync(resolved);
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),
    '7f3ea7870a04ad0008b7ba388de3e6b8a0d604b8');
  assert.equal(JSON.parse(readFileSync(join(dataRoot,'package.json'))).version,'0.7.1');
});

test('original normal and shared-acyclic Work retain a native realization plan',()=>{
  const ordinary=moduleWorkOrder(),normal=moduleFabricationPlan(ordinary);
  assert.equal(normal.plan.type,'ArtifactFabricationRealizationPlan');
  assert.deepEqual(normal.workOrder.source,ordinary.source);
  const shared={type:'integer'},order=moduleWorkOrder(shared,2,shared,2);
  assert.equal(order.projections[0].configuration.operations[0].inputSchema,
    order.projections[0].configuration.operations[0].outputSchema);
  const received=moduleFabricationPlan(order);
  assert.equal(received.plan.type,'ArtifactFabricationRealizationPlan');
  assert.deepEqual(received.workOrder.source,order.source);
});

async function refusesBeforeDerivation(order){
  const planning=moduleFabricationPlan(order);
  assert.equal(planning.type,'JsnodeModuleDerivationRefusal');
  assert.equal(planning.phase,'artifact-specification-admission');
  assert.equal(planning.code,'INVALID_PROJECTION');
  assert.equal(planning.cause.type,'ArtifactFabricationSpecificationRefusal');
  let inferenceCalls=0;
  const proposal=await deriveJsnodeModules(order,{infer:async()=>{
    inferenceCalls++;throw new Error('invalid Work cannot reach inference');
  }});
  assert.equal(proposal.type,'JsnodeModuleDerivationRefusal');
  assert.equal(proposal.phase,'artifact-specification-admission');
  assert.equal(proposal.code,'INVALID_PROJECTION');
  assert.equal(proposal.cause.type,'ArtifactFabricationSpecificationRefusal');
  assert.equal(inferenceCalls,0);
}

test('cyclic Work reaches the original typed Data refusal before JSNode inference',async()=>{
  const order=moduleWorkOrder();
  order.projections[0].configuration.examples[0].input=order.projections[0].configuration;
  await refusesBeforeDerivation(order);
});

test('a getter in original Work is never invoked by Data or its JSNode consumer',async()=>{
  const order=moduleWorkOrder();let reads=0;
  Object.defineProperty(order.projections[0].configuration.examples[0],'input',{
    enumerable:true,configurable:true,get(){reads++;throw new Error('untrusted accessor');},
  });
  await refusesBeforeDerivation(order);assert.equal(reads,0);
});

test('the declared Data depth bound remains an explicit consumer refusal',async()=>{
  const order=moduleWorkOrder();let deep=0;
  for(let i=0;i<130;i++)deep={nested:deep};
  order.projections[0].configuration.examples[0].input=deep;
  await refusesBeforeDerivation(order);
});

test('the declared Data node budget refuses before a consumer schema or inference call',async()=>{
  const order=moduleWorkOrder();
  order.projections[0].configuration.examples[0].input=Array(65537).fill(0);
  await refusesBeforeDerivation(order);
});

test('sparse-array Work cannot become a source-qualified JSNode proposal',async()=>{
  const order=moduleWorkOrder();
  order.projections[0].configuration.examples[0].input=[1,,2];
  await refusesBeforeDerivation(order);
});
