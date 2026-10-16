import assert from "node:assert/strict";
import test from "node:test";
import { isNiUri, makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import {
  GENERATIVE_PROOF_PATH_PROFILE,
  PROOF_PATH_WITNESS_KIND,
  decodeSemanticEnvelope,
  identifyProofPathWitness,
  identifyProofPathedJsonSemanticContent,
} from "../src/semiotic-expression-notation/semantic-content-identity.mjs";

const structureRoot = makeNiUri(Buffer.from("generator-structure-v1", "utf8"));
const witness = (path) => identifyProofPathWitness({ structureRoot, sourceKey: "mark", targetKey: "claim", path, proofProfile: GENERATIVE_PROOF_PATH_PROFILE });

test("a proof-path witness binds the exact generative structure and route", () => {
  const proof = witness("mark/specialization/library/claim");
  assert.equal(isNiUri(proof.token), true);
  assert.equal(decodeSemanticEnvelope(proof.bytes, proof.token).envelope.objectKind, PROOF_PATH_WITNESS_KIND);

  const value = { payload: "same bytes, exact generating witness matters" };
  const content = identifyProofPathedJsonSemanticContent({ objectKind: "example.proof-pathed-content", value, proofPathWitnessRoot: proof.token });
  assert.equal(content.envelope.witnessRoot, proof.token);

  const changedProof = witness("mark/object-projection/library/claim");
  const changedContent = identifyProofPathedJsonSemanticContent({ objectKind: "example.proof-pathed-content", value, proofPathWitnessRoot: changedProof.token });
  assert.notEqual(changedProof.token, proof.token);
  assert.notEqual(changedContent.token, content.token);
});

test("a proof-path witness refuses untyped or noncanonical addressing material", () => {
  assert.throws(() => identifyProofPathWitness({ structureRoot: "sha256:deadbeef", sourceKey: "mark", targetKey: "claim", path: "mark/claim" }),
    (error) => error.code === "malformed-content-address");
  assert.throws(() => identifyProofPathWitness({ structureRoot, sourceKey: "", targetKey: "claim", path: "mark/claim" }),
    (error) => error.code === "malformed-proof-path-witness");
  assert.throws(() => identifyProofPathWitness({ structureRoot, sourceKey: "mark", targetKey: "claim", path: "mark/claim", proofProfile: "urn:other" }),
    (error) => error.code === "unsupported-proof-path-profile");
});


test("canonical typed path spellings bind both endpoints without claiming graph proof", () => {
  const escaped = identifyProofPathWitness({
    structureRoot,
    sourceKey: "a/b",
    targetKey: "..",
    path: "a~2fb/object-projection/library/~2e~2e",
  });
  assert.equal(isNiUri(escaped.token), true);
  // Syntax alone does not check that this generator edge is in structureRoot.
  const unverified = identifyProofPathWitness({
    structureRoot, sourceKey: "mark", targetKey: "unknown",
    path: "mark/converse/library/unknown",
  });
  assert.equal(isNiUri(unverified.token), true);
  const reflexive = identifyProofPathWitness({
    structureRoot, sourceKey: "mark", targetKey: "mark", path: "mark",
  });
  assert.equal(isNiUri(reflexive.token), true);
});

test("noncanonical or mismatched proof paths cannot mint witness identities", () => {
  const malformedPaths = [
    "mark/claim",
    "mark/specialization/claim",
    "mark/specialization/not-library/claim",
    "mark/unsupported/library/claim",
    "mark/specialization/library/claim/",
    "mark/specialization/library/claim//",
    "mark/specialization/library/cl~61im",
    "mark/specialization/library/cl~2Fim",
    "mark/specialization/library/cl%61im",
    "mark/specialization/library/cl~ffim",
    "./specialization/library/claim",
    "mark/specialization/library/claim/..",
  ];
  for (const path of malformedPaths) {
    assert.throws(
      () => identifyProofPathWitness({ structureRoot, sourceKey: "mark", targetKey: "claim", path }),
      (error) => error.code === "malformed-proof-path-witness",
      path,
    );
  }
  assert.throws(
    () => identifyProofPathWitness({
      structureRoot, sourceKey: "wrong", targetKey: "claim",
      path: "mark/specialization/library/claim",
    }),
    (error) => error.code === "malformed-proof-path-witness",
  );
  assert.throws(
    () => identifyProofPathWitness({
      structureRoot, sourceKey: "mark", targetKey: "wrong",
      path: "mark/specialization/library/claim",
    }),
    (error) => error.code === "malformed-proof-path-witness",
  );
});


test("exact Unicode proof endpoints never normalize to a different witness", () => {
  const canonical = identifyProofPathWitness({
    structureRoot, sourceKey: "é", targetKey: "Ω",
    path: "~c3~a9/converse/library/~ce~a9",
  });
  assert.equal(isNiUri(canonical.token), true);

  // Before admission hardened, this *succeeded*: sourceKey was silently
  // normalized from the decomposed key to the path's composed root.
  assert.throws(() => identifyProofPathWitness({
    structureRoot, sourceKey: "e\u0301", targetKey: "Ω",
    path: "~c3~a9/converse/library/~ce~a9",
  }), error => error.code === "malformed-proof-path-witness");
  assert.throws(() => identifyProofPathWitness({
    structureRoot, sourceKey: "mark", targetKey: "O\u0308",
    path: "mark/converse/library/~c3~96",
  }), error => error.code === "malformed-proof-path-witness");
  assert.throws(() => identifyProofPathWitness({
    structureRoot, sourceKey: "mark", targetKey: "claim",
    path: "mark/converse/library/cla\u0301im",
  }), error => error.code === "malformed-proof-path-witness");

  // A decomposed term whose bytes are explicitly encoded in the route must
  // also refuse rather than changing its meaning under semantic normalization.
  assert.throws(() => identifyProofPathWitness({
    structureRoot, sourceKey: "e\u0301", targetKey: "claim",
    path: "e~cc~81/converse/library/claim",
  }), error => error.code === "malformed-proof-path-witness");
});
