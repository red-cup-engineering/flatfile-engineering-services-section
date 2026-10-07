import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_JSON_PROFILE,
  JSON_RESOURCE_ENVELOPE,
  admitCanonicalJson,
  canonicalizeJson,
  canonicalJson,
} from "../scripts/canonical-json.mjs";

const refused = (thunk, code) => assert.throws(thunk, (error) => error.code === code);

test("RFC 8785 sample serialization uses ECMAScript primitives and recursive sorted keys", () => {
  assert.equal(CANONICAL_JSON_PROFILE, "RFC8785");
  const value = {
    numbers: [
      333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001,
    ],
    string: '\u20ac$\u000f\nA\'B"\\\\"/',
    literals: [null, true, false],
  };
  assert.equal(
    canonicalJson(value),
    String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`,
  );
  assert.equal(
    canonicalJson({ z: [true, null], a: { y: 2, x: 1 } }),
    '{"a":{"x":1,"y":2},"z":[true,null]}',
  );
});

test("canonical JSON preserves array order", () => {
  assert.notEqual(canonicalJson([1, 2, 3]), canonicalJson([3, 2, 1]));
});

test("RFC 8785 number serialization includes negative zero and Appendix B values", () => {
  for (const [value, text] of [
    [-0, "0"],
    [Number.MIN_VALUE, "5e-324"],
    [-Number.MIN_VALUE, "-5e-324"],
    [Number.MAX_VALUE, "1.7976931348623157e+308"],
    [1e23, "1e+23"],
    [1e21, "1e+21"],
    [0.000001, "0.000001"],
  ]) {
    assert.equal(canonicalJson(value), text);
  }
});

test("RFC 8785 key sort uses raw UTF-16 code units", () => {
  const value = {
    "\u20ac": "Euro Sign",
    "\r": "Carriage Return",
    "\ufb33": "Hebrew Letter Dalet With Dagesh",
    1: "One",
    "\ud83d\ude00": "Emoji: Grinning Face",
    "\u0080": "Control",
    "\u00f6": "Latin Small Letter O With Diaeresis",
  };
  assert.equal(
    canonicalJson(value),
    '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
  );
  assert.equal(
    canonicalJson({ 10: "ten", 2: "two", 1: "one" }),
    '{"1":"one","10":"ten","2":"two"}',
  );
});

test("RFC 8785 preserves array order and string spelling", () => {
  assert.notEqual(canonicalJson([1, 2, 3]), canonicalJson([3, 2, 1]));
  assert.notEqual(
    canonicalJson({ text: "é" }),
    canonicalJson({ text: "e\u0301" }),
  );
});

test("canonical JSON rejects JavaScript coercions and non-carriers", () => {
  for (const value of [
    undefined,
    Number.NaN,
    Infinity,
    () => {},
    Symbol("x"),
    1n,
    new Date(),
    { a: undefined },
    [1, undefined],
    [, 1],
    "\ud800",
    { "\udc00": true },
  ]) {
    assert.equal(
      ((value) => {
        try {
          canonicalJson(value);
          return true;
        } catch {
          return false;
        }
      })(value),
      false,
    );
    assert.throws(() => canonicalJson(value), TypeError);
  }
});

test("canonical JSON rejects cycles without recursion overflow", () => {
  const value = { self: null };
  value.self = value;
  assert.throws(() => canonicalJson(value), /cycle/);
});

test("parsed canonical JSON is idempotent and input permutations have identical bytes", () => {
  const canonical = canonicalJson({
    z: [{ b: 2, a: 1 }],
    a: { d: false, c: true },
  });
  assert.equal(canonicalJson(JSON.parse(canonical)), canonical);
  assert.equal(
    canonicalJson({ a: { c: true, d: false }, z: [{ a: 1, b: 2 }] }),
    canonical,
  );
});

test("JSON text admission canonicalizes structural permutations and JCS number spellings", () => {
  const left = admitCanonicalJson(' { "b": 2, "a": [333333333.33333329, 1E30, 4.50, 2e-3, -0] } ');
  const right = canonicalizeJson({ a: [333333333.3333333, 1e30, 4.5, 0.002, 0], b: 2 });
  assert.equal(left.text, '{"a":[333333333.3333333,1e+30,4.5,0.002,0],"b":2}');
  assert.equal(left.text, right.text);
});

test("property names order by UTF-16 code units without Unicode normalization", () => {
  assert.equal(canonicalJson({ "\ufb33": 7, "😀": 6, "€": 5, "ö": 4, "\u0080": 3, "1": 2, "\r": 1 }), '{"\\r":1,"1":2,"\u0080":3,"ö":4,"€":5,"😀":6,"\ufb33":7}');
  assert.notEqual(canonicalJson("é"), canonicalJson("e\u0301"));
});

test("strict text admission refuses duplicate names, malformed UTF-8, lone surrogates, and trailing material", () => {
  refused(() => admitCanonicalJson('{"a":1,"a":2}'), "duplicate-key");
  refused(() => admitCanonicalJson(Uint8Array.from([0xc3, 0x28])), "malformed-utf8");
  refused(() => admitCanonicalJson('"\\ud800"'), "unicode-scalar");
  refused(() => admitCanonicalJson("true false"), "malformed-json");
});

test("strict text admission carries prototype-shaped property names as inert data", () => {
  const canonical = admitCanonicalJson('{"constructor":2,"__proto__":1}');
  assert.equal(canonical.text, '{"__proto__":1,"constructor":2}');
  assert.equal(Object.getPrototypeOf(canonical.value), Object.prototype);
  assert.equal(Object.hasOwn(canonical.value, "__proto__"), true);
});

test("runtime values with observable behavior are refused without being observed", () => {
  for (const value of [Number.POSITIVE_INFINITY, undefined, new Date(0), [, 1]]) refused(() => canonicalizeJson(value), "invalid-json-value");
  let observed = false;
  const accessor = {};
  Object.defineProperty(accessor, "secret", { enumerable: true, get() { observed = true; return 1; } });
  refused(() => canonicalizeJson(accessor), "invalid-json-value");
  const accessorArray = [0];
  Object.defineProperty(accessorArray, "0", { enumerable: true, get() { observed = true; return 1; } });
  refused(() => canonicalizeJson(accessorArray), "invalid-json-value");
  assert.equal(observed, false);
});

test("resource envelopes refuse work at the bounded stage", () => {
  const bound = (field, limit) => ({ ...JSON_RESOURCE_ENVELOPE, [field]: limit });
  for (const [field, fits, over, limit, code] of [
    ["maxSourceBytes", "true", "true", 4, "source-limit"],
    ["maxDepth", "[0]", "[[]]", 1, "depth-limit"],
    ["maxNodes", "[1,2]", "[1,2]", 3, "node-limit"],
    ["maxObjectMembers", '{"a":1}', '{"a":1,"b":2}', 1, "object-member-limit"],
    ["maxArrayLength", "[1]", "[1,2]", 1, "array-length-limit"],
    ["maxStringBytes", '"é"', '"é"', 2, "string-limit"],
    ["maxKeyBytes", '{"ab":1}', '{"ab":1}', 2, "key-limit"],
    ["maxCanonicalBytes", "true", "true", 4, "canonical-limit"],
  ]) {
    assert.equal(admitCanonicalJson(fits, bound(field, limit)).text, fits);
    const tighter = over === fits ? limit - 1 : limit;
    refused(() => admitCanonicalJson(over, bound(field, tighter)), code);
  }
});
