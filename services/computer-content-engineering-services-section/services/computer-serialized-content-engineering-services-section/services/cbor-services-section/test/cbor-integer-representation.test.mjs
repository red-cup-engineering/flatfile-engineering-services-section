// Derived independently from the integer/float representation contract.
// Supplements the unchanged original owner test suite.
import assert from "node:assert/strict";
import test from "node:test";
import * as provider from "../src/cbor.mjs";

const requiredExports = [
  'encodeCanonical', 'decodeCanonical', 'encodeCanonicalScalar',
  'encodeCanonicalArrayHeader', 'canonicalEqual', 'canonicalCborToNiUri',
  'encodeCbor', 'decodeCbor', 'deriveCborNi',
];
for (const name of requiredExports) assert.equal(typeof provider[name], 'function', `missing public API: ${name}`);
const { encodeCanonical, decodeCanonical, encodeCanonicalScalar,
  encodeCanonicalArrayHeader, canonicalEqual, canonicalCborToNiUri,
  encodeCbor, decodeCbor, deriveCborNi } = provider;

function bytes(hex) {
  assert.match(hex, /^(?:[0-9a-f]{2})+$/u, 'fixture must be explicit complete bytes');
  return Buffer.from(hex, 'hex');
}
function hex(value) {
  assert.ok(value instanceof Uint8Array, 'public writer result must be Uint8Array-compatible');
  return Buffer.from(value).toString('hex');
}
function sameValue(actual, expected, path = '$') {
  if (expected instanceof Uint8Array) {
    assert.ok(actual instanceof Uint8Array, `${path}: byte-string type`);
    assert.equal(hex(actual), hex(expected), `${path}: byte contents`);
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path}: array type`);
    assert.equal(actual.length, expected.length, `${path}: array length`);
    expected.forEach((value, i) => sameValue(actual[i], value, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === 'object') {
    assert.ok(actual !== null && typeof actual === 'object' && !Array.isArray(actual) && !(actual instanceof Map), `${path}: text-key map result`);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${path}: map keys`);
    for (const key of Object.keys(expected)) {
      assert.ok(Object.hasOwn(actual, key), `${path}: own key ${key}`);
      sameValue(actual[key], expected[key], `${path}.${key}`);
    }
  } else {
    assert.equal(typeof actual, typeof expected, `${path}: exact public scalar type`);
    assert.strictEqual(actual, expected, `${path}: exact value`);
  }
}
function exactRoundTrip(wire, expected) {
  const source = bytes(wire);
  const before = Buffer.from(source);
  const decoded = decodeCanonical(source);
  sameValue(decoded, expected);
  assert.equal(hex(encodeCanonical(decoded)), wire, 'decoded value re-encodes to original wire bytes');
  assert.equal(hex(encodeCanonical(expected)), wire, 'independent expected value has specified encoding');
  assert.deepEqual(source, before, 'decoding must not alter caller-owned wire bytes');
}

// CBOR negative integers have value -1-argument, not a signed two's-complement
// payload. Every literal is independent of the provider's writer and reader.
const requiredIntegers = [
  ['minus 2^64', '3bffffffffffffffff', -18446744073709551616n],
  ['minus 2^53 minus 1', '3b0020000000000000', -9007199254740993n],
  ['minus 2^53 regression', '3b001fffffffffffff', -9007199254740992n],
  ['minimum safe Number', '3b001ffffffffffffe', -9007199254740991],
  ['minus one', '20', -1],
  ['zero', '00', 0],
  ['maximum safe Number', '1b001fffffffffffff', 9007199254740991],
  ['plus 2^53', '1b0020000000000000', 9007199254740992n],
  ['plus 2^64 minus 1', '1bffffffffffffffff', 18446744073709551615n],
];
const additionalIntegers = [
  ['plus 2^53 plus 1 cannot become Number', '1b0020000000000001', 9007199254740993n],
  ['minus 2^53 minus 2', '3b0020000000000001', -9007199254740994n],
  ['positive argument 23', '17', 23], ['positive argument 24', '1818', 24],
  ['positive argument 255', '18ff', 255], ['positive argument 256', '190100', 256],
  ['positive argument 65535', '19ffff', 65535], ['positive argument 65536', '1a00010000', 65536],
  ['positive argument 2^32 minus 1', '1affffffff', 4294967295],
  ['positive argument 2^32', '1b0000000100000000', 4294967296],
  ['negative argument 23', '37', -24], ['negative argument 24', '3818', -25],
  ['negative argument 255', '38ff', -256], ['negative argument 256', '390100', -257],
  ['negative argument 65535', '39ffff', -65536], ['negative argument 65536', '3a00010000', -65537],
  ['negative argument 2^32 minus 1', '3affffffff', -4294967296],
  ['negative argument 2^32', '3b0000000100000000', -4294967297],
];
const contexts = [
  ['scalar', '', value => value],
  ['array member', '81', value => [value]],
  ['map value', 'a1616b', value => ({ k: value })],
  ['array-map-array nesting', '81a1616b81', value => [{ k: [value] }]],
];
for (const [name, wire, expected] of [...requiredIntegers, ...additionalIntegers]) {
  for (const [context, prefix, wrap] of contexts) {
    test(`A1 integer ${name}, ${context}`, () => exactRoundTrip(prefix + wire, wrap(expected)));
  }
}

test('A1 small BigInts and equal safe Numbers share bytes and decode as Numbers', () => {
  for (const [, wire, expected] of [...requiredIntegers, ...additionalIntegers]) {
    if (typeof expected !== 'number') continue;
    assert.equal(hex(encodeCanonical(BigInt(expected))), wire);
    sameValue(decodeCanonical(bytes(wire)), expected);
  }
  assert.equal(hex(encodeCanonical(-0)), '00');
  assert.equal(hex(encodeCanonical(0n)), '00');
  assert.equal(Object.is(decodeCanonical(bytes('00')), -0), false);
});

// These are wire FLOATS, including the integral-valued Numbers. Their
// mathematical equality to a BigInt does not grant permission to coerce them.
// IEEE-754 fixtures were checked separately with Python struct, including
// non-representability in every shorter float width; no provider was run.
const floats = [
  ['unsafe negative integral binary32', 'fada000000', -9007199254740992],
  ['unsafe positive integral binary32', 'fa5a000000', 9007199254740992],
  ['unsafe negative integral binary64', 'fbc340000000000001', -9007199254740994],
  ['unsafe positive integral binary64', 'fb4340000000000001', 9007199254740994],
  ['minus 2^64 as float', 'fadf800000', -18446744073709551616],
  ['plus 2^64 as float', 'fa5f800000', 18446744073709551616],
  ['fractional binary16', 'f93e00', 1.5],
  ['negative fractional binary16', 'f9b800', -0.5],
  ['smallest positive binary16 subnormal', 'f90001', 2 ** -24],
  ['fractional binary32', 'fa3f800001', 1 + 2 ** -23],
  ['fractional binary64', 'fb3ff0000000000001', 1 + 2 ** -52],
  ['smallest positive binary32 subnormal', 'fa00000001', 2 ** -149],
  ['smallest positive binary64 subnormal', 'fb0000000000000001', Number.MIN_VALUE],
  ['largest finite Number stays float', 'fb7fefffffffffffff', Number.MAX_VALUE],
];
for (const [name, wire, expected] of floats) {
  for (const [context, prefix, wrap] of contexts) {
    test(`A2 ${name}, ${context}`, () => exactRoundTrip(prefix + wire, wrap(expected)));
  }
}

test('A2 equal mathematical integer and float remain distinct in one array and map', () => {
  exactRoundTrip('823b001ffffffffffffffada000000', [-9007199254740992n, -9007199254740992]);
  exactRoundTrip('a26166fada00000061693b001fffffffffffff', { f: -9007199254740992, i: -9007199254740992n });
  assert.equal(canonicalEqual(-9007199254740992n, -9007199254740992), false);
  assert.equal(canonicalEqual(9007199254740992n, 9007199254740992), false);
  assert.equal(canonicalEqual(42n, 42), true);
});

// A3 supplementary checks, not a replacement for any original owner test.
const scalars = [
  ['f4', false], ['f5', true], ['f6', null], ['60', ''], ['6178', 'x'],
  ['65636166c3a9', 'caf\u00e9'], ['6663616665cc81', 'cafe\u0301'],
  ['40', Buffer.from([])], ['430001ff', Buffer.from([0, 1, 255])],
];
for (const [wire, expected] of scalars) {
  test(`A3 supplemental scalar API ${wire}`, () => {
    exactRoundTrip(wire, expected);
    assert.equal(hex(encodeCanonicalScalar(expected)), wire);
  });
}
test('A3 scalar writer preserves integer versus float carrier bytes', () => {
  for (const [, wire, expected] of [...requiredIntegers, ...floats]) {
    assert.equal(hex(encodeCanonicalScalar(expected)), wire);
  }
  assert.throws(() => encodeCanonicalScalar([]));
  assert.throws(() => encodeCanonicalScalar({ a: 1 }));
});
test('A3 array-header API uses shortest definite lengths without allocating the array', () => {
  for (const [length, wire] of [
    [0, '80'], [23, '97'], [24, '9818'], [255, '98ff'], [256, '990100'],
    [65535, '99ffff'], [65536, '9a00010000'], [4294967295, '9affffffff'],
    [4294967296, '9b0000000100000000'], [9007199254740991, '9b001fffffffffffff'],
  ]) assert.equal(hex(encodeCanonicalArrayHeader(length)), wire);
  const combined = Buffer.concat([
    encodeCanonicalArrayHeader(2), encodeCanonicalScalar('pair'), encodeCanonicalScalar(1),
  ]);
  assert.equal(hex(combined), '82647061697201');
  sameValue(decodeCanonical(combined), ['pair', 1]);
});

// SHA-256/base64url constants were independently computed from these literal
// bytes with Python hashlib/base64. No canonical writer supplies this oracle.
const niCases = [
  ['3b001fffffffffffff', -9007199254740992n, 'ni:///sha-256;U7AlIH3J0_39f6_t8zRWAN5FJ7d5ihZnHxtNo15tS1M'],
  ['fada000000', -9007199254740992, 'ni:///sha-256;BkB4YkTxnXfoo6Skxf-EW452XZ12S_yBkCMMTZZ5lqY'],
  ['1b0020000000000000', 9007199254740992n, 'ni:///sha-256;_QkRssDOGpEmRX9HBQw6AmDthnfrGhNkZGOdVkQ1F4E'],
  ['fa5a000000', 9007199254740992, 'ni:///sha-256;sjXB9Wc0OnUdJIzN8lNGF6I4eiOkH4YM_UCiTRM-2uo'],
  ['82646d61726b6178', ['mark', 'x'], 'ni:///sha-256;Uhc6FnNDtjj_QLJMLEHDKz1-dKcjfY5iKyccfIeN3LU'],
  ['a2616101616283f5f66178', { a: 1, b: [true, null, 'x'] }, 'ni:///sha-256;Fxmiz1tMWuCPq6aYxJjA09EzcEQ36EkSv0t9SevQHws'],
];
for (const [wire, expected, uri] of niCases) {
  test(`A3 supplemental NI identity binds exact bytes ${wire}`, () => {
    assert.equal(canonicalCborToNiUri(bytes(wire)), uri);
    assert.deepEqual(deriveCborNi({ value: expected }), { uri });
  });
}
test('A3 request API has independent base64 expectations', () => {
  assert.deepEqual(encodeCbor({ value: 42 }), { base64: 'GCo=' });
  assert.deepEqual(decodeCbor({ base64: 'GCo=' }), { value: 42 });
  assert.deepEqual(encodeCbor({ value: -9007199254740992n }), { base64: 'OwAf////////' });
  sameValue(decodeCbor({ base64: 'OwAf////////' }), { value: -9007199254740992n });
  assert.deepEqual(encodeCbor({ value: -9007199254740992 }), { base64: '+toAAAA=' });
  sameValue(decodeCbor({ base64: '+toAAAA=' }), { value: -9007199254740992 });
});

const refusals = [
  ['overlong integer zero', '1800'], ['overlong negative integer', '3800'],
  ['binary32 1.5 has shorter binary16', 'fa3fc00000'],
  ['binary64 1.5 has shorter binary16', 'fb3ff8000000000000'],
  ['binary64 minus 2^53 has shorter binary32', 'fbc340000000000000'],
  ['binary64 plus 2^53 has shorter binary32', 'fb4340000000000000'],
  ['wire negative zero differs from normalized integer zero', 'f98000'],
  ['non-finite infinity', 'f97c00'], ['non-finite NaN', 'f97e00'],
  ['tag', 'c000'], ['unsupported simple', 'f0'], ['undefined', 'f7'],
  ['indefinite array', '9f00ff'], ['indefinite map', 'bf616100ff'],
  ['non-text map key', 'a10000'], ['duplicate map key', 'a2616100616101'],
  ['wrong map order', 'a2616200616100'], ['malformed UTF-8', '61ff'],
  ['truncated 64-bit integer argument', '3b001fffffffffff'], ['trailing byte', '0000'],
];
for (const [name, wire] of refusals) {
  test(`A3 supplemental refusal: ${name}`, () => {
    assert.throws(() => decodeCanonical(bytes(wire)));
    assert.throws(() => canonicalCborToNiUri(bytes(wire)));
  });
}
test('A3 writer range and unsupported-value refusals stay intact', () => {
  for (const value of [-18446744073709551617n, 18446744073709551616n,
    NaN, Infinity, -Infinity, Symbol('unsupported'), '\ud800']) {
    assert.throws(() => encodeCanonical(value));
  }
});
