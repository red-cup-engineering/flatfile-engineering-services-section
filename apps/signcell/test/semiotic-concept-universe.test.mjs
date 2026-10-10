import assert from "node:assert/strict";
import test from "node:test";
import {
  createSemioticConceptUniverse,
  differentiateSemioticConceptUniverses,
  selectSemioticConceptPublication,
  semioticConceptUniverseType,
} from "../src/semiotic-concept-universe.mjs";

const concept = (id, extra = {}) => ({ id, title: id, body: `${id} body`, ...extra });

test("a universe is one typed cell: identity classes unite sameAs, and references and failures become diagnostics", () => {
  const admitted = createSemioticConceptUniverse({ concepts: [
    concept("relation", { sameAs: ["relationing"], tags: ["b", "a", "a"], annotations: [{ kind: "reference", target: "sign" }, { kind: "reference", target: "missing" }] }),
    concept("relationing", { publication: { channels: ["site"], status: "Draft" } }),
    concept("sign", { annotations: [{ kind: "failure", reason: "unparsed" }] }),
  ] });
  assert.equal(admitted.ok, true);
  const universe = admitted.value;
  assert.equal(universe.kind, "sign.cell");
  assert.equal(universe.type, semioticConceptUniverseType.id);
  const { concepts, equivalenceClasses, references, diagnostics } = universe.content;
  assert.deepEqual(concepts.map(({ id }) => id), ["relation", "relationing", "sign"]);
  assert.deepEqual(concepts[0].tags, ["a", "b"]);
  assert.deepEqual(equivalenceClasses.map(({ representative, members }) => [representative, members]), [["relation", ["relation", "relationing"]], ["sign", ["sign"]]]);
  assert.deepEqual(references.map(({ target, status }) => [target, status]), [["missing", "unresolved"], ["sign", "resolved"]]);
  assert.deepEqual(diagnostics.map(({ code, concept: id }) => [code, id]), [["annotation-failure", "sign"], ["unresolved-reference", "relation"]]);
  assert.throws(() => createSemioticConceptUniverse({ concepts: [concept("a"), concept("a")] }), /unique/u);
  assert.throws(() => createSemioticConceptUniverse({ concepts: [concept("a", { annotations: [{ kind: "guess" }] })] }), /unsupported/u);
});

test("publication selects one record per identity class, filtered by channel and status", () => {
  const universe = createSemioticConceptUniverse({ concepts: [
    concept("relation", { sameAs: ["relationing"] }),
    concept("relationing", { publication: { channels: ["Site"], status: "Draft" } }),
    concept("hidden", { publication: { enabled: false, channels: ["site"] } }),
  ] }).value;
  const records = selectSemioticConceptPublication(universe, { channels: ["site"] });
  assert.deepEqual(records.map(({ id, aliases, channels }) => [id, aliases, channels]), [["relation", ["relationing"], ["site"]]]);
  assert.equal(records[0].title, "relation");
  assert.equal(selectSemioticConceptPublication(universe, { statuses: ["published"] }).length, 0);
  assert.throws(() => selectSemioticConceptPublication({ kind: "sign.cell", type: "other" }), TypeError);
});

test("differentiation names added, removed and changed concepts against a baseline", () => {
  const before = createSemioticConceptUniverse({ concepts: [concept("a"), concept("b")] }).value;
  const after = createSemioticConceptUniverse({ concepts: [concept("a", { body: "revised" }), concept("c")] }).value;
  const difference = differentiateSemioticConceptUniverses(before, after);
  assert.equal(difference.baselinePresent, true);
  assert.deepEqual(difference.concepts, { added: ["c"], removed: ["b"], changed: ["a"] });
  assert.equal(differentiateSemioticConceptUniverses(null, after).baselinePresent, false);
});
