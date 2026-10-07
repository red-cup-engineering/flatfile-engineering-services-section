import assert from "node:assert/strict";
import test from "node:test";
import { signCookieValue, unsignCookieValue } from "../src/signed-cookie.mjs";
test("signs and verifies cookie values", ()=>{
    const value = signCookieValue("abc", "secret");
    assert.equal(unsignCookieValue(value, "secret"), "abc");
    assert.equal(unsignCookieValue(value, "wrong"), null);
});
