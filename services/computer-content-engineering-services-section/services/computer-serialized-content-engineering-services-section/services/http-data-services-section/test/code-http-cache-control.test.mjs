import assert from "node:assert/strict";
import test from "node:test";
import { cacheControl, parseCacheControl } from "../src/cache-control.mjs";
test("parses and forms Cache-Control", ()=>{
    assert.deepEqual(parseCacheControl("public, max-age=60"), {
        visibility: "public",
        maxAge: 60
    });
    assert.match(cacheControl({
        noStore: true,
        maxAge: 0
    }), /no-store/);
});
