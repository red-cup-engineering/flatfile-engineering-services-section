import assert from "node:assert/strict";
import test from "node:test";
import { parseDirectiveList, splitHeaderList } from "../src/header-value.mjs";
import { parseAccept, parseAcceptEncoding, parseAcceptLanguage } from "../src/preferences.mjs";

test("HTTP lists share quote-aware splitting and never turn malformed qvalues into acceptance", () => {
  assert.deepEqual(splitHeaderList('extension="a,b;c", max-age=60'), ['extension="a,b;c"', 'max-age=60']);
  assert.deepEqual(parseDirectiveList('extension="a,b;c", max-age=60'), { extension: "a,b;c", "max-age": "60" });
  for (const q of ["NaN", "0.5junk", "2", "-1", "0.1234", "1.001", "1e0", "Infinity"]) {
    assert.equal(parseAccept(`text/html;q=${q}`)[0].q, 0);
    assert.equal(parseAcceptLanguage(`en;q=${q}`)[0].q, 0);
    assert.equal(parseAcceptEncoding(`gzip;q=${q}`).get("gzip"), 0);
  }
  assert.equal(parseAccept('text/html;title="a,b";q=0.5')[0].q, 0.5);
});
