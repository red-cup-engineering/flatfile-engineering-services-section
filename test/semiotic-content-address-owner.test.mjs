import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { addressContent } from "@red-cup-engineering/computer-data-engineering-services-section/raw-content-address";
import { canonicalCarrier, semanticId, semanticBytes } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-content-address";

test("Data exposes one canonical SCA directly to external SignCell consumers", () => {
  const triple = canonicalCarrier({ subject: "mark", predicate: "utters", object: "café" });
  const bytes = semanticBytes(triple);
  assert.equal(semanticId(triple), makeNiUri(bytes));
  assert.equal(semanticId({ subject: "mark", predicate: "utters", object: "cafe\u0301" }), semanticId(triple));
  assert.equal(addressContent(bytes).ni, makeNiUri(bytes));
});

test("the Data manifest no longer selects the displaced stand-alone address producer", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.exports["./semiotic-content-address"], "./lib/semiotic-content-address/src/semiotic-content-address.mjs");
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-content-address-engineering-services-section"], undefined);
});
