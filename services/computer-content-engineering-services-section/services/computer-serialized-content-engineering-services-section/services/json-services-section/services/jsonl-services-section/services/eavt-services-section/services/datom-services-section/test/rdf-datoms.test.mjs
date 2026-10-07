import test from "node:test";
import assert from "node:assert/strict";
import { admitRdfDatom } from "../scripts/admit-rdf-datom.mjs";
import {
  canonicalEavtDatomJsonl,
  EAVT_DATOM_JSONL_MEDIA_TYPE as mediaType,
} from "../scripts/admit-rdf-datom-jsonl.mjs";

test("RDF Datom stream preserves strict transport and literal normalization", () => {
  const value = {
    e: "urn:example:ledger",
    a: "urn:example:title",
    v: { kind: "literal", value: "Ledger", language: "EN" },
    tx: "2026-07-27T00:00:00.000Z",
    op: "assert",
  };
  const normalized = admitRdfDatom(value);
  assert.equal(normalized.v.language, "en");
  const body = JSON.stringify(normalized) + "\n";
  assert.deepEqual(canonicalEavtDatomJsonl({ mediaType, body }), {
    mediaType,
    body,
    datomCount: 1,
  });
  assert.throws(
    () =>
      canonicalEavtDatomJsonl({
        mediaType,
        body: JSON.stringify(value) + "\n",
      }),
    /canonicalJson JSON/,
  );
  assert.throws(
    () => canonicalEavtDatomJsonl({ mediaType, body: body.trimEnd() }),
    /newline/,
  );
  assert.throws(
    () => canonicalEavtDatomJsonl({ mediaType: "text/plain", body }),
    /mediaType/,
  );
  assert.throws(() => admitRdfDatom({ ...value, e: "no scheme" }), /RDF IRI/);
  assert.throws(
    () =>
      admitRdfDatom({
        ...value,
        v: { ...value.v, datatype: "urn:type:string" },
      }),
    /both datatype and language/,
  );
});
