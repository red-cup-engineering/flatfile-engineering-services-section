import {test} from "node:test";
import assert from "node:assert/strict";
import {tally, TALLY_FIELDS} from "../src/tally.mjs";

const release = Object.freeze({
  caseId: "case-42", resources: ["resource:a"], paths: ["incoming/a"],
  digests: ["sha256:abcd"], actor: "section:source", counterparty: "section:receiver",
});
const admission = Object.freeze({
  ...release, actor: "section:receiver", counterparty: "section:source",
});

test("complete reciprocal release and admission agree on the four source-owned particulars", () => {
  const result = tally({release, admission});
  assert.equal(result.status, "settled");
  assert.equal(result.reading, "potential");
  assert.deepEqual(result.mismatches, []);
  assert.equal(result.awaiting, null);
  assert.deepEqual(TALLY_FIELDS, ["caseId", "resources", "paths", "digests"]);
});

test("an absent half remains a claim, never a completed economic tally", () => {
  assert.deepEqual(tally({release}), {
    status: "claim", reading: "absurd", mismatches: [], awaiting: "admission",
  });
  assert.equal(tally({admission}).awaiting, "release");
  assert.equal(tally().status, "absent");
});

test("reciprocal identities without case, resource set, paths and digests cannot settle", () => {
  const result = tally({
    release: {actor: "section:source", counterparty: "section:receiver"},
    admission: {actor: "section:receiver", counterparty: "section:source"},
  });
  assert.equal(result.status, "dispute");
  assert.equal(result.reading, "stable"); // valid reciprocal names, four missing particulars
  assert.deepEqual(result.mismatches, TALLY_FIELDS);
});

test("missing and null fields are not evidence of agreement, even when both sides agree on the omission", () => {
  for (const field of TALLY_FIELDS) {
    for (const value of [undefined, null, "", [], {}]) {
      const left = {...release, [field]: value};
      const right = {...admission, [field]: value};
      const result = tally({release: left, admission: right});
      assert.equal(result.status, "dispute", `${field}: ${String(value)}`);
      assert.ok(result.mismatches.includes(field), field);
    }
  }
  const absent = {...admission};
  delete absent.digests;
  assert.deepEqual(tally({release, admission: absent}).mismatches, ["digests"]);
});

test("one omitted, changed or differently ordered particular refuses settlement", () => {
  for (const [field, value] of [
    ["caseId", "case-43"],
    ["resources", ["resource:b"]],
    ["paths", ["outgoing/a"]],
    ["digests", ["sha256:different"]],
  ]) {
    const result = tally({release, admission: {...admission, [field]: value}});
    assert.equal(result.status, "dispute");
    assert.deepEqual(result.mismatches, [field]);
    assert.equal(result.reading, "stable"); // contested; other fields still match
  }
});

test("callers cannot select away the four required identity fields", () => {
  for (const fields of [[], ["caseId"], ["resources", "paths", "digests"],
    [...TALLY_FIELDS, "caseId"], [...TALLY_FIELDS, "counterparties"],
    [...TALLY_FIELDS, 123], [...TALLY_FIELDS, ""]]) {
    assert.throws(() => tally({release, admission, fields}), /fields must uniquely include/);
  }
  const extra = "obligationId";
  const result = tally({
    release: {...release, obligationId: "Obligation-1"},
    admission: {...admission, obligationId: "Obligation-2"},
    fields: [...TALLY_FIELDS, extra],
  });
  assert.deepEqual(result.mismatches, [extra]);
  assert.equal(result.status, "dispute");
});

test("one actor cannot acknowledge itself or forge a mutual structural crossing", () => {
  for (const altered of [
    {...admission, actor: release.actor},
    {...admission, counterparty: admission.actor},
    {...admission, actor: ""},
    {...admission, actor: 123},
    {...admission, counterparty: null},
  ]) {
    const result = tally({release, admission: altered});
    assert.equal(result.status, "dispute");
    assert.ok(result.mismatches.includes("counterparties"));
  }
});

test("malformed receipt carriers do not satisfy the border match", () => {
  for (const malformed of [false, true, "string", 10, [], ["receipt"]]) {
    assert.throws(() => tally({release: malformed, admission}), /plain receipt objects/);
  }
});
