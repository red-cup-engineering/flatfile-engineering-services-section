import test from "node:test";
import assert from "node:assert/strict";
import { readingFamilies, sidesOfReading } from "../../src/four.mjs";
import {
  chuSpace, chuSpaceOfEntries, at, extension, pointWitnesses,
  checkChuMap,
} from "../src/chu.mjs";

test("Chu positive FCA extension is the positive evidence projection over all FOUR charges", () => {
  const states = ["has-standing"];
  const points = readingFamilies.knowledge;
  const space = chuSpace(points, states, (point) => point);
  const included = extension(space, states[0]);

  assert.deepEqual(included, ["potential", "stable"]);
  for (const charge of points) {
    assert.equal(
      included.includes(charge),
      sidesOfReading(charge)[0],
      `positive incidence disagrees with the evidence-for slot of ${charge}`,
    );
  }
  assert.equal(included.includes("active"), false, "against-only is not positive incidence");
  assert.equal(included.includes("absurd"), false, "unknown is not positive incidence");
});

test("opposing reports at the SAME claim retain positive and negative incidence", () => {
  const entries = [
    ["claim", "reports", "potential"],
    ["claim", "reports", "active"],
  ];
  for (const order of [entries, [...entries].reverse()]) {
    const space = chuSpaceOfEntries(["claim"], ["reports"], order);
    assert.equal(at(space, "claim", "reports"), "stable");
    assert.deepEqual(extension(space, "reports"), ["claim"],
      "a contested claim cannot disappear from the positive FCA context");
    assert.deepEqual(pointWitnesses(space, "claim"), {
      settled: "stable",
      for: ["reports"],
      against: ["reports"],
    });
  }
});

test("a Chu map must still preserve BOTH evidence polarities after the incidence repair", () => {
  const original = chuSpace(["claim"], ["reports"], () => "potential");
  const contested = chuSpace(["claim"], ["reports"], () => "stable");
  const ident = (value) => value;
  assert.equal(checkChuMap(original, original, ident, ident).kind, "chu.Map:witness");
  const changed = checkChuMap(original, contested, ident, ident);
  assert.equal(changed.kind, "chu.Map-obstruction",
    "sharing the positive incidence is not FOUR-valued Chu equivalence");
  assert.equal(changed.failures[0].kind, "chu.Map.adjointness-failure");
  assert.deepEqual(extension(original, "reports"), extension(contested, "reports"),
    "Boolean positive FCA projection is intentionally lossy about opposition");
});
