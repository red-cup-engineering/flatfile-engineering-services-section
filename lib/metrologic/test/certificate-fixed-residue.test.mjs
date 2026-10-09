import assert from "node:assert/strict";
import test from "node:test";
import { record } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import {
  aheadCertificate, certificateOf, closeByCertificate, germCertificate, spotCheckCertificate,
} from "../src/articulation/predicating/positing/settling/certificate.mjs";

const declaration = "Obsmetrologia.residue_germ_ahead";
const seed = (n) => record(n, 2 * n);
const options = { stages: 3, width: 3 };
const witness = "ordinal.closure.certificateSpotCheck:witness";

for (const construct of [germCertificate, certificateOf]) {
  for (const [label, changed] of [["zero", record()], ["negative", { pos: -1, neg: 1 }], ["different positive", record(3, 2)]]) {
    test(`${construct.name}: a caller change to ${label} cannot change the fixed dynamic or an old carrier`, () => {
      const residue = { pos: 1, neg: 1 };
      const certificate = construct(declaration, { residue, seed });
      const oldOrbit = certificate.orbit(1);
      const oldStep = certificate.step(seed);
      const oldBounds = certificate.collapse(2);
      const carrier = closeByCertificate(certificate, options);
      assert.equal(carrier.kind, "ordinal.closure.carrier");
      assert.equal(Object.isFrozen(residue), false);
      residue.pos = changed.pos;
      residue.neg = changed.neg;
      assert.deepEqual(residue, changed, "the caller retains a writable object");
      assert.deepEqual(certificate.step(seed)(2), record(3, 5));
      assert.deepEqual(oldStep(2), record(3, 5));
      assert.deepEqual(oldOrbit(2), record(3, 5));
      assert.deepEqual(certificate.orbit(2)(2), record(4, 6));
      assert.deepEqual(certificate.step(oldOrbit)(2), certificate.orbit(2)(2));
      assert.deepEqual(certificate.collapse(2), oldBounds);
      assert.deepEqual(oldBounds, { pointUnderRepresentative: record(2, 2), representativeUnderPoint: record() });
      assert.ok(Object.isFrozen(oldBounds));
      assert.ok(Object.isFrozen(oldBounds.pointUnderRepresentative));
      assert.ok(Object.isFrozen(oldBounds.representativeUnderPoint));
      assert.deepEqual(certificate.residue, record(1, 1));
      assert.equal(certificate.parameters.residue, certificate.residue);
      assert.equal(carrier.value.residue, certificate.residue);
      assert.equal(carrier.certificate, certificate);
      assert.deepEqual(carrier.orbit[1].value(2), certificate.orbit(1)(2));
      assert.equal(carrier.search.kind, "ordinal.closure.certificateSearch:witness");
      assert.equal(spotCheckCertificate(certificate, options).kind, witness);
      assert.equal(closeByCertificate(certificate, options).kind, "ordinal.closure.carrier");
    });
  }

  test(`${construct.name}: all exposed residue aliases are the same frozen own-data snapshot`, () => {
    const residue = { pos: 2, neg: 1 };
    const certificate = construct(declaration, { residue, seed });
    const carrier = closeByCertificate(certificate, options);
    for (const alias of [certificate.residue, certificate.parameters.residue, carrier.value.residue]) {
      assert.notEqual(alias, residue);
      assert.equal(alias, certificate.residue);
      assert.ok(Object.isFrozen(alias));
      for (const key of ["pos", "neg"]) {
        const descriptor = Object.getOwnPropertyDescriptor(alias, key);
        assert.equal(descriptor.value, residue[key]);
        assert.equal(descriptor.writable, false);
        assert.equal(Object.hasOwn(descriptor, "get"), false);
        assert.equal(Reflect.set(alias, key, -1), false);
      }
    }
    assert.deepEqual(certificate.orbit(1)(0), record(2, 1));
    assert.equal(Object.isFrozen(residue), false);
  });

  test(`${construct.name}: consumed parameter and coordinate getters are captured exactly once`, () => {
    const reads = { residue: 0, seed: 0, pos: 0, neg: 0 };
    const residue = {
      get pos() { return ++reads.pos === 1 ? 2 : -1; },
      get neg() { return ++reads.neg === 1 ? 1 : Number.MAX_SAFE_INTEGER + 1; },
    };
    const parameters = {
      get residue() { return ++reads.residue === 1 ? residue : { pos: -1, neg: -1 }; },
      get seed() { return ++reads.seed === 1 ? seed : null; },
    };
    const certificate = construct(declaration, parameters);
    assert.equal(certificate.kind, "ordinal.closure.germCertificate");
    assert.deepEqual(reads, { residue: 1, seed: 1, pos: 1, neg: 1 });
    assert.equal(certificate.parameters.seed, seed);
    assert.equal(certificate.representative, seed);
    assert.equal(certificate.residue, certificate.parameters.residue);
    assert.deepEqual(certificate.residue, record(2, 1));
    assert.deepEqual(certificate.step(seed)(2), record(4, 5));
    assert.deepEqual(certificate.orbit(2)(2), record(6, 6));
    assert.deepEqual(certificate.collapse(2).pointUnderRepresentative, record(4, 2));
    assert.equal(closeByCertificate(certificate, options).kind, "ordinal.closure.carrier");
    assert.deepEqual(reads, { residue: 1, seed: 1, pos: 1, neg: 1 }, "later methods never consult the caller");
  });

  test(`${construct.name}: invalid first coordinate reads cannot become a valid later read or a default`, () => {
    for (const invalid of [undefined, -1, Number.MAX_SAFE_INTEGER + 1]) {
      for (const axis of ["pos", "neg"]) {
        let reads = 0;
        const residue = { pos: 1, neg: 1 };
        Object.defineProperty(residue, axis, { get() { return ++reads === 1 ? invalid : 1; } });
        const rejected = construct(declaration, { residue, seed });
        assert.equal(rejected.reason, "hypotheses-fail");
        assert.deepEqual(rejected.failed, ["residue-is-a-record"]);
        assert.equal(reads, 1);
        assert.equal(Object.hasOwn(rejected, "orbit"), false);
      }
    }
    for (const residue of [{ pos: 1 }, { neg: 1 }, {}]) {
      assert.deepEqual(construct(declaration, { residue, seed }).failed, ["residue-is-a-record"]);
    }
  });

  test(`${construct.name}: an invalid first seed read stays obstructed`, () => {
    let reads = 0;
    const rejected = construct(declaration, {
      residue: record(1, 0),
      get seed() { return ++reads === 1 ? undefined : seed; },
    });
    assert.deepEqual(rejected.failed, ["seed-is-a-record-sequence"]);
    assert.equal(reads, 1);
  });

  test(`${construct.name}: frozen and inherited accessors become owned scalar data`, () => {
    let pos = 1, neg = 2;
    const residue = Object.freeze(Object.create({ get pos() { return pos; }, get neg() { return neg; } }));
    const parameters = Object.create({ residue, seed });
    const certificate = construct(declaration, parameters);
    pos = 0; neg = -1;
    assert.deepEqual(certificate.residue, record(1, 2));
    assert.ok(Object.hasOwn(certificate.residue, "pos"));
    assert.ok(Object.hasOwn(certificate.residue, "neg"));
    assert.equal(certificate.parameters.seed, seed);
    assert.deepEqual(certificate.orbit(2)(0), record(2, 4));
  });

  test(`${construct.name}: unrelated enumerable metadata stays shallow without recapturing consumed values`, () => {
    const key = Symbol("source");
    const metadata = { note: "original" };
    let metadataReads = 0;
    const parameters = { residue: { pos: 1, neg: 0 }, seed, [key]: "synthetic", get metadata() { metadataReads++; return metadata; } };
    const certificate = construct(declaration, parameters);
    assert.equal(metadataReads, 1);
    assert.equal(certificate.parameters[key], "synthetic");
    assert.equal(certificate.parameters.metadata, metadata);
    metadata.note = "changed";
    parameters.residue = record(0, 5);
    parameters.seed = () => record(10, 10);
    assert.equal(certificate.parameters.metadata.note, "changed");
    assert.equal(Object.isFrozen(metadata), false);
    assert.ok(Object.isFrozen(certificate.parameters));
    assert.equal(certificate.parameters.seed, seed);
    assert.deepEqual(certificate.orbit(1)(0), record(1, 0));
  });
}

test("unknown declarations and shape mismatches refuse before reading parameter getters", () => {
  const poison = { get residue() { throw new Error("must not read residue"); }, get seed() { throw new Error("must not read seed"); } };
  assert.equal(germCertificate("unknown", poison).reason, "not-a-certified-declaration");
  assert.equal(certificateOf("unknown", poison).reason, "not-a-certified-declaration");
  assert.equal(germCertificate("Obsmetrologia.omega_ahead", poison).reason, "declaration-is-ahead-shaped");
  assert.equal(aheadCertificate(declaration, poison).reason, "declaration-is-germ-shaped");
});

test("ahead certificates preserve their completion, callable behavior and shallow metadata", () => {
  const metadata = {};
  for (const construct of [aheadCertificate, certificateOf]) {
    const certificate = construct("Obsmetrologia.omega_ahead", { metadata });
    assert.equal(certificate.parameters.metadata, metadata);
    assert.equal(Object.isFrozen(metadata), false);
    assert.equal(certificate.limit.pos, null);
    assert.deepEqual(certificate.step(certificate.orbit(2)), certificate.orbit(3));
    assert.equal(spotCheckCertificate(certificate, options).kind, witness);
    assert.equal(closeByCertificate(certificate, options).search.shape, "ahead");
  }
});

test("an immutable residue does not establish all-index seed conformance", () => {
  const certificate = germCertificate(declaration, { residue: record(1, 0), seed: (n) => n < 3 ? record() : { pos: -2, neg: 0 } });
  assert.equal(spotCheckCertificate(certificate, options).kind, witness);
  assert.throws(() => spotCheckCertificate(certificate, { stages: 3, width: 4 }), /a tally is a natural number/);
});

// Independent V1 review exposed eager metadata access before hypothesis refusal.
for (const construct of [germCertificate, certificateOf]) {
  for (const [label, residue, sequence, failed] of [
    ["missing coordinate", { pos: 1 }, seed, ["residue-is-a-record"]],
    ["negative coordinate", { pos: -1, neg: 1 }, seed, ["residue-is-a-record"]],
    ["zero residue", { pos: 0, neg: 0 }, seed, ["residue-ne-kBot"]],
    ["invalid seed", { pos: 1, neg: 0 }, null, ["seed-is-a-record-sequence"]],
  ]) {
    test(`${construct.name}: ${label} rejects before unrelated metadata access`, () => {
      let reads = 0;
      const rejected = construct(declaration, {
        residue, seed: sequence,
        get metadata() { reads++; throw new Error("must not read unrelated metadata on rejection"); },
      });
      assert.equal(rejected.reason, "hypotheses-fail");
      assert.deepEqual(rejected.failed, failed);
      assert.equal(reads, 0);
    });
  }

  test(`${construct.name}: rejection does not enumerate unrelated metadata`, () => {
    let keys = 0;
    const input = new Proxy({ residue: { pos: -1, neg: 0 }, seed }, {
      ownKeys() { keys++; throw new Error("must not enumerate unrelated metadata on rejection"); },
    });
    assert.deepEqual(construct(declaration, input).failed, ["residue-is-a-record"]);
    assert.equal(keys, 0);
  });

  test(`${construct.name}: admitted metadata getters cannot change the captured validated dynamic`, () => {
    const residue = { pos: 2, neg: 1 };
    let sequence = seed;
    const reads = { residue: 0, seed: 0, metadata: 0 };
    const metadata = {};
    const input = {
      get residue() { reads.residue++; return residue; },
      get seed() { reads.seed++; return sequence; },
      get metadata() {
        reads.metadata++;
        residue.pos = -1;
        sequence = null;
        return metadata;
      },
    };
    const certificate = construct(declaration, input);
    assert.equal(certificate.kind, "ordinal.closure.germCertificate");
    assert.deepEqual(reads, { residue: 1, seed: 1, metadata: 1 });
    assert.equal(certificate.parameters.metadata, metadata);
    assert.equal(certificate.parameters.seed, seed);
    assert.equal(certificate.representative, seed);
    assert.deepEqual(certificate.residue, record(2, 1));
    assert.equal(certificate.residue, certificate.parameters.residue);
    assert.deepEqual(certificate.step(seed)(0), record(2, 1));
    assert.deepEqual(certificate.orbit(2)(0), record(4, 2));
    assert.equal(closeByCertificate(certificate, options).kind, "ordinal.closure.carrier");
  });

  test(`${construct.name}: admitted metadata copying preserves own __proto__ and symbol data safely`, () => {
    const key = Symbol("source");
    const marker = { synthetic: true };
    const input = { residue: record(1, 0), seed, ["__proto__"]: marker, [key]: marker };
    Object.defineProperty(input, "hidden", { get() { throw new Error("nonenumerable metadata is not copied"); } });
    const certificate = construct(declaration, input);
    assert.equal(Object.getPrototypeOf(certificate.parameters), Object.prototype);
    assert.ok(Object.hasOwn(certificate.parameters, "__proto__"));
    assert.equal(certificate.parameters.__proto__, marker);
    assert.equal(certificate.parameters[key], marker);
    assert.equal(Object.hasOwn(certificate.parameters, "hidden"), false);
    assert.ok(Object.isFrozen(certificate.parameters));
  });
}
