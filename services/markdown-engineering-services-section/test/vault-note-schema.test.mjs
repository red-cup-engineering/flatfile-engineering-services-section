import assert from "node:assert/strict";
import test from "node:test";

import {
  vaultNoteReadRequestContract,
  vaultNoteProjectionContract,
  vaultReadRequestContract,
  vaultQueryResultContract,
} from "../src/vault/note.mjs";
import {
  vaultWebsitePublishRequestContract,
  vaultWebsitePublishReceiptContract,
} from "../src/vault/website-publish.mjs";
import { diataxisAntipode, diataxisDoingDual, diataxisLookupDual, diataxisMode, diataxisModeNames, diataxisModeOfText, diataxisCoverageOfDocuments, diataxisReading } from "../src/vault/diataxis.mjs";
import {
  diataxisCoverageSurfaceContract,
  diataxisCoverageClassificationContract,
} from "../src/vault/diataxis-coverage-schema.mjs";

test("vaultNoteReadRequestContract admits a well-formed request and rejects a missing field", () => {
  const request = {
    kind: "metroplat.knowledge-vault.note-read-request",
    vaultRoot: "/tmp/vault",
    notePath: "notes/topic.md",
  };
  assert.deepEqual(vaultNoteReadRequestContract.assert(request), request);
  assert.equal(vaultNoteReadRequestContract.validate({ kind: "metroplat.knowledge-vault.note-read-request", vaultRoot: "/tmp/vault" }), false);
});

test("vaultNoteProjectionContract admits a full note projection", () => {
  const projection = {
    kind: "metroplat.knowledge-vault.note-projection",
    vaultRoot: "/tmp/vault",
    notePath: "notes/topic.md",
    title: "Topic",
    format: "none",
    conformant: true,
    frontmatter: {},
    body: "# Topic\n",
    assertionCount: 0,
    referenceDialect: "none",
    references: [],
    internalTargets: [],
    citedReferenceIds: [],
  };
  assert.deepEqual(vaultNoteProjectionContract.assert(projection), projection);
});

test("vaultReadRequestContract and vaultQueryResultContract admit their shapes", () => {
  assert.equal(vaultReadRequestContract.validate({ kind: "metroplat.knowledge-vault.read-request", vaultRoot: "/tmp/vault" }), true);
  const result = {
    kind: "metroplat.knowledge-vault.query-result",
    vaultRoot: "/tmp/vault",
    notes: 0,
    rows: 0,
    matchedRows: 0,
    returnedRows: 0,
    attributes: {},
    results: [],
    bodyMatches: [],
    nonConforming: [],
  };
  assert.deepEqual(vaultQueryResultContract.assert(result), result);
});

test("vaultWebsitePublishRequestContract and receipt contract admit their shapes", () => {
  const request = {
    kind: "metroplat.vault-website-publish.publish-request",
    vaultRoot: "/tmp/vault",
    outputRoot: "/tmp/out",
    websiteUrl: "https://example.invalid",
    title: "A Vault Website",
  };
  assert.deepEqual(vaultWebsitePublishRequestContract.assert(request), request);
  const receipt = {
    kind: "metroplat.vault-website-publish.publish-receipt",
    vaultRoot: "/tmp/vault",
    outputRoot: "/tmp/out",
    contentFiles: 1,
    articles: 0,
    pages: 1,
    outputFiles: 1,
    paths: ["index.html"],
  };
  assert.deepEqual(vaultWebsitePublishReceiptContract.assert(receipt), receipt);
});

test("each Diataxis mode names its reading among the four", () => {
  assert.deepEqual([...diataxisModeNames], ["tutorial", "how-to", "explanation", "reference"]);
  assert.equal(diataxisMode("tutorial").reading, "absurd");
  assert.equal(diataxisMode("how-to").reading, "potential");
  assert.equal(diataxisMode("explanation").reading, "active");
  assert.equal(diataxisMode("reference").reading, "stable");
});

test("lookup duality flips and exchanges the compass axes, doing duality exchanges them", () => {
  assert.equal(diataxisLookupDual("tutorial").name, "reference");
  assert.equal(diataxisLookupDual("explanation").name, "explanation");
  assert.equal(diataxisDoingDual("explanation").name, "how-to");
  assert.equal(diataxisDoingDual("tutorial").name, "tutorial");
  assert.equal(diataxisAntipode("tutorial").name, "reference");
  assert.equal(diataxisAntipode("how-to").name, "explanation");
  const reading = diataxisReading();
  assert.equal(reading.modes.length, 4);
  for (const edges of [reading.lookupDual, reading.doingDual, reading.antipode]) assert.equal(edges.length, 4);
});

test("diataxisModeOfText reads structural evidence from real document bodies", () => {
  assert.equal(diataxisModeOfText("By the end of this you will learn to bake.\n\n1. Preheat\n2. Bake"), "tutorial");
  assert.equal(diataxisModeOfText("1. Run the command\n2. Check the output"), "how-to");
  assert.equal(diataxisModeOfText("| a | b |\n|---|---|\n| 1 | 2 |\n```js\ncode\n```"), "reference");
  assert.equal(diataxisModeOfText("This explains the concept in ordinary prose, at length, with no steps at all."), "explanation");
  assert.equal(diataxisModeOfText("anything", "how-to"), "how-to");
});

test("diataxisCoverageOfDocuments classifies real documents and the contracts admit the result", () => {
  const documents = [
    { path: "a.md", body: "By the end of this you will learn X.\n\n1. Step" },
    { path: "b.md", body: "1. Do this\n2. Then that" },
    { path: "c.md", body: "This explains the background at length in prose." },
    { path: "d.md", body: "| k | v |\n|---|---|\n| a | b |\n```js\nx\n```" },
  ];
  const classification = diataxisCoverageOfDocuments("test-surface", documents);
  assert.equal(classification.missingModes.length, 0);
  assert.equal(classification.judgment.kind, "diataxis.coverage:witness");
  assert.deepEqual(diataxisCoverageClassificationContract.assert(classification), classification);
  assert.equal(diataxisCoverageSurfaceContract.validate({
    kind: "diataxis.coverage.surface",
    id: "s",
    items: [{ kind: "diataxis.coverage.item", id: "a.md", mode: "tutorial" }],
  }), true);
});
