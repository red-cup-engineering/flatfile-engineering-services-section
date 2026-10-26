import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {address,utteranceCell,triple} from '@red-cup-engineering/signcell/cell';
import {seavtOfJson} from '../src/admit-seavt-row.mjs';
import {get,put,readHead,writeHead} from '../src/store.mjs';
import {createCausalResourceHead} from '../src/causal-resource-head.mjs';

const events=createCausalResourceHead({
 recordType:'film-resource',witnessType:'film-observation',
 event:'original-film-source-observed'
});
const witness=()=>utteranceCell('film-source-observation',{source:'rights-separated-test'});
const resource=()=>address(utteranceCell('film-resource-identity',{
 customer:'source-owner',kind:'original-video-master',native:'pilot'
}));
const row=(subject,cause,time='2026-10-13T20:00:00Z',state='unknown')=>({
 ...seavtOfJson(subject,{event:'original-film-source-observed',producer:'public-fiction'},
  {state,commerce:'not-admitted',rights:'unreviewed'},time),
 causes:[{type:'film-observation',id:address(cause)}]
});
const withRoot=fn=>{
 const root=mkdtempSync(join(tmpdir(),'native-causal-resource-'));
 try{fn(root);}finally{rmSync(root,{force:true,recursive:true});}
};

test('a first-class original film resource requires its real SCA cause and keeps a stable subject',()=>withRoot(root=>{
 const cause=witness(),subject=resource(),received=row(subject,cause);
 assert.equal(events.read(root,subject),null);
 assert.throws(()=>events.receive(root,received),/SCA witness must be committed/);
 assert.equal(put(root,'film-observation',triple(cause)),address(cause));
 const first=events.receive(root,received);
 assert.equal(first.subject,subject);
 assert.equal(first.status,'received');
 const found=events.read(root,subject);
 assert.equal(found.kind,'semiotic-eavt.causal-resource-current');
 assert.deepEqual(found.recordIds,[first.record]);
 assert.deepEqual(found.observations,[received]);
 assert.equal(readHead(root,'film-resource',subject).at,received.t);
 assert.equal(events.receive(root,received).status,'already-received');
}));

test('later source-time supersedes current view but never destroys earlier evidence',()=>withRoot(root=>{
 const cause=witness(),subject=resource();
 put(root,'film-observation',triple(cause));
 const old=events.receive(root,row(subject,cause,'2026-10-13T20:00:00Z','draft'));
 const later=events.receive(root,row(subject,cause,'2026-10-13T20:03:00Z','technical-review'));
 assert.equal(later.status,'received');
 assert.deepEqual(events.read(root,subject).recordIds,[later.record]);
 assert.deepEqual(get(root,'film-resource',old.record),row(subject,cause,'2026-10-13T20:00:00Z','draft'));
 assert.equal(events.receive(root,row(subject,cause,'2026-10-13T19:00:00Z')).status,
  'historical-observation-retained');
 assert.deepEqual(events.read(root,subject).recordIds,[later.record]);
}));

test('equivalent timestamps retain contradictory source claims as a bounded FOUR-compatible frontier',()=>withRoot(root=>{
 const cause=witness(),subject=resource();
 put(root,'film-observation',triple(cause));
 const left=events.receive(root,row(subject,cause,'2026-10-13T20:03:00Z','accepted'));
 const right=events.receive(root,row(subject,cause,'2026-10-13T15:03:00-05:00','rejected'));
 assert.equal(right.status,'contested-at-source-time');
 const view=events.read(root,subject);
 assert.equal(view.state,'multiple-simultaneous-observations');
 assert.deepEqual(new Set(view.recordIds),new Set([left.record,right.record]));
 assert.equal(events.receive(root,row(subject,cause,'2026-10-13T20:03:00Z','accepted')).status,
  'already-received');
}));

test('malformed or forged evidence and inconsistent resource heads cannot become current',()=>withRoot(root=>{
 const cause=witness(),subject=resource();
 put(root,'film-observation',triple(cause));
 const valid=row(subject,cause);
 assert.throws(()=>events.receive(root,{...valid,t:'2026-02-30T00:00:00Z'}),/absolute/);
 assert.throws(()=>events.receive(root,{...valid,causes:[]}),/cause/);
 assert.throws(()=>events.receive(root,{...valid,a:seavtOfJson(subject,{event:'other'},1,valid.t).a}),/policy/);
 assert.throws(()=>events.read(root,'mutable:https://example.com'),/canonical NI/);
 assert.throws(()=>createCausalResourceHead({recordType:'bad/type',witnessType:'film-observation',event:'film'}),/type name/);
 const admitted=events.receive(root,valid);
 writeHead(root,'film-resource',subject,{frontier:[admitted.record],at:'2026-10-14T00:00:00Z'});
 assert.throws(()=>events.read(root,subject),/source clock disagrees/);
 // Canonical writeHead deduplicates identical IDs. A forged additional NI
 // still fails closed when that content-addressed observation is absent.
 const unattested=address(utteranceCell('film-source-observation',{source:'missing'}));
 writeHead(root,'film-resource',subject,{frontier:[admitted.record,unattested],at:valid.t});
 assert.throws(()=>events.read(root,subject),/record missing/);
}));
