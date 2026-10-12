import assert from "node:assert/strict";
import test from "node:test";
import { eavtRow } from "../scripts/admit-row.mjs";
import { normalizeEavtRow } from "../scripts/normalize-row.mjs";
import { sameEavtRows } from "../scripts/same-eavt-rows.mjs";
import { isEavtRow } from "../scripts/is-eavt-row.mjs";
import { eavtId, eavtKey, isEavtAddressOf, mergeEavtLogs, toEavt } from "../src/row.mjs";
test("generic EAVT admits JSON e/a/v/t and normalizes tuple spelling", () => {
  const row = eavtRow({ e: "s", a: "p", v: 1, t: "now" });
  assert.deepEqual(normalizeEavtRow(["s", "p", 1, "now"]), row);
  assert.equal(sameEavtRows({ left: row, right: ["s", "p", 1, "now"] }), true);
  assert.equal(isEavtRow({ e: "s", a: "p", v: () => {}, t: "now" }), false);
});


test("admission detaches and freezes a long native pair spine without truncation", () => {
  let value=["nil"];
  for(let i=0;i<10000;i++)value=["pair",i,value];
  const row=eavtRow({e:"fixture",a:"long-native-evidence",v:value,t:"2026-10-11T00:00:00Z"});
  assert.equal(eavtRow(row),row);
  let source=value,received=row.v,count=0;
  while(received[0]==="pair"){
    assert.notEqual(received,source);assert.equal(received[1],source[1]);assert.ok(Object.isFrozen(received));
    source=source[2];received=received[2];count++;
  }
  assert.equal(count,10000);value[1]=-1;assert.equal(row.v[1],9999);
});

test("EAVT SCA identities distinguish witnessed times from underlying SPO cell identity", () => {
  const first = { e: "subject", a: "predicate", v: "object", t: "2026-10-12T12:00:00Z" };
  const later = { ...first, t: "2026-10-12T12:00:01Z" };
  const opposed = { ...first, v: "opposed-object" };

  assert.equal(eavtId(first), eavtId(toEavt(first)), "tuple and object spellings agree");
  assert.notEqual(eavtId(first), eavtId(later), "a repeated cell at a different time is a new witness");
  assert.notEqual(eavtId(first), eavtId(opposed), "different objects are distinct claims");
  assert.equal(isEavtAddressOf(eavtId(first), toEavt(first)), true);
  assert.equal(isEavtAddressOf(eavtKey(first), first), true, "legacy equality keys remain readable");
  assert.equal(isEavtAddressOf(eavtId(first), later), false);
});

test("EAVT log merge is a G-set over full witness addresses, retaining concurrent observations", () => {
  const one = { e: "s", a: "p", v: "o", t: "2026-10-12T12:00:00Z" };
  const repeated = { ...one, t: "2026-10-12T12:00:01Z" };
  const opposition = { ...one, v: "not-o" };
  const identitySet = rows => rows.map(eavtId).sort();
  const canonical = identitySet([one, repeated, opposition]);
  const readings = [one, repeated, opposition];
  for (const first of readings) {
    for (const second of readings) {
      const xy = mergeEavtLogs([first], [second]);
      const yx = mergeEavtLogs([second], [first]);
      assert.deepEqual(identitySet(xy), identitySet(yx), "commutative on IDs");
      assert.deepEqual(identitySet(mergeEavtLogs(xy, xy)), identitySet(xy), "idempotent on IDs");
      for (const third of readings) {
        assert.deepEqual(
          identitySet(mergeEavtLogs(mergeEavtLogs([first], [second]), [third])),
          identitySet(mergeEavtLogs([first], mergeEavtLogs([second], [third]))),
          "associative on IDs",
        );
      }
    }
  }
  assert.deepEqual(identitySet(mergeEavtLogs([one], [repeated], [opposition], [one])), canonical);
});
