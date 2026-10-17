import test from "node:test";
import assert from "node:assert/strict";
import {
  diagonalFiber, classicalEq, paraconsistentEq,
  equalityCell, predicatingEqualityReceipt,
} from "../../src/articulation/predicating/equality.mjs";

const evidence = (relation, proofField, proof) => Object.freeze({
  traceId: "trace:attention-to-origin",
  testFamilyId: "tests:original-roles",
  relation,
  [proofField]: proof,
});
const identified = () => evidence("identified", "witness", { source:"quotient-observation" });
const separated = () => evidence("separated", "obstruction", { source:"position-obstruction" });

test("matching Mark payload presentations need not be observationally identified", () => {
  const left={ kind:"utterance.mark", value:{ same:"bytes" } };
  const right={ kind:"utterance.mark", value:{ same:"bytes" } };
  const compares=()=>separated();
  assert.deepEqual(diagonalFiber(left,right,compares), []);
  assert.equal(classicalEq(left,right,compares), "active");
  assert.equal(paraconsistentEq(left,right,compares), "absurd");
  const cell=equalityCell(left,right,compares);
  assert.equal(cell.diagonal,false);
  assert.equal(cell.subject,left,"a pure comparison need not inspect or clone the opaque Mark payload");
});

test("different opaque presentations may be identified by a supplied measured quotient", () => {
  const left={ kind:"utterance.mark", value:"source-presentation" };
  const right={ kind:"utterance.mark", value:"other-presentation" };
  const compares=()=>identified();
  assert.deepEqual(diagonalFiber(left,right,compares), [left]);
  assert.equal(classicalEq(left,right,compares), "potential");
  assert.equal(paraconsistentEq(left,right,compares), "stable");
});

test("missing test family, absent proof, unresolved and Boolean comparisons cannot mint equality", () => {
  const a={ value:"mark" },b={ value:"mark" };
  for (const compare of [undefined,()=>true,()=>false,()=>({relation:"identified"}),
    ()=>({traceId:"trace",testFamilyId:"tests",relation:"identified"}),
    ()=>({traceId:"trace",testFamilyId:"tests",relation:"unresolved"})]) {
    assert.throws(()=>equalityCell(a,b,compare),TypeError);
  }
});

test("a relationally sourced predication receipt derives two reads of the same observed diagonal", () => {
  const a={value:"a"},b={value:"b"};
  const compares=(left,right)=>left===right?identified():separated();
  const receipt=predicatingEqualityReceipt([a,b],compares);
  assert.equal(receipt.cells.length,4);
  assert.equal(receipt.cells.filter(x=>x.diagonal).length,2);
  assert.equal(receipt.reflexiveClassical,true);
  assert.equal(receipt.reflexiveParaconsistent,true);
  assert.equal(receipt.sameSupport,true);
  assert.equal(receipt.derivedFromObservedDiagonal,true);
  assert.match(receipt.quotientAdmission,/supplied trace/);
});
