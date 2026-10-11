import assert from "node:assert/strict";
import test from "node:test";
import { eavtRow } from "../scripts/admit-row.mjs";
import { normalizeEavtRow } from "../scripts/normalize-row.mjs";
import { sameEavtRows } from "../scripts/same-eavt-rows.mjs";
import { isEavtRow } from "../scripts/is-eavt-row.mjs";
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
