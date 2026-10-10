import assert from "node:assert/strict";
import test from "node:test";
import { assertValid, checkEvidence, checkSection, createProfileAssertion, hasString, push } from "../src/profile-admission.mjs";

test("profile primitives preserve non-empty string and validation-error contracts", () => {
  assert.equal(hasString({ value: "present" }, "value"), true);
  assert.equal(hasString({ value: "" }, "value"), false);
  assert.equal(hasString(null, "value"), false);

  const errors = [];
  push(errors, "PROFILE-001", "profile", "must be declared");
  assert.deepEqual(errors, [{ code: "PROFILE-001", path: "profile", message: "must be declared" }]);
});

test("assertValid preserves the validator's value and diagnostic error", () => {
  const profile = { profileId: "spotcomp" };
  assert.equal(assertValid(profile, () => []), profile);
  assert.throws(
    () => assertValid(profile, () => [{ code: "PROFILE-001", path: "profile", message: "must be declared" }]),
    { name: "TypeError", message: "PROFILE-001 profile: must be declared" },
  );
});

test("createProfileAssertion preserves the named profile assertion contract", () => {
  const profile = { profileId: "spotcomp" };
  const assertProfile = createProfileAssertion(() => []);
  assert.equal(assertProfile(profile), profile);
});

test("checkEvidence admits non-empty string citations only", () => {
  const errors = [];
  checkEvidence(errors, ["RFC 9458"], "profile", "PROFILE-001");
  assert.deepEqual(errors, []);
  checkEvidence(errors, [], "profile", "PROFILE-001");
  assert.deepEqual(errors, [{ code: "PROFILE-001", path: "profile", message: "must cite evidence" }]);
});

test("checkSection preserves missing, boolean, and evidence diagnostics", () => {
  const missing = [];
  checkSection(missing, {}, "system", ["declared"], "SYSTEM");
  assert.deepEqual(missing, [{ code: "SYSTEM-001", path: "system", message: "system must be declared" }]);

  const invalid = [];
  checkSection(invalid, { system: { declared: false, evidence: [] } }, "system", ["declared"], "SYSTEM");
  assert.deepEqual(invalid, [
    { code: "SYSTEM-002", path: "system.declared", message: "declared must be true" },
    { code: "SYSTEM-003", path: "system", message: "must cite evidence" },
  ]);
});
