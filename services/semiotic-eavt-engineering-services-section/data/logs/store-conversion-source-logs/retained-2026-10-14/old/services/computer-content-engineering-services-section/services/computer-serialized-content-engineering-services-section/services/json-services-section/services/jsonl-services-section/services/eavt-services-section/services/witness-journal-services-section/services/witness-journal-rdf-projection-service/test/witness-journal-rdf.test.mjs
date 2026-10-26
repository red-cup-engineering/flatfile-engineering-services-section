import assert from "node:assert/strict";
import test from "node:test";

import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { seavt } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";
import { projectSeavtRdf, verifySeavtRdfProjection } from "../src/witness-journal-rdf.mjs";

test("projects direct-SEN SEAVT predication and stored T into one canonical named graph", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const row = seavt(["mark", "order.payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "2026-08-02T00:00:00.000Z");
  const projection = await projectSeavtRdf(row, { graph });

  assert.equal(projection.graph, graph);
  assert.equal(projection.statementCount, 2);
  assert.deepEqual(projection.source.e, row.e);
  assert.match(projection.canonicalNQuads, new RegExp(`<${projection.coordinateTokens.e}> <${projection.coordinateTokens.a}> <${projection.coordinateTokens.v}> <${graph}> \\.`));
  assert.match(projection.canonicalNQuads, /urn:emsenn:witness-journal:time/u);
  assert.equal(await verifySeavtRdfProjection(projection), true);
  assert.match(projection.token, /^ni:\/\/\/sha-256;/u);
});

test("projection changes when punctuation or stored time changes", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const generated = await projectSeavtRdf(seavt(["mark", "order.payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "t1"), { graph });
  const witnessed = await projectSeavtRdf(seavt(["mark", "order:payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "t1"), { graph });
  const later = await projectSeavtRdf(seavt(["mark", "order.payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "t2"), { graph });

  assert.notEqual(generated.token, witnessed.token);
  assert.notEqual(generated.token, later.token);
});

test("refuses a noncanonical or non-NI prior apex and generic EAVT", async () => {
  await assert.rejects(() => projectSeavtRdf({ e: "subject", a: { arbitrary: true }, v: 4, t: "t" }, {
    graph: makeNiUri(Buffer.from("prior apex", "utf8")),
  }), /SEAVT row/);
  await assert.rejects(
    () => projectSeavtRdf(seavt(["mark", "order.payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "t"), { graph: "urn:not-ni" }),
    (error) => error instanceof TypeError && error.code === "invalid-witness-graph",
  );
});

test("verification refuses token, byte, source, or prior-apex drift", async () => {
  const graph = makeNiUri(Buffer.from("prior apex", "utf8"));
  const projection = await projectSeavtRdf(seavt(["mark", "order.payment"], ["mark", "payment:receipt"], ["mark", "receipt-delay"], "t"), { graph });
  assert.equal(await verifySeavtRdfProjection({ ...projection, token: graph }), false);
  assert.equal(await verifySeavtRdfProjection({ ...projection, canonicalNQuads: `${projection.canonicalNQuads} ` }), false);
  assert.equal(await verifySeavtRdfProjection({
    ...projection,
    source: { ...projection.source, e: ["mark", "order:payment"] },
  }), false);
  assert.equal(await verifySeavtRdfProjection({
    ...projection,
    graph: makeNiUri(Buffer.from("different prior apex", "utf8")),
  }), false);
});
