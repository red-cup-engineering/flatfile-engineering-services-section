import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { decodeCanonical, encodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
import { conformAscribedTerm } from "../src/conformance.mjs";
import { FOUR, isKnowledgeCover } from "@red-cup-engineering/hierarchical-circuit-law";
import {
  assay,
  normalizeEffectCell,
  parseRml,
  validateType,
} from "../src/rmn-core.mjs";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { RMN_FORMS, TySchema, tm } from "@red-cup-engineering/relation-model-notation";
import {
  decodeRelationalValue,
  encodeRelationalValue,
  relationalValueId,
} from "@red-cup-engineering/relational-value-graph-service";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the shipped CDDL projects every canonical descriptor form and exact effect cell", () => {
  const profile = readFileSync(join(ROOT, "content/profiles/org.emsenn.rmn.core.v3.cddl"), "utf8");
  const typeBlock = profile.slice(profile.indexOf("rmn-type ="), profile.indexOf("four ="));
  const termBlock = profile.slice(profile.indexOf("rmn-term ="));
  for (const branch of TySchema.anyOf) assert.match(typeBlock, new RegExp(`\\["${branch.items[0].const}"`, "u"));
  for (const tag of Object.keys(RMN_FORMS)) assert.match(termBlock, new RegExp(`\\["${tag}"`, "u"));
  for (const key of ["caller", "provider", "evidenceRoot", "outcome", "measures", "parent"]) assert.match(profile, new RegExp(`"${key}"`, "u"));
  for (const obsolete of ["law", "precondition", "operation", "postcondition", "refusal"]) assert.doesNotMatch(profile, new RegExp(`"${obsolete}"`, "u"));
});

test("an effect cell carries only witnessed fields and refuses stored law", () => {
  const cell = {
    caller: "eip155:1:0x0000000000000000000000000000000000000001",
    provider: "eip155:1:0x0000000000000000000000000000000000000002",
    outcome: { positiveEvidence: true, negativeEvidence: false },
    measures: [],
    evidenceRoot: semanticId(["star"]),
    parent: null,
  };
  const normalized = normalizeEffectCell(cell);
  assert.deepEqual(Object.keys(normalized).sort(), ["caller", "evidenceRoot", "measures", "outcome", "parent", "provider"]);
  assert.throws(() => normalizeEffectCell({ ...cell, law: cell.evidenceRoot }), /must expose exactly/u);
  assert.throws(() => normalizeEffectCell({ ...cell, precondition: cell.evidenceRoot }), /must expose exactly/u);
});

test("effect-bundle conformance derives operation identity from the bundled term", () => {
  const operation = ["mark", "perform the bounded operation"];
  const cell = {
    caller: "eip155:1:0x0000000000000000000000000000000000000001",
    provider: "eip155:1:0x0000000000000000000000000000000000000002",
    outcome: { positiveEvidence: false, negativeEvidence: false },
    measures: [],
    evidenceRoot: semanticId(["mark", "no evidence yet"]),
    parent: null,
  };
  const result = conformAscribedTerm([
    "ascribe",
    ["prod", ["effect"], ["base"]],
    ["pair", ["effect", cell], operation],
  ]);
  assert.equal(result.kind, "effect-bundle");
  assert.equal(result.operation, semanticId(operation));
  assert.deepEqual(result.effectCell, cell);
  assert.throws(
    () => conformAscribedTerm(["ascribe", ["prod", ["effect"], ["base"]], ["pair", ["effect", { ...cell, operation: semanticId(operation) }], operation]]),
    /must expose exactly/u,
  );
});

test("obsolete product type spelling is refused", () => {
  assert.throws(() => validateType(["product", ["effect"], ["base"]]), /unknown or malformed RMN type/u);
});

test("RFC 8949 and RFC 6920 identities match the released vectors", () => {
  const values = new Map([
    ["star", ["star"]],
    ["four-neither", ["four", false, false]],
    ["mark-nfc-e-acute", ["mark", "é"]],
    ["identity-rml", ["app", ["lam", ["var", 0]], ["star"]]],
  ]);
  const vectors = readFileSync(join(ROOT, "content/vectors/rmn-core-v2.tsv"), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"));
  for (const line of vectors) {
    const [name, hex, ni] = line.split("\t");
    assert.equal(encodeCanonical(values.get(name)).toString("hex"), hex);
    assert.equal(semanticId(values.get(name)), ni);
  }
  assert.throws(() => decodeCanonical(Buffer.from([0x18, 0x00])), /not in RFC 8949 core deterministic form/u);
});

test("typed relational RMN is canonical and round-trips without JSON", () => {
  const source = { alpha: "é", decimals: [1e-7, -2.5e-8, 1.25, 1e21], zeta: [true, null, 7] };
  const encoded = encodeRelationalValue(source);
  const term = ["ascribe", encoded.type, encoded.term];
  assert.deepEqual(decodeRelationalValue(encoded.type, encoded.term), source);
  assert.deepEqual(decodeSemantic(semanticBytes(term)), term);
  assert.equal(relationalValueId(source), semanticId(term));
});

test("bounded normalization and FOUR knowledge covers remain exact", () => {
  const term = parseRml("#lang rmn/v2\n(app (lam (var 0)) (star))");
  assert.deepEqual(assay({ term, expectedType: ["unit"], fuel: 4 }).normalForm, ["star"]);
  assert.deepEqual(
    conformAscribedTerm(["ascribe", ["unit"], ["app", ["lam", ["var", 0]], ["star"]]]).response,
    ["ascribe", ["unit"], ["star"]],
  );
  assert.equal(isKnowledgeCover(FOUR.neither, FOUR.true), true);
  assert.equal(isKnowledgeCover(FOUR.true, FOUR.both), true);
});

test("a WIT consumes canonical tm.charge values without a mark conversion", () => {
  const base = ["base"], id = semanticId(["star"]);
  const grounded = ["ground", ["predicate", "p", base, base], ["mark", "subject"], ["mark", "object"]];
  const witness = ["witness", grounded, tm.charge("unknown"), tm.charge("held"), id];
  assert.deepEqual(witness[2], ["four", false, false]);
  assert.deepEqual(witness[3], ["four", true, false]);
  assert.deepEqual(conformAscribedTerm(["ascribe", ["wit", ["grounded", base, base]], witness]).normalForm, witness);
});
