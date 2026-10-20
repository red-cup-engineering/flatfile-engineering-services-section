import assert from "node:assert/strict";
import test from "node:test";
import { makeContext, projectSharedQualities } from "../../src/closure/formal-context.mjs";

const selected = result => result.selected.map(x => x.quality);
const byQuality = (result, quality) => result.excluded.find(x => x.quality === quality);

// A hypothetical source-witness set, not claims about American Dad canon.
const qualities = ["bravado", "performance", "insecurity", "loyalty", "mischief", "unknown"];
const context = makeContext(
  ["francine", "klaus", "jeff", "roger"],
  qualities,
  [
    ["francine", "bravado"], ["francine", "performance"],
    ["klaus", "bravado"], ["klaus", "insecurity"],
    ["jeff", "bravado"], ["jeff", "loyalty"],
    ["roger", "bravado"], ["roger", "performance"],
    ["roger", "insecurity"], ["roger", "loyalty"],
    ["roger", "mischief"],
  ],
  [["roger", "mischief"], ["francine", "loyalty"]],
);

test("Roger-filtered union selects only unopposed target-supported qualities from ANY source", () => {
  const result = projectSharedQualities(context, {
    sources: ["francine", "klaus", "jeff"], target: "roger",
  });
  assert.deepEqual(selected(result), ["bravado", "performance", "insecurity", "loyalty"]);
  assert.deepEqual(result.selected.find(x=>x.quality==="loyalty").acceptedSourceThings, ["jeff"]);
  assert.equal(result.selected.find(x=>x.quality==="performance").sources[0].reading, "for-only");
  assert.equal(result.selected.find(x=>x.quality==="loyalty").sources[0].reading, "against-only");
  assert.equal(result.targetThing, "roger");
  assert.equal(result.authority, "not-conferred");
  assert.equal(Object.isFrozen(result.selected[0].sources), true);
});

test("ALL source conjunction is different from a target-filtered source union", () => {
  const result = projectSharedQualities(context, {
    sources: ["francine", "klaus", "jeff"], target: "roger", sourceMode: "all",
  });
  assert.deepEqual(selected(result), ["bravado"]);
  assert.equal(byQuality(result,"performance").reason, "insufficient-source-support");
});

test("FOUR both and unknown remain distinct: no negative, opposed or absent evidence gets projected", () => {
  const union = projectSharedQualities(context, {
    sources: ["francine", "klaus", "jeff"], target: "roger",
  });
  assert.equal(byQuality(union,"mischief").target.reading, "both");
  assert.equal(byQuality(union,"mischief").reason, "target-not-unopposed-positive");
  assert.equal(byQuality(union,"unknown").target.reading, "unknown");
  assert.equal(byQuality(union,"unknown").sources[2].reading, "unknown");
  // A source-specific denial doesn't nullify another original Thing's support.
  assert.equal(union.selected.find(x=>x.quality==="loyalty").sources[0].against, true);
});

test("same generic producer works for software, games and messages without character-shaped code", () => {
  const c = makeContext(
    ["editor", "database", "boardgame", "product", "message"],
    ["undo", "collaboration", "roles"],
    [["editor","undo"],["database","collaboration"],["boardgame","roles"],
      ["product","undo"],["product","roles"],["message","roles"]],
  );
  assert.deepEqual(selected(projectSharedQualities(c, {
    sources:["editor","database","boardgame"],target:"product",
  })), ["undo","roles"]);
  assert.deepEqual(selected(projectSharedQualities(c, {
    sources:["editor","database","boardgame"],target:"message",
  })), ["roles"]);
});

test("source and target identity, duplicates and selector grammar refuse", () => {
  const valid = {sources:["francine","klaus"],target:"roger"};
  assert.throws(()=>projectSharedQualities(context,{...valid,sources:[]}),/distinct nonempty/);
  assert.throws(()=>projectSharedQualities(context,{...valid,sources:["jeff","jeff"]}),/distinct nonempty/);
  assert.throws(()=>projectSharedQualities(context,{...valid,sources:["ghost"]}),/outside the context/);
  assert.throws(()=>projectSharedQualities(context,{...valid,target:"ghost"}),/outside the context/);
  assert.throws(()=>projectSharedQualities(context,{...valid,sourceMode:"maybe"}),/any or all/);
  assert.throws(()=>projectSharedQualities({},valid),/admitted finite/);
});
