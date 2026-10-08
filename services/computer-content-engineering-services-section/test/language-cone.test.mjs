import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG_PROFILE, compileCatalog } from "../src/catalog.mjs";
import { checkLanguageCone } from "../src/language-cone.mjs";

const catalog = compileCatalog({
  profile: CATALOG_PROFILE,
  nodes: [{ type: "registered", parent: null, recognize: { op: "content-includes", value: "registered" } }],
});
const leg = (name, normalForm, path = `repo://info/region/${name}`) => ({
  name, declaredApex: "urn:apex", normalForm, resource: { path, content: "registered" },
});
const cone = (legs) => ({ apex: "urn:apex", region: "repo://info/region", legs });
const check = (legs) => checkLanguageCone(catalog, cone(legs));

test("complete equality is scoped to supplied declarations, not resource derivation", () => {
  const other = leg("other", { a: 1, b: 2 });
  other.resource.content = "different registered bytes";
  const receipt = check([leg("one", { b: 2, a: 1 }), other]);
  assert.equal(receipt.agreement, "supplied-equal");
  assert.equal(receipt.agreementScope, "caller-supplied-normal-forms");
  assert.equal(receipt.disposition, "coherent");
  assert.deepEqual(receipt.missingNormalForms, []);
  assert.deepEqual(receipt.obligations, []);
  assert.equal(receipt.normalForms.length, 1);
  assert.notEqual(receipt.legs[0].resource, receipt.legs[1].resource);
  assert.ok(receipt.legs.every((item) => item.normalFormEvidence === "supplied"));
  assert.ok(Object.isFrozen(receipt) && Object.isFrozen(receipt.legs[0]));
  assert.deepEqual(check([leg("one", { b: 2, a: 1 }), other]), receipt);
});

test("equal supplied subset cannot witness whole-cone agreement", () => {
  const receipt = check([leg("one", 1), leg("two", 1), leg("missing", undefined)]);
  assert.equal(receipt.agreement, "partial");
  assert.equal(receipt.disposition, "unproven");
  assert.deepEqual(receipt.missingNormalForms, ["missing"]);
  assert.equal(receipt.legs[2].normalForm, null);
  assert.equal(receipt.legs[2].normalFormEvidence, "missing");
  assert.deepEqual(receipt.obligations, [{ kind: "missing-normal-form", leg: "missing" }]);
});

test("absent declarations remain unknown with per-leg missingness", () => {
  const receipt = check([leg("one", undefined), leg("two", undefined)]);
  assert.equal(receipt.agreement, "unknown");
  assert.equal(receipt.disposition, "unproven");
  assert.deepEqual(receipt.normalForms, []);
  assert.deepEqual(receipt.missingNormalForms, ["one", "two"]);
  assert.deepEqual(receipt.obligations, [
    { kind: "missing-normal-form", leg: "one" },
    { kind: "missing-normal-form", leg: "two" },
    { kind: "leg-agreement-unwitnessed" },
  ]);
});

test("contradiction remains visible with complete or partial supplied evidence", () => {
  for (const legs of [[leg("one", 1), leg("two", 2)], [leg("one", 1), leg("two", 2), leg("missing", undefined)]]) {
    const receipt = check(legs);
    assert.equal(receipt.agreement, "contradicted");
    assert.equal(receipt.disposition, "open");
    assert.equal(receipt.normalForms.length, 2);
    assert.deepEqual(receipt.missingNormalForms, legs.length === 3 ? ["missing"] : []);
    assert.ok(receipt.obligations.some((item) => item.kind === "leg-agreement-contradicted"));
  }
});

test("null and falsy JSON normal forms are supplied, distinct from missing", () => {
  for (const value of [null, false, 0, ""]) {
    assert.equal(check([leg("one", value), leg("two", value)]).agreement, "supplied-equal");
    const partial = check([leg("one", value), leg("two", undefined)]);
    assert.equal(partial.agreement, "partial");
    assert.equal(partial.legs[0].normalFormEvidence, "supplied");
  }
  assert.equal(check([leg("one", null), leg("two", false)]).agreement, "contradicted");
});

test("the articulating nine-leg declaration leaves six unsupplied legs unproven", () => {
  const missing = ["lean", "solidity", "package", "node", "schema", "evm-deployment"];
  const declared = ["rmn", "a2a", "mcp"];
  const receipt = check([
    ...missing.map((name) => leg(name, undefined)),
    ...declared.map((name) => leg(name, { apex: "urn:apex", operation: "articulate-utterance" })),
  ]);
  assert.equal(receipt.agreement, "partial");
  assert.equal(receipt.disposition, "unproven");
  assert.deepEqual(receipt.missingNormalForms, missing);
  assert.equal(receipt.obligations.length, 6);
});

test("seating uses exact locator boundaries independently of evidence completeness", () => {
  for (const path of ["repo://info/region", "repo://info/region/", "repo://info/region/child/grandchild"]) {
    const receipt = check([leg("one", 1, path)]);
    assert.equal(receipt.legs[0].placement, "seated", path);
    assert.equal(receipt.disposition, "coherent", path);
  }
  for (const path of ["repo://info/region-other/file", "repo://info/regions/file", "repo://info/other/file", "repo://info/region%2Fchild"]) {
    const receipt = check([leg("one", 1, path)]);
    assert.equal(receipt.agreement, "supplied-equal", path);
    assert.equal(receipt.legs[0].placement, "scattered", path);
    assert.equal(receipt.disposition, "open", path);
    assert.deepEqual(receipt.obligations, [{ kind: "scattered-leg", leg: "one", expectedRegion: "repo://info/region" }]);
  }
});

test("trailing delimiter, root, relative, and absent regions retain literal locator semantics", () => {
  for (const [region, path, placement] of [
    ["repo://info/region/", "repo://info/region/child", "seated"],
    ["repo://info/region/", "repo://info/region-other/child", "scattered"],
    ["/", "/child", "seated"],
    ["region", "region/child", "seated"],
    ["region", "regions/child", "scattered"],
    ["repo://info/region/./child", "repo://info/region/child", "scattered"],
    // Lexical declaration seating is not filesystem/security containment.
    ["repo://info/region", "repo://info/region/../other", "seated"],
    ["", "unrelated", "seated"],
    [undefined, "unrelated", "seated"],
    [42, "unrelated", "seated"],
    [null, "unrelated", "seated"],
  ]) {
    const receipt = checkLanguageCone(catalog, { ...cone([leg("one", 1, path)]), region });
    assert.equal(receipt.legs[0].placement, placement, `${region} / ${path}`);
  }
});

test("registration, declared apex, required legs, and placement remain separate obligations", () => {
  const unregistered = leg("unknown", 1);
  unregistered.resource.content = "no match";
  const misbound = leg("wrong-apex", 1);
  misbound.declaredApex = "urn:other";
  const receipt = checkLanguageCone(catalog, {
    ...cone([leg("good", 1), unregistered, misbound, leg("outside", 1, "repo://info/other")]),
    requiredLegs: ["good", "absent"],
  });
  assert.equal(receipt.agreement, "supplied-equal");
  assert.equal(receipt.disposition, "open");
  assert.deepEqual(receipt.missing, ["absent"]);
  assert.deepEqual(receipt.unregistered, ["unknown"]);
  assert.deepEqual(receipt.misbound, ["wrong-apex"]);
  assert.deepEqual(receipt.scattered, ["outside"]);
  assert.equal(receipt.obligations.length, 4);
  for (const [forms, agreement] of [[[1, undefined], "partial"], [[undefined, undefined], "unknown"]]) {
    const incomplete = checkLanguageCone(catalog, {
      ...cone([leg("one", forms[0]), leg("two", forms[1])]), requiredLegs: ["absent"],
    });
    assert.equal(incomplete.agreement, agreement);
    assert.equal(incomplete.disposition, "open");
    assert.deepEqual(incomplete.missing, ["absent"]);
    assert.ok(incomplete.obligations.some((item) => item.kind === "missing-leg"));
    assert.ok(incomplete.obligations.some((item) => item.kind === "missing-normal-form"));
  }
});

test("existing leg shape, count, and name refusals are preserved", () => {
  assert.throws(() => check([]), TypeError);
  assert.throws(() => check(Array.from({ length: 65 }, (_, index) => leg(String(index), 1))), TypeError);
  assert.throws(() => check([leg("duplicate", 1), leg("duplicate", 1)]), /duplicate language-cone leg/);
  assert.throws(() => check([{ ...leg("one", 1), declaredApex: "" }]), TypeError);
});
