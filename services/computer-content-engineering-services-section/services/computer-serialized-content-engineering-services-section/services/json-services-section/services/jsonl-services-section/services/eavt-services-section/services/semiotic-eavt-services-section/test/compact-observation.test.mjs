import { journalFeedPath } from "../src/journal/store-root.mjs";
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {tm} from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation';
import {journalWitness,parseJournalWitness,verifiedJournalWitness} from '../src/journal/event.mjs';
import {segmentAdmit,segmentPath,projectSegmentStatements} from '../src/journal/filesystem/segment-store.mjs';

const witness=journalWitness({kind:'metroplat.journal.observation',seat:'urn:test:newsroom',claim:tm.mark('source-assayed'),address:tm.mark('held-document'),time:'2026-10-08T00:00:00.000Z',causes:[],payload:{article:'Wales devolution',source:'exact held text',uncertainty:'Funding remains disputed'}});
const compact={id:witness.id,observation:witness.observation};

test('Compact observations retain the complete addressed witness and refuse altered material',()=>{
  assert.deepEqual(parseJournalWitness(compact),witness);
  assert.deepEqual(verifiedJournalWitness(compact),witness);
  assert.deepEqual(parseJournalWitness(witness),witness);
  const causal=journalWitness({...witness.observation,causes:[witness.id]});
  const repeated={id:causal.id,observation:{...causal.observation,causes:[witness.id,witness.id]}};
  assert.deepEqual(verifiedJournalWitness(repeated).observation,parseJournalWitness(repeated).observation);
  assert.throws(()=>parseJournalWitness({...compact,id:'ni:///sha-256;wrong'}),/does not match/);
  assert.throws(()=>verifiedJournalWitness({...compact,observation:{...compact.observation,payload:{article:'Altered'}}}).core,/does not match/);
  assert.throws(()=>parseJournalWitness({...compact,kind:'metroplat.journal.witness'}));
  assert.throws(()=>parseJournalWitness({...compact,observation:{...compact.observation,claim:{invalid:true}}}));
});

test('The durable segment stores observations and reads both compact and full carriers through checkpoints',()=>{
  const root=mkdtempSync(join(tmpdir(),'journal-compact-'));
  try{
    const log=journalFeedPath(root, "article", "2026-10-08");
    const [result]=segmentAdmit(log,[witness]);assert.equal(result.written,true);
    const stored=readFileSync(segmentPath(log),'utf8');
    assert.deepEqual(JSON.parse(stored),compact);
    assert.ok(Buffer.byteLength(stored)<Buffer.byteLength(JSON.stringify(witness)));
    assert.deepEqual(projectSegmentStatements(log,w=>w),[witness]);
    // A new projection exercises the persisted verified-prefix path.
    assert.deepEqual(projectSegmentStatements(log,w=>w.observation.payload),[witness.observation.payload]);
    writeFileSync(segmentPath(log),JSON.stringify(witness)+'\n');
    assert.deepEqual(projectSegmentStatements(log,w=>w.id),[witness.id]);
    assert.deepEqual(projectSegmentStatements(log,w=>w.sources),[witness.sources]);
    const child=journalWitness({...witness.observation,time:'2026-10-08T00:01:00.000Z',causes:[witness.id],payload:{article:'Wales devolution',status:'independently assessed'}});
    const [next]=segmentAdmit(log,[child]);assert.equal(next.written,true);
    const mixed=projectSegmentStatements(log,w=>w);
    assert.equal(mixed.length,2);assert.deepEqual(mixed[1].observation.causes,[witness.id]);
    assert.deepEqual(mixed[1].core,child.core);
    writeFileSync(segmentPath(log),JSON.stringify({...compact,observation:{...compact.observation,payload:{article:'Altered'}}})+'\n');
    assert.throws(()=>projectSegmentStatements(log,w=>w),/does not match/);
  }finally{rmSync(root,{recursive:true,force:true});}
});
