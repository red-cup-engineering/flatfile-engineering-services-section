import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { jsonId } from "../src/semantic-identity.mjs";
import { CIRCUIT_ASSEMBLY_PROFILE, HIERARCHICAL_CIRCUIT_PROFILE, circuitAssemblyId, hierarchicalCircuitId } from "@red-cup-engineering/hierarchical-circuit-law";
import { assayHierarchicalCircuitEquivalence, decodeEquivalenceAssayReceipt, PROVIDER_ACCOUNT } from "../src/assay.mjs";
import { createHierarchicalCircuitEquivalenceRecordJournal } from "../src/record-journal.mjs";
import { decodeSemantic } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

const N = { positiveEvidence: false, negativeEvidence: false }, T = { positiveEvidence: true, negativeEvidence: false }, F = { positiveEvidence: false, negativeEvidence: true }, B = { positiveEvidence: true, negativeEvidence: true };
const values = [N, T, F, B], id = (label) => jsonId(["mark", label], "lenticule.hierarchical-circuit-equivalence.test-mark");
const rows = (outputs = values) => values.map((input, index) => ({ input: [input], output: [outputs[index]] }));
const pin = (name, direction) => ({ name, direction, mode: "tensor", predicate: id("evidences"), carrier: id("FOUR") });
const membrane = (suffix) => ({ account: `eip155:31337:0x${suffix.padStart(40, "0")}`, authority: id(`authority-${suffix}`), custody: id(`custody-${suffix}`), territory: id(`territory-${suffix}`) });
function leaf() { return { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: id("identity-law"), ports: [pin("a", "input"), pin("z", "output")], instances: [], nets: [], behavior: { factors: [{ inputs: ["a"], outputs: ["z"], rows: rows() }] } }; }
function parent(child, behavior = { factors: [{ inputs: ["a"], outputs: ["z"], rows: rows() }] }) { return { profile: HIERARCHICAL_CIRCUIT_PROFILE, law: id("parent-law"), ports: [pin("a", "input"), pin("z", "output")], instances: [{ name: "die", component: hierarchicalCircuitId(child) }], nets: [{ name: "in", driver: { instance: null, port: "a" }, sinks: [{ instance: "die", port: "a" }], mode: "tensor", chain: null, contract: null }, { name: "out", driver: { instance: "die", port: "z" }, sinks: [{ instance: null, port: "z" }], mode: "tensor", chain: null, contract: null }], behavior }; }
function assembly(circuit) { return { profile: CIRCUIT_ASSEMBLY_PROFILE, circuit: hierarchicalCircuitId(circuit), placements: [{ address: [], membrane: membrane("2") }, { address: ["die"], membrane: membrane("1") }] }; }

test("the die binds exact circuit, assembly, behavior, request, and provider identities", () => {
  const child = leaf(), circuit = parent(child), populated = assembly(circuit);
  const result = assayHierarchicalCircuitEquivalence({ circuit, components: [child], assembly: populated });
  assert.equal(result.receipt.provider, PROVIDER_ACCOUNT);
  assert.equal(result.receipt.circuit, hierarchicalCircuitId(circuit));
  assert.equal(result.receipt.assembly, circuitAssemblyId(populated));
  assert.equal(result.receipt.equivalent, true);
  const term = decodeSemantic(result.canonicalBytes);
  assert.deepEqual(decodeEquivalenceAssayReceipt(term[1], term[2]), result.receipt);
});

test("the die refuses a declared behavior that is not the child composition", () => {
  const child = leaf(), circuit = parent(child, { factors: [{ inputs: ["a"], outputs: ["z"], rows: rows([N, N, N, N]) }] });
  assert.throws(() => assayHierarchicalCircuitEquivalence({ circuit, components: [child], assembly: assembly(circuit) }), /does not equal/u);
});

test("the die refuses an assembly with an unpopulated occurrence", () => {
  const child = leaf(), circuit = parent(child), populated = assembly(circuit);
  populated.placements.pop();
  assert.throws(() => assayHierarchicalCircuitEquivalence({ circuit, components: [child], assembly: populated }), /omits circuit occurrence/u);
});

test("a successful assay remains in package-local custody with support-only SEAVT evidence", () => {
  const child = leaf(), circuit = parent(child), result = assayHierarchicalCircuitEquivalence({ circuit, components: [child], assembly: assembly(circuit) });
  const journal = createHierarchicalCircuitEquivalenceRecordJournal({ root: mkdtempSync(join(tmpdir(), "hierarchical-circuit-assay-")) });
  const recorded = journal.recordReceipt({ ...result.receipt, semanticId: result.semanticId }, "2026-08-14T00:00:00.000Z");
  assert.equal(recorded.objectKind, "lenticule.hierarchical-circuit-equivalence-assay.journal-record");
  assert.deepEqual(recorded.charge, { support: true, refutation: false });
  assert.deepEqual(journal.query({ category: "hierarchical-circuit-equivalence-assay.receipt" })[0].record, { ...result.receipt, semanticId: result.semanticId });
  const claims = journal.claims();
  assert.ok(claims.some((claim) => claim.a === "charge:support"));
  assert.ok(!claims.some((claim) => claim.a === "charge:refutation"));
});
