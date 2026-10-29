// reflexing — proves the src schema literal is byte-identical to the ruled
// data/records/schema/reflexing.schema.json, that the type engine admits a
// live reflexing() carrier, and — the point of this module — that the
// derivation law reflex(S) = relating(S, S) actually holds for reflex(),
// not just as prose in the README and the schema description.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { reflexingSchema, reflexing, admitReflexing, reflex } from "../src/reflexing.mjs";
import { relating } from "../src/relating.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ruledSchema = JSON.parse(readFileSync(path.resolve(here, "../data/records/schema/reflexing.schema.json"), "utf8"));

test("reflexingSchema matches the ruled data/records/schema/reflexing.schema.json exactly", () => {
  assert.deepEqual(reflexingSchema, ruledSchema);
});

test("reflexing() names the act on one subject", () => {
  const carrier = reflexing("s");
  assert.equal(carrier.kind, "reflexing");
  assert.equal(carrier.subject, "s");
});

test("admitReflexing admits a live reflexing() carrier", () => {
  assert.equal(admitReflexing(reflexing("s")).ok, true);
});

test("admitReflexing refuses a value carrying an object term (reflexing has none)", () => {
  assert.equal(admitReflexing({ kind: "reflexing", subject: "s", object: "s" }).ok, false);
});

test("the law: reflex(S) = relating(S, S)", () => {
  assert.deepEqual(reflex("s"), relating("s", "s"));
});

test("reflex occupies both the subject-side and the object-side of the relating it produces", () => {
  const produced = reflex("s");
  assert.equal(produced.subject, produced.object);
});
