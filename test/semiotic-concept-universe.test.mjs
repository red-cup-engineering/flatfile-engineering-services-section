import assert from "node:assert/strict";
import test from "node:test";
import { createSemioticConceptUniverse, differentiateSemioticConceptUniverses, selectSemioticConceptPublication } from "@red-cup-engineering/signcell/semiotic-concept-universe";

test("concept universes preserve aliases, provenance, unresolved references, and publication selection", () => {
  const result = createSemioticConceptUniverse({ concepts: [
    { id: "beta", title: "Beta", body: "# Beta", tags: ["b"], sameAs: ["alpha"], publication: { channels: ["web"], status: "draft" }, annotations: [{ kind: "reference", target: "missing", provenance: { carrier: "beta.md" } }] },
    { id: "gamma", title: "Gamma", body: "# Gamma", tags: ["g"], annotations: [{ kind: "reference", target: "beta" }] },
  ] });
  assert.equal(result.ok, true);
  assert.equal(result.value.content.version,2);
  assert.equal(Object.hasOwn(result.value.content,"equivalenceClasses"),false);
  const identity = result.value.content.references.find(ref => ref.relation === "claimed-identity");
  assert.deepEqual([identity.source,identity.target,identity.status],
    ["beta","alpha","unresolved-identity"]);
  assert.equal(result.value.content.references.find(({ requestedTarget }) => requestedTarget === "beta").target, "beta");
  assert.ok(result.value.content.diagnostics.some(({code})=>code==="unresolved-identity"));
  assert.ok(result.value.content.diagnostics.some(({code})=>code==="unresolved-reference"));
  const published = selectSemioticConceptPublication(result.value, { channels: ["web"] });
  assert.deepEqual(published.map(({ id }) => id), ["beta"]);
  assert.deepEqual(published[0].claimedAliases,["alpha"]);
  assert.equal(published[0].concepts[0].annotations[0].provenance.carrier, "beta.md");
});

test("universe delta names only changes in the retained carrier", () => {
  const before = createSemioticConceptUniverse({ concepts: [{ id: "a", title: "A", body: "A" }] }).value;
  const after = createSemioticConceptUniverse({ concepts: [{ id: "a", title: "A changed", body: "A" }, { id: "b", title: "B", body: "B" }] }).value;
  const delta = differentiateSemioticConceptUniverses(before, after);
  assert.deepEqual(delta.concepts.added, ["b"]);
  assert.deepEqual(delta.concepts.changed, ["a"]);
});
