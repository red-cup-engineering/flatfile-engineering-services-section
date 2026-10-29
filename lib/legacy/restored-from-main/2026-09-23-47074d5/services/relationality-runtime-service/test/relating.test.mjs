// relating — proves the src schema literal is byte-identical to the ruled
// data/records/schema/relating.schema.json (no silent drift between the
// authored record and the executable carrier), and that the type engine
// admits a live relating() carrier and refuses a malformed one.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { relatingSchema, relating, admitRelating } from "../src/relating.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ruledSchema = JSON.parse(readFileSync(path.resolve(here, "../data/records/schema/relating.schema.json"), "utf8"));

test("relatingSchema matches the ruled data/records/schema/relating.schema.json exactly", () => {
  assert.deepEqual(relatingSchema, ruledSchema);
});

test("relating() builds a directed carrier: subject and object stay distinct sides", () => {
  const carrier = relating("s", "o");
  assert.equal(carrier.kind, "relating");
  assert.equal(carrier.subject, "s");
  assert.equal(carrier.object, "o");
  assert.notEqual(carrier, relating("o", "s"));
});

test("admitRelating admits a live relating() carrier", () => {
  const admission = admitRelating(relating("s", "o"));
  assert.equal(admission.ok, true);
});

test("admitRelating refuses a value missing the object term", () => {
  const admission = admitRelating({ kind: "relating", subject: "s" });
  assert.equal(admission.ok, false);
});

test("admitRelating refuses a value of the wrong kind", () => {
  const admission = admitRelating({ kind: "reflexing", subject: "s", object: "o" });
  assert.equal(admission.ok, false);
});
