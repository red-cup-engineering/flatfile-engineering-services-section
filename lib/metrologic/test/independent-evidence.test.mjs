// Fregean claim × independent evidence => FOUR => Chu: the worked example of
// Obsmetrologia.Language.Predicating.FregeanFourChu, folded by the EAVT section and presented by
// sectionSpace on SignChain's Chu space.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foldIndependentEvidence, independentEvidenceRow } from "@red-cup-engineering/eavt-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { settleRow } from "../src/chu.mjs";
import { sectionSpace } from "../src/articulation/predicating/positing/independent-evidence.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/fregean-four-chu.json", import.meta.url), "utf8"));
const rows = fixture.evidence.map(({ claim, ...evidence }) => independentEvidenceRow({ ...fixture.claims[claim], ...evidence }));
const folded = foldIndependentEvidence({ subject: fixture.subject, claims: fixture.claims, rows });
const sides = (object) => {
  const { pos, neg } = folded.fiber.find((cell) => cell.predicate === "has-standing" && cell.object === object).value;
  return `${pos}${neg}`;
};

test("independent evidence keeps the four oriented claims at their four evidence states", () => {
  assert.equal(folded.fiber.length, 4);
  assert.deepEqual(["neither", "for", "against", "both"].map(sides), ["00", "10", "01", "11"]);
  assert.ok(rows.every((row) => row.e === fixture.subject && row.a === "has-standing"));
});

test("the Chu presentation settles each claim row to its reading, witnesses as states", () => {
  const { space } = sectionSpace(folded, rows);
  const point = (object) => canonicalJson(["has-standing", object]);
  assert.deepEqual(["neither", "for", "against", "both"].map((object) => settleRow(space, point(object))),
    ["absurd", "potential", "active", "stable"]);
});
