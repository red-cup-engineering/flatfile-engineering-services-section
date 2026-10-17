import assert from "node:assert/strict";
import test from "node:test";
import { addressContent, verifyContentAddress } from "../src/raw-content-address.mjs";
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

test("addresses raw bytes with the shared canonical RFC 6920 SHA-256 NI law", () => {
  const bytes = Buffer.from("561-semioverse-ingress", "utf8");
  const addressed = addressContent(bytes, {
    mediaType: "text/plain",
    source: { surface: "google-drive", objectId: "example" },
  });

  assert.equal(addressed.kind, "semiotic-content.raw-carrier-address");
  assert.equal(addressed.version, 1);
  assert.equal(addressed.algorithm, "sha-256");
  assert.equal(addressed.size, bytes.length);
  assert.equal(addressed.mediaType, "text/plain");
  assert.equal(addressed.ni, makeNiUri(bytes));
  assert.equal(Object.hasOwn(addressed, "sha256"), false);
  assert.equal(isNiUri(addressed.ni), true);
  assert.equal(verifyNiUri(bytes, addressed.ni), true);
  assert.equal(verifyContentAddress(bytes, addressed), true);
});

test("raw-carrier identity is sensitive to exact bytes and does not normalize content", () => {
  const a = Buffer.from("line\n", "utf8");
  const b = Buffer.from("line\r\n", "utf8");
  assert.notEqual(makeNiUri(a), makeNiUri(b));
});

test("verification rejects malformed addresses and changed source bytes", () => {
  const bytes = Buffer.from("original", "utf8");
  const addressed = addressContent(bytes);
  assert.equal(verifyContentAddress(Buffer.from("changed", "utf8"), addressed), false);
  assert.equal(verifyNiUri(bytes, "ni:///sha-256:not-canonical"), false);
});

test("provenance is carried separately and does not alter raw byte identity", () => {
  const bytes = Buffer.from("same bytes", "utf8");
  const drive = addressContent(bytes, { source: { surface: "drive", id: "A" } });
  const github = addressContent(bytes, { source: { surface: "github", id: "B" } });
  assert.equal(drive.ni, github.ni);
  assert.notDeepEqual(drive.source, github.source);
});
