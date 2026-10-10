import assert from "node:assert/strict";
import { test } from "node:test";
import { fromCslItem as formatCslItem, toCslItem as formatReferenceEntry } from "../src/csl-record-formatting.mjs";

function admitReferenceEntry(citekey, entry) {
  if (!/^[a-z][a-z0-9-]*[0-9]{4}[a-z0-9-]*$/u.test(citekey)) throw new TypeError("invalid citekey");
  if (!Array.isArray(entry?.authors) || entry.authors.length === 0 || typeof entry.title !== "string" || !Number.isInteger(entry.year)) {
    throw new TypeError("invalid reference entry");
  }
  return Object.freeze({ ...entry, authors: Object.freeze([...entry.authors]) });
}

const fromCslItem = (item, options = {}) => formatCslItem(item, { ...options, admitReferenceEntry });
const toCslItem = (citekey, entry) => formatReferenceEntry(citekey, entry, { admitReferenceEntry });

test("fromCslItem converts a well-formed article-journal CSL item to a house entry", () => {
  const { citekey, entry } = fromCslItem({
    id: "caillois1958",
    type: "article-journal",
    title: "Les jeux et les hommes",
    author: [{ family: "Caillois", given: "Roger" }],
    issued: { "date-parts": [[1958]] },
    "container-title": "Diogenes",
    DOI: "10.1234/abcd",
    URL: "https://example.org/x",
    note: "translated",
  });
  assert.equal(citekey, "caillois1958");
  assert.deepEqual(entry.authors, ["Roger Caillois"]);
  assert.equal(entry.title, "Les jeux et les hommes");
  assert.equal(entry.year, 1958);
  assert.equal(entry.publication, "Diogenes");
  assert.equal(entry.doi, "10.1234/abcd");
  assert.equal(entry.url, "https://example.org/x");
  assert.equal(entry.note, "translated");
  // every entry fromCslItem produces must itself admit under the house contract
  assert.deepEqual(admitReferenceEntry(citekey, entry), entry);
});

test("fromCslItem accepts a literal-only (institutional) author", () => {
  const { entry } = fromCslItem({
    id: "whatwg2020",
    type: "webpage",
    title: "HTML Living Standard",
    author: [{ literal: "WHATWG" }],
    issued: { "date-parts": [[2020]] },
  });
  assert.deepEqual(entry.authors, ["WHATWG"]);
});

test("fromCslItem falls back to editor when author is absent", () => {
  const { entry } = fromCslItem({
    id: "reidel1977",
    type: "book",
    title: "Modern Uses of Multiple-Valued Logic",
    editor: [{ family: "Dunn", given: "J. Michael" }],
    issued: { "date-parts": [[1977]] },
  });
  assert.deepEqual(entry.authors, ["J. Michael Dunn"]);
});

test("toCslItem infers article-journal when publication is set", () => {
  const item = toCslItem("caillois1958", { authors: ["Roger Caillois"], title: "Les jeux et les hommes", year: 1958, publication: "Diogenes" });
  assert.equal(item.type, "article-journal");
  assert.equal(item["container-title"], "Diogenes");
  assert.deepEqual(item.author, [{ family: "Caillois", given: "Roger" }]);
  assert.deepEqual(item.issued, { "date-parts": [[1958]] });
});

test("toCslItem infers book when publisher is set and publication is not", () => {
  const item = toCslItem("euler1736", { authors: ["Leonhard Euler"], title: "Solutio problematis", year: 1736, publisher: "Petropolitanae" });
  assert.equal(item.type, "book");
  assert.equal(item.publisher, "Petropolitanae");
});

test("toCslItem infers document when neither publication nor publisher is set", () => {
  const item = toCslItem("smith2020", { authors: ["Jane Smith"], title: "An Unpublished Note", year: 2020 });
  assert.equal(item.type, "document");
});

test("house entry -> CSL item -> house entry is identity on admitted fields", () => {
  const original = admitReferenceEntry("caillois1958", {
    authors: ["Roger Caillois"],
    title: "Les jeux et les hommes",
    year: 1958,
    publication: "Diogenes",
    doi: "10.1234/abcd",
    url: "https://example.org/x",
    note: "a note",
  });
  const item = toCslItem("caillois1958", original);
  const { citekey, entry: roundTripped } = fromCslItem(item);
  assert.equal(citekey, "caillois1958");
  assert.deepEqual(roundTripped, original);
});

// ----- fromCslItem: citekey minting for a non-house `id` -----

test("fromCslItem mints a citekey from a CrossRef-shaped item whose id is a bare DOI", () => {
  // Shape mirrors crossrefWorkToCsl: id and DOI both carry the bare DOI.
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
    URL: "http://dx.doi.org/10.1038/s41567-019-0732-0",
  };
  const { citekey, entry } = fromCslItem(crossrefItem);
  assert.equal(citekey, "peters2019");
  assert.equal(entry.doi, "10.1038/s41567-019-0732-0");
  // the DOI already has a home in entry.doi, so it is not also stuffed into note
  assert.equal(entry.note, undefined);
  assert.deepEqual(admitReferenceEntry(citekey, entry), entry);
});

test("fromCslItem mints a citekey from an OpenAlex-shaped item and preserves the source id in note (no other home for it)", () => {
  const openAlexItem = {
    id: "W123456789",
    type: "article-journal",
    title: "Some Work",
    author: [{ literal: "Jane Q. Researcher" }],
    "container-title": "Journal of Examples",
    issued: { "date-parts": [[2021]] },
  };
  const { citekey, entry } = fromCslItem(openAlexItem);
  assert.equal(entry.doi, undefined);
  assert.equal(entry.note, "source id: W123456789");
  assert.deepEqual(admitReferenceEntry(citekey, entry), entry);
});

test("fromCslItem mints a citekey when id is entirely absent", () => {
  const { citekey, entry } = fromCslItem({
    type: "book",
    title: "A Book With No Id",
    author: [{ family: "Nobody", given: "N." }],
    issued: { "date-parts": [[2022]] },
  });
  assert.equal(citekey, "nobody2022");
  assert.equal(entry.note, undefined);
});

test("two items minting the same base citekey within one batch are disambiguated with letter suffixes", () => {
  const taken = new Set();
  const a = { id: "10.1/xxx", type: "book", title: "Book A", author: [{ family: "Smith", given: "J." }], issued: { "date-parts": [[2020]] } };
  const b = { id: "10.2/yyy", type: "book", title: "Book B", author: [{ family: "Smith", given: "K." }], issued: { "date-parts": [[2020]] } };
  const first = fromCslItem(a, { taken });
  const second = fromCslItem(b, { taken });
  assert.equal(first.citekey, "smith2020");
  assert.equal(second.citekey, "smith2020a");
  assert.notEqual(first.citekey, second.citekey);
});

test("fromCslItem refuses with a clear message when the item has no author or editor and needs a minted citekey", () => {
  assert.throws(
    () => fromCslItem({ id: "10.3/zzz", type: "book", title: "No Author", issued: { "date-parts": [[2020]] } }),
    /no author or editor/,
  );
});

test("fromCslItem refuses with a clear message when the item has no resolvable issued year and needs a minted citekey", () => {
  assert.throws(
    () => fromCslItem({ id: "10.4/aaa", type: "book", title: "No Year", author: [{ family: "Nobody" }], issued: { season: "Spring" } }),
    /no resolvable issued year/,
  );
});

test("fromCslItem still uses id as-is when it is already a house citekey (unaffected by minting)", () => {
  const { citekey, entry } = fromCslItem({
    id: "caillois1958",
    type: "book",
    title: "Les jeux et les hommes",
    author: [{ family: "Caillois", given: "Roger" }],
    issued: { "date-parts": [[1958]] },
  });
  assert.equal(citekey, "caillois1958");
  assert.equal(entry.note, undefined);
});
