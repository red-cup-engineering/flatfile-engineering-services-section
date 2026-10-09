import assert from "node:assert/strict";
import test from "node:test";
import { record } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import {
  aheadCertificate,
  certificateOf,
  closeByCertificate,
  germCertificate,
  spotCheckCertificate,
} from "../src/articulation/predicating/positing/settling/certificate.mjs";

const declaration = "Obsmetrologia.residue_germ_ahead";
const seed = (n) => record(n, 2 * n);

for (const construct of [germCertificate, certificateOf]) {
  for (const residue of [
    { pos: -1, neg: 0 }, { pos: 0, neg: -1 },
    { pos: -1, neg: 1 }, { pos: 1, neg: -1 },
    { pos: -1, neg: -1 },
  ]) {
    test(`${construct.name}: negative residue (${residue.pos}, ${residue.neg}) is obstructed before realization`, () => {
      let seedCalls = 0;
      const rejected = construct(declaration, { residue, seed: () => { seedCalls++; return record(); } });
      assert.equal(rejected.kind, "ordinal.closure.germCertificate-obstruction");
      assert.equal(rejected.reason, "hypotheses-fail");
      assert.deepEqual(rejected.failed, ["residue-is-a-record"]);
      assert.ok(Object.isFrozen(rejected));
      assert.ok(Object.isFrozen(rejected.failed));
      assert.equal(Object.hasOwn(rejected, "orbit"), false);
      assert.equal(Object.hasOwn(rejected, "step"), false);
      assert.equal(seedCalls, 0);
      assert.equal(closeByCertificate(rejected).reason, "not-a-certificate");
    });
  }
}

test("the defining record carrier rejects either negative tally", () => {
  assert.throws(() => record(-1, 0), /a tally is a natural number/);
  assert.throws(() => record(0, -1), /a tally is a natural number/);
});

test("germ admission still rejects malformed and non-safe-integer residues on either axis", () => {
  for (const value of [-0.5, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, "1", 1n, null, undefined]) {
    for (const residue of [{ pos: value, neg: 1 }, { pos: 1, neg: value }]) {
      const rejected = germCertificate(declaration, { residue, seed });
      assert.equal(rejected.kind, "ordinal.closure.germCertificate-obstruction");
      assert.deepEqual(rejected.failed, ["residue-is-a-record"]);
    }
  }
  for (const residue of [undefined, null, {}, [], 1, "record"]) {
    assert.deepEqual(germCertificate(declaration, { residue, seed }).failed, ["residue-is-a-record"]);
  }
});

test("zero residue, missing seed, unknown declarations and wrong shapes remain obstructed", () => {
  assert.deepEqual(germCertificate(declaration, { residue: record(), seed }).failed, ["residue-ne-kBot"]);
  assert.deepEqual(germCertificate(declaration, { residue: record(1, 0) }).failed, ["seed-is-a-record-sequence"]);
  assert.deepEqual(germCertificate(declaration, { residue: { pos: NaN, neg: 0 } }).failed,
    ["residue-is-a-record", "seed-is-a-record-sequence"]);
  assert.equal(germCertificate("unknown", { residue: record(1, 0), seed }).reason, "not-a-certified-declaration");
  assert.equal(germCertificate("Obsmetrologia.omega_ahead").reason, "declaration-is-ahead-shaped");
  assert.equal(aheadCertificate(declaration, { residue: record(1, 0), seed }).reason, "declaration-is-germ-shaped");
});

for (const residue of [record(0, 1), record(1, 0), record(1, 1), record(2, 1), record(1, 2)]) {
  test(`nonnegative residue (${residue.pos}, ${residue.neg}) retains its bounded carrier behavior`, () => {
    for (const construct of [germCertificate, certificateOf]) {
      const certificate = construct(declaration, { residue, seed });
      assert.equal(certificate.kind, "ordinal.closure.germCertificate");
      assert.equal(certificate.representative, seed);
      // Fixed-residue certificates own the value, even when the input is frozen.
      assert.deepEqual(certificate.residue, residue);
      assert.notEqual(certificate.residue, residue);
      assert.equal(certificate.residue, certificate.parameters.residue);
      assert.deepEqual(certificate.orbit(3)(2), record(2 + 3 * residue.pos, 4 + 3 * residue.neg));
      assert.deepEqual(certificate.collapse(3), {
        pointUnderRepresentative: record(3 * residue.pos, 3 * residue.neg),
        representativeUnderPoint: record(),
      });
      // This checks only this finite prefix, not all-index seed conformance.
      const prefix = spotCheckCertificate(certificate, { stages: 4, width: 3 });
      assert.equal(prefix.kind, "ordinal.closure.certificateSpotCheck:witness");
      assert.equal(prefix.stages, 4);
      assert.equal(prefix.width, 3);
      const closed = closeByCertificate(certificate, { stages: 4, width: 3 });
      assert.equal(closed.kind, "ordinal.closure.carrier");
      assert.equal(closed.search.shape, "germ");
      assert.equal(closed.orbit.length, 4);
    }
  });
}

test("safe upper-bound and signed-zero nonzero residues retain admission without an unbounded arithmetic claim", () => {
  for (const residue of [record(Number.MAX_SAFE_INTEGER, 0), record(0, Number.MAX_SAFE_INTEGER), record(-0, 1), record(1, -0)]) {
    assert.equal(germCertificate(declaration, { residue, seed }).kind, "ordinal.closure.germCertificate");
  }
});

test("the ahead certificate retains its completed record and bounded spot check", () => {
  const certificate = aheadCertificate("Obsmetrologia.omega_ahead");
  assert.equal(certificate.kind, "ordinal.closure.aheadCertificate");
  assert.equal(certificate.limit.pos, null);
  assert.equal(certificate.limit.neg, 0);
  assert.equal(spotCheckCertificate(certificate, { stages: 4 }).kind, "ordinal.closure.certificateSpotCheck:witness");
  assert.equal(closeByCertificate(certificate, { stages: 4 }).search.shape, "ahead");
});
