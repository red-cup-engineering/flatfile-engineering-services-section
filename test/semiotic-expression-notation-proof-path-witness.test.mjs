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
