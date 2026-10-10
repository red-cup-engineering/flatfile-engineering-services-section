import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CSL_TYPES,
  admitCslItem,
  bareDoi,
  cslDate,
  cslDateFromDateParts,
  cslDateFromIsoString,
  cslDateFromPubmedString,
  cslName,
  cslNames,
  isCslType,
  isValidCslName,
  issuedYear,
  nameFromString,
  nameToString,
  normalizeTitle,
  recognizeCslItem,
  stripUndefinedCslFields,
  toCslType,
} from "../src/csl-json.mjs";

// ----- vocabulary -----

test("CSL_TYPES is the CSL 1.0.2 item type list and isCslType reads it", () => {
  assert.equal(CSL_TYPES.length, 45);
  assert.ok(isCslType("article-journal"));
  assert.ok(isCslType("article"));
  assert.ok(isCslType("legal_case"));
  assert.equal(isCslType("blog-thing"), false);
});

test("toCslType consults the source's alias table before the CSL vocabulary", () => {
  // "article" IS a CSL 1.0.2 type, but OpenAlex means "journal article" by it;
  // alias-first is what makes the source's own sense win.
  assert.equal(toCslType("article", { article: "article-journal" }), "article-journal");
  assert.equal(toCslType("article", {}), "article");
});

test("toCslType passes an unaliased CSL type through and falls back to document otherwise", () => {
  assert.equal(toCslType("thesis", { book: "book" }), "thesis");
  assert.equal(toCslType("not-a-type", {}), "document");
  assert.equal(toCslType(undefined, {}), "document");
});

test("toCslType lowercases the raw type word before resolving it", () => {
  assert.equal(toCslType("Journal-Article", { "journal-article": "article-journal" }), "article-journal");
});

// ----- names -----

test("cslName prefers structured family/given over a literal", () => {
  assert.deepEqual(cslName({ literal: "Yann LeCun", family: "LeCun", given: "Yann" }), { family: "LeCun", given: "Yann" });
});

test("cslName falls back to literal when no family/given given", () => {
  assert.deepEqual(cslName({ literal: "Yann LeCun" }), { literal: "Yann LeCun" });
});

test("cslName returns undefined for an empty input", () => {
  assert.equal(cslName({}), undefined);
});

test("cslNames lifts display strings and records alike, dropping the unusable", () => {
  assert.deepEqual(cslNames(["Ada Lovelace", { family: "Hopper", given: "Grace" }, {}, 7]), [
    { literal: "Ada Lovelace" },
    { family: "Hopper", given: "Grace" },
  ]);
  assert.equal(cslNames([]), undefined);
  assert.equal(cslNames("not an array"), undefined);
});

test("nameFromString / nameToString round-trip a simple given-family name", () => {
  const name = nameFromString("Roger Caillois");
  assert.deepEqual(name, { family: "Caillois", given: "Roger" });
  assert.equal(nameToString(name), "Roger Caillois");
});

test("nameFromString treats an institutional phrase as a literal", () => {
  const name = nameFromString("World Health Organization");
  assert.deepEqual(name, { literal: "World Health Organization" });
  assert.equal(nameToString(name), "World Health Organization");
});

test("nameFromString splits a \"Family, Given\" string", () => {
  assert.deepEqual(nameFromString("Caillois, Roger"), { family: "Caillois", given: "Roger" });
});

test("isValidCslName accepts a family or a literal and nothing else", () => {
  assert.ok(isValidCslName({ family: "Hopper" }));
  assert.ok(isValidCslName({ literal: "WHATWG" }));
  assert.equal(isValidCslName({ given: "Grace" }), false);
  assert.equal(isValidCslName(null), false);
});

test("nameToString throws on a name object carrying neither family nor literal", () => {
  assert.throws(() => nameToString({ given: "Grace" }), TypeError);
});

// ----- dates -----

test("cslDate builds a date-parts array, omitting absent parts", () => {
  assert.deepEqual(cslDate(2015, 5), { "date-parts": [[2015, 5]] });
  assert.deepEqual(cslDate(1958), { "date-parts": [[1958]] });
});

test("cslDate returns undefined for a non-integer year", () => {
  assert.equal(cslDate(undefined), undefined);
});

test("cslDateFromIsoString parses YYYY-MM-DD, a bare year, and refuses garbage", () => {
  assert.deepEqual(cslDateFromIsoString("2015-05-26"), { "date-parts": [[2015, 5, 26]] });
  assert.deepEqual(cslDateFromIsoString("2015"), { "date-parts": [[2015]] });
  assert.equal(cslDateFromIsoString("not a date"), undefined);
});

test("cslDateFromPubmedString parses \"YYYY Mon D\" and \"YYYY Mon\"", () => {
  assert.deepEqual(cslDateFromPubmedString("2026 Sep 1"), { "date-parts": [[2026, 9, 1]] });
  assert.deepEqual(cslDateFromPubmedString("2026 Sep"), { "date-parts": [[2026, 9]] });
});

test("cslDateFromDateParts takes the first tuple and refuses a non-array", () => {
  assert.deepEqual(cslDateFromDateParts([[2015, 5, 27]]), { "date-parts": [[2015, 5, 27]] });
  assert.equal(cslDateFromDateParts(undefined), undefined);
});

test("issuedYear reads a year back, and reports null when it cannot", () => {
  assert.equal(issuedYear(cslDate(1958)), 1958);
  assert.equal(issuedYear({ season: "Spring" }), null);
  assert.equal(issuedYear(null), null);
});

// ----- identity -----

test("bareDoi strips https://doi.org/, dx.doi.org, and doi: prefixes", () => {
  assert.equal(bareDoi("https://doi.org/10.1038/nature14539"), "10.1038/nature14539");
  assert.equal(bareDoi("http://dx.doi.org/10.1038/nature14539"), "10.1038/nature14539");
  assert.equal(bareDoi("doi:10.1038/nature14539"), "10.1038/nature14539");
  assert.equal(bareDoi("10.1038/nature14539"), "10.1038/nature14539");
  assert.equal(bareDoi(""), undefined);
});

test("normalizeTitle folds case, punctuation, and diacritics to one comparison form", () => {
  assert.equal(normalizeTitle("Les jeux et les hommes"), "les jeux et les hommes");
  assert.equal(normalizeTitle("Deep Learning: A Review!"), "deep learning a review");
  // the fold is compatibility-decomposed, so an accented title matches its ASCII twin
  assert.equal(normalizeTitle("Über Müller's Lemma"), normalizeTitle("Uber Muller's Lemma"));
  assert.equal(normalizeTitle(null), "");
  assert.equal(normalizeTitle("   "), "");
});

// ----- admission -----

test("recognizeCslItem refuses an item missing required fields", () => {
  const r = recognizeCslItem({ type: "book" });
  assert.equal(r.admitted, false);
  const paths = r.findings.map((f) => f.path);
  assert.ok(paths.includes(".id"));
  assert.ok(paths.includes(".title"));
  assert.ok(paths.includes(".issued"));
});

test("recognizeCslItem refuses an unknown CSL type", () => {
  const r = recognizeCslItem({ id: "a2020", type: "blog-thing", title: "x", issued: { "date-parts": [[2020]] }, author: [{ family: "A" }] });
  assert.equal(r.admitted, false);
  assert.ok(r.findings.some((f) => f.message.includes("not a CSL 1.0.2 type")));
});

test("recognizeCslItem refuses a non-object and an array", () => {
  assert.equal(recognizeCslItem(null).admitted, false);
  assert.equal(recognizeCslItem([]).admitted, false);
});

test("admitCslItem throws with .findings when refused", () => {
  try {
    admitCslItem({ type: "book" });
    assert.fail("expected admitCslItem to throw");
  } catch (error) {
    assert.ok(Array.isArray(error.findings));
    assert.ok(error.findings.length > 0);
  }
});

test("admitCslItem admits a CrossRef-shaped CSL item (open vocabulary: volume/issue/page tolerated)", () => {
  const crossrefItem = {
    id: "10.1038/s41567-019-0732-0",
    type: "article-journal",
    title: "The ergodicity problem in economics",
    author: [{ family: "Peters", given: "Ole" }],
    "container-title": "Nature Physics",
    publisher: "Springer Science and Business Media LLC",
    volume: "15",
    issue: "12",
    page: "1216-1221",
    issued: { "date-parts": [[2019, 12, 2]] },
    DOI: "10.1038/s41567-019-0732-0",
    URL: "https://doi.org/10.1038/s41567-019-0732-0",
  };
  const r = recognizeCslItem(crossrefItem);
  assert.deepEqual(r.findings, []);
  assert.equal(r.admitted, true);
  assert.equal(admitCslItem(crossrefItem).volume, "15");
});

test("admitCslItem admits an OpenAlex-shaped CSL item", () => {
  const openAlexItem = {
    id: "W123456789",
    type: "article-journal",
    title: "Some Work",
    author: [{ literal: "Jane Q. Researcher" }],
    "container-title": "Journal of Examples",
    issued: { "date-parts": [[2021]] },
    DOI: "10.9999/xyz",
  };
  assert.equal(admitCslItem(openAlexItem).id, "W123456789");
});

// ----- coercions -----

test("stripUndefinedCslFields drops undefined-valued keys and keeps every other value", () => {
  assert.deepEqual(stripUndefinedCslFields({ a: 1, b: undefined, c: null, d: "" }), { a: 1, c: null, d: "" });
});
