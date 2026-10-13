import test from "node:test";
import assert from "node:assert/strict";
import {cell,address,told,coincides,witnessFor,witnessAgainst} from "@red-cup-engineering/signcell/cell";
import {inferTy,isClosed} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import {jsonToTerm,termToJson} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import {eavtId} from "@red-cup-engineering/eavt-services-section/row";
import {seavtOfSignCell,signCellOfSeavt,seavtOfJson,isAbsoluteSeavtClock} from "../src/admit-seavt-row.mjs";

const when="2026-10-12T21:00:00-05:00";
const original=()=>cell(
 "urn:kalshi:market:synthetic",
 "has-observed-pnl",
 {amountAtomic:"-1",unit:"USD",unitDecimals:6,origin:"venue-claim"},
 {for:[{source:"venue",sha256:"sha256:"+"a".repeat(64)}],
  against:[{source:"independent-account",sha256:"sha256:"+"b".repeat(64)}]},
);

test("one SignCell is one native SEN-typed SEAVT observation under its actual SCA address",()=>{
 const source=original();
 const row=seavtOfSignCell(source,when);
 assert.deepEqual(row.e,jsonToTerm(address(source)));
 assert.deepEqual(row.a,jsonToTerm("signcell:cell"));
 assert.deepEqual(row.v,jsonToTerm(source));
 assert.equal(row.t,when);
 for(const coord of [row.e,row.a,row.v]) {
   assert.notEqual(inferTy([],coord),null);
   assert.equal(isClosed(coord),true);
 }
 assert.equal(termToJson(row.e),address(source));
 const restored=signCellOfSeavt(row);
 assert.equal(address(restored),address(source));
 assert.deepEqual(told(restored),[true,true],"support and refutation coexist");
 assert.equal(coincides(restored,source),true);
 assert.deepEqual(restored.for,source.for);
 assert.deepEqual(restored.against,source.against);
 assert.equal(restored.object.amountAtomic,"-1","micro-USD stays an exact string");
});

test("SCA triple identity remains stable as SignCell evidence accumulates",()=>{
 const base=cell("one","signed-value",{amountAtomic:"35",unitDecimals:2});
 const supported=witnessFor(base,{id:"first"});
 const opposed=witnessAgainst(supported,{id:"challenge"});
 const a=seavtOfSignCell(base,when);
 const b=seavtOfSignCell(supported,when);
 const c=seavtOfSignCell(opposed,when);
 assert.equal(address(base),address(supported));
 assert.equal(address(supported),address(opposed));
 assert.deepEqual(a.e,b.e);
 assert.deepEqual(b.e,c.e);
 assert.notEqual(eavtId(a),eavtId(b),"new witness is a new SEAVT observation");
 assert.notEqual(eavtId(b),eavtId(c),"opposition does not erase support");
 assert.deepEqual(told(signCellOfSeavt(c)),[true,true]);
});

test("time is a SEAVT witnessing dimension, not a silent substitute for identity",()=>{
 const c=original();
 const earlier=seavtOfSignCell(c,when);
 const later=seavtOfSignCell(c,"2026-10-12T21:01:00-05:00");
 assert.notEqual(eavtId(earlier),eavtId(later));
 assert.deepEqual(earlier.e,later.e);
 assert.deepEqual(earlier.v,later.v);
 assert.equal(address(signCellOfSeavt(later)),address(c));
});

test("forged SCA address, wrong SEN attribute, or non-cell JSON cannot impersonate a SignCell",()=>{
 const r=seavtOfSignCell(original(),when);
 assert.throws(()=>signCellOfSeavt({
   ...r,e:jsonToTerm("ni:///sha-256;not-this-original-cell"),
 }),/address differs/);
 assert.throws(()=>signCellOfSeavt({
   ...r,a:jsonToTerm("kalshi:verified-profit"),
 }),/native SignCell SEAVT/);
 assert.throws(()=>signCellOfSeavt({
   ...r,v:jsonToTerm({profit:true}),
 }),/signcell:/);
 assert.throws(()=>seavtOfSignCell({source:"not a cell"},when),/signcell:/);
 assert.throws(()=>seavtOfSignCell(original(),"yesterday"),/absolute source/);
});

test("SEAVT does not turn an unverified source allegation into affirmative testimony",()=>{
 const claim=cell("venue","reports-account-balance","350000",{against:[{issuer:"source-2"}]});
 const restored=signCellOfSeavt(seavtOfSignCell(claim,when));
 assert.deepEqual(told(restored),[false,true]);
 assert.deepEqual(restored.for,[]);
 assert.equal(address(restored),address(claim));
});

test("the native projection is the existing seavtOfJson bridge, not a parallel serialization",()=>{
 const c=original();
 assert.deepEqual(seavtOfSignCell(c,when),seavtOfJson(address(c),"signcell:cell",c,when));
});

test("SEAVT source time is a real calendar instant, not Date.parse rollover",()=>{
 const good="2024-02-29T23:59:59-05:00";
 assert.equal(isAbsoluteSeavtClock(good),true);
 for(const invalid of ["2026-02-30T12:00:00Z","2025-02-29T00:00:00Z","2026-13-01T00:00:00Z","yesterday"]){
   assert.equal(isAbsoluteSeavtClock(invalid),false);
   assert.throws(()=>seavtOfSignCell(original(),invalid),/absolute source/);
   assert.throws(()=>signCellOfSeavt({...seavtOfSignCell(original(),good),t:invalid}),/native SignCell SEAVT/);
 }
});
