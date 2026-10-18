import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { addressContent } from "@red-cup-engineering/semiotic-content-address/raw-content-address";
import { canonicalCarrier, semanticId, semanticBytes } from "@red-cup-engineering/semiotic-content-address";

test("Data consumes the one canonical SCA from its own package", () => {
  const triple = canonicalCarrier({ subject: "mark", predicate: "utters", object: "café" });
  const bytes = semanticBytes(triple);
  assert.equal(semanticId(triple), makeNiUri(bytes));
  assert.equal(semanticId({ subject: "mark", predicate: "utters", object: "café" }), semanticId(triple));
  assert.equal(addressContent(bytes).ni, makeNiUri(bytes));
});

test("the Data manifest depends on the SCA package and does not export or ship its source", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.exports["./semiotic-content-address"], undefined);
  assert.equal(pkg.exports["./raw-content-address"], undefined);
  assert.equal(pkg.dependencies["@red-cup-engineering/semiotic-content-address"], "0.1.0");
  assert.equal(pkg.dependencies["@red-cup-engineering/computer-content-address-engineering-services-section"], undefined);
  for (const target of JSON.stringify(pkg.exports).match(/"\.\/[^"]+"/gu) ?? []) assert.ok(!target.includes("/lib/"), target);
});
