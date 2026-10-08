import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openAlexWorkToCsl } from "../scripts/project-openalex-work-csl.mjs";
import { pubmedSummaryToCsl } from "../scripts/project-pubmed-summary-csl.mjs";
import { crossrefWorkToCsl } from "../scripts/project-crossref-work-csl.mjs";
import { recognizeCslItem } from "../src/csl-json.mjs";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

/** @returns {object} the parsed JSON fixture at fixtures/<name> */
function fixture(name) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf8"));
}

// ----- OpenAlex -----

test("openAlexWorkToCsl normalizes a real OpenAlex work record", () => {
  const item = openAlexWorkToCsl(fixture("openalex-work-response.json"));
  assert.equal(item.id, "W2919115771");
  assert.equal(item.type, "article-journal");
  assert.equal(item.title, "Deep learning");
  assert.equal(item.DOI, "10.1038/nature14539");
  assert.equal(item["container-title"], "Nature");
  assert.equal(item.volume, "521");
  assert.equal(item.issue, "7553");
  assert.equal(item.page, "436-444");
  assert.deepEqual(item.issued, { "date-parts": [[2015, 5, 26]] });
  assert.ok(item.author.length > 0);
  assert.equal(item.author[0].literal, "Yann LeCun");
});

test("openAlexWorkToCsl reads OpenAlex's \"article\" in OpenAlex's sense, not CSL's", () => {
  // Regression guard on the alias-first rule in toCslType: "article" is itself
  // a CSL 1.0.2 type, but OpenAlex uses it to mean a journal article.
  const item = openAlexWorkToCsl({ id: "W1", title: "x", type: "article" });
  assert.equal(item.type, "article-journal");
});

test("openAlexWorkToCsl throws on a non-object", () => {
  assert.throws(() => openAlexWorkToCsl(null), TypeError);
});

test("openAlexWorkToCsl throws when neither id nor title is present", () => {
  assert.throws(() => openAlexWorkToCsl({ type: "article" }), /neither an id nor a title/);
});

// ----- PubMed -----

test("pubmedSummaryToCsl normalizes a real PubMed esummary record", () => {
  const summary = fixture("pubmed-esummary-response.json").result["42678998"];
  const item = pubmedSummaryToCsl(summary);
  assert.equal(item.id, "42678998");
  assert.equal(item.type, "article-journal");
  assert.match(item.title, /TRAF6-Akt/);
  assert.equal(item.DOI, "10.1371/journal.ppat.1014557");
  assert.equal(item["container-title"], "PLoS pathogens");
  assert.equal(item.volume, "22");
  assert.equal(item.issue, "9");
  assert.deepEqual(item.issued, { "date-parts": [[2026, 9, 1]] });
  assert.equal(item.URL, "https://pubmed.ncbi.nlm.nih.gov/42678998");
  assert.ok(item.author.length > 0);
});

test("pubmedSummaryToCsl throws on a non-object", () => {
  assert.throws(() => pubmedSummaryToCsl("nope"), TypeError);
});

test("pubmedSummaryToCsl throws when uid is missing", () => {
  assert.throws(() => pubmedSummaryToCsl({ title: "x" }), /no uid/);
});

// ----- CrossRef -----

test("crossrefWorkToCsl normalizes a real CrossRef work record", () => {
  const item = crossrefWorkToCsl(fixture("crossref-work-response.json").message);
  assert.equal(item.id, "10.1038/nature14539");
  assert.equal(item.type, "article-journal");
  assert.equal(item.title, "Deep learning");
  assert.equal(item["container-title"], "Nature");
  assert.equal(item.publisher, "Springer Science and Business Media LLC");
  assert.equal(item.volume, "521");
  assert.equal(item.issue, "7553");
  assert.equal(item.page, "436-444");
  assert.deepEqual(item.issued, { "date-parts": [[2015, 5, 27]] });
  assert.deepEqual(item.author[0], { family: "LeCun", given: "Yann" });
});

test("crossrefWorkToCsl throws on a non-object", () => {
  assert.throws(() => crossrefWorkToCsl(undefined), TypeError);
});

test("crossrefWorkToCsl throws when DOI is missing", () => {
  assert.throws(() => crossrefWorkToCsl({ title: ["x"] }), /no DOI/);
});

test("crossrefWorkToCsl passes a CSL 1.0.2 type it has no alias for straight through", () => {
  // Widened vocabulary: the pre-consolidation projection folded every type
  // outside its own 29-entry subset to "document"; a real CSL type now keeps
  // its own meaning.
  const item = crossrefWorkToCsl({ DOI: "10.1/x", title: ["A Treaty"], type: "treaty" });
  assert.equal(item.type, "treaty");
});

// ----- the three agree on what a CSL item is -----

test("every projection emits an item the CSL-JSON admission recognizes as well-formed", () => {
  const items = [
    openAlexWorkToCsl(fixture("openalex-work-response.json")),
    pubmedSummaryToCsl(fixture("pubmed-esummary-response.json").result["42678998"]),
    crossrefWorkToCsl(fixture("crossref-work-response.json").message),
  ];
  for (const item of items) {
    assert.deepEqual(recognizeCslItem(item).findings, [], `findings for ${item.id}`);
  }
});
