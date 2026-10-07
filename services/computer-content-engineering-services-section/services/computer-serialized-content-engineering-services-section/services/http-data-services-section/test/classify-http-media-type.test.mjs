import assert from "node:assert/strict";
import test from "node:test";
import { extensionType, isCompressible } from "../src/media-type.mjs";
test("classifies paths and compressible media types", ()=>{
    assert.equal(extensionType("/asset/data.JSON"), "application/json");
    assert.equal(extensionType("/.well-known/actor.jrd"), "application/jrd+json");
    assert.equal(extensionType("/catalog/entry.jsonld"), "application/ld+json");
    assert.equal(extensionType("/app/manifest.webmanifest"), "application/manifest+json");
    assert.equal(extensionType("/asset/no-extension"), "application/octet-stream");
    assert.equal(isCompressible("application/problem+json"), true);
    assert.equal(isCompressible("application/manifest+json"), true);
    assert.equal(isCompressible("image/png"), false);
});
