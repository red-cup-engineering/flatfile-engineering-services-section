import assert from "node:assert/strict";
import test from "node:test";
import { semanticBytes, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import {
  ARTICULATE_OPERATION,
  ARTICULATING_APEX,
  ARTICULATING_LANGUAGE_IDENTIFIERS,
  ARTICULATING_REQUEST_KIND,
  decodeArticulatingRequest,
  encodeArticulatingRequest,
  executeArticulateUtterance,
} from "../src/articulating.mjs";

const input = Object.freeze({ tokenMark: { source: "test" }, claimMark: "alive" });

test("one apex executes the canonical Node articulation and names its Lean and Solidity readings", () => {
  const receipt = executeArticulateUtterance(input);
  assert.equal(receipt.apex, ARTICULATING_APEX);
  assert.equal(receipt.operation, ARTICULATE_OPERATION);
  assert.deepEqual(receipt.identifiers, ARTICULATING_LANGUAGE_IDENTIFIERS);
  assert.equal(receipt.identifiers.lean, "Obsmetrologia.Articulating.Cell.initial");
  assert.equal(receipt.identifiers.solidity, "ArticulationCell.seat");
  assert.equal(receipt.cell.kind, "utterance.articulation.cell");
  assert.equal(receipt.cell.potentialAperiodicArticulationCell[0].token.mark.value.source, "test");
  const [, [tokenSlot, claimSlot]] = receipt.cell.potentialAperiodicArticulationCell;
  assert.deepEqual(tokenSlot[0].mark.value, input.tokenMark);
  assert.equal(claimSlot.length, 0);
  assert.equal(receipt.requestNi, semanticId(input));
});

test("a request crosses the wire as reversible canonical bytes of that operation", () => {
  const request = { kind: ARTICULATING_REQUEST_KIND, operation: ARTICULATE_OPERATION, input };
  const projected = encodeArticulatingRequest(input);
  assert.equal(projected.semanticId, semanticId(request));
  assert.deepEqual(projected.bytes, semanticBytes(request));
  const decoded = decodeArticulatingRequest(projected.bytes);
  assert.equal(decoded.semanticId, projected.semanticId);
  assert.deepEqual(decoded.request.input, input);
  assert.throws(() => decodeArticulatingRequest(Buffer.concat([projected.bytes, Buffer.from([0])])));
  assert.throws(() => decodeArticulatingRequest(semanticBytes({ operation: ARTICULATE_OPERATION, input })), new RegExp(ARTICULATING_REQUEST_KIND, "u"));
});

test("the operation refuses displacement and unbounded matter", () => {
  assert.throws(() => executeArticulateUtterance({ ...input, apex: "ni:///sha-256;other" }), /different apex/u);
  assert.throws(() => executeArticulateUtterance({ tokenMark: "x".repeat(70_000), claimMark: "y" }), RangeError);
  assert.throws(() => executeArticulateUtterance({ tokenMark: "x" }), /tokenMark and claimMark/u);
});
