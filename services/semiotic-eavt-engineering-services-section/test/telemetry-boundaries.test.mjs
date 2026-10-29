// Original SEAVT specification SV11/SV12: disclosure and propagation at the real handle.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openTelemetry } from "../src/telemetry.mjs";
import { getBlob, readTrace } from "../src/telemetry-store.mjs";
import { traceContextFromEnvironment } from "@red-cup-engineering/signcell/trace-context";

const roots = [];
let entropyCalls = 0;
const open = (env = {}) => {
  const root = mkdtempSync(join(tmpdir(), "seavt-handle-boundary-"));
  roots.push(root);
  return openTelemetry({ root, service: { name: "handle-boundary" }, ports: {
    now: () => "2026-10-26T18:00:00.000Z",
    entropy: n => Uint8Array.from({ length: n }, (_, i) => (++entropyCalls + i) % 255 + 1),
    env,
  } });
};
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
const field = (value, key) => value.kvlistValue.values.find(entry => entry.key === key)?.value;
const parent = "00-0102030405060708090a0b0c0d0e0f10-1112131415161718-00";

test("sv11-positive: real stderr credential redaction reaches the receipt headline", () => {
  const handle = open(), credential = "synthetic-receipt-private-value";
  const args = ["-e", "process.stderr.write(process.argv[1] + '\\n'); process.exit(7)", `token=${credential}`];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 7);
  assert.ok(result.stderr.includes(credential), "the native executor actually emitted the test credential");
  const receipt = handle.recordCommand({ command: process.execPath, args, result });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.headline.includes(credential), false);
  assert.match(receipt.headline, /: token=\[redacted\]$/u);
  const source = readTrace(handle.root, handle.traceId).messages[0];
  assert.equal(source.id, receipt.address);
  assert.equal(field(field(source.body.body, "stderr"), "tail").stringValue, "token=[redacted]\n");
  const blob = receipt.blobs.find(entry => entry.stream === "stderr");
  assert.equal(Buffer.from(getBlob(handle.root, blob.id)).toString(), "token=[redacted]\n");
});

test("sv11-alternate: stdout fallback uses its bounded sanitized source tail", () => {
  const handle = open(), credential = "synthetic-stdout-private-value";
  const args = ["-e", "process.stdout.write('x'.repeat(12000) + process.argv[1] + '\\n'); process.exit(3)", ` password=${credential}`];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(result.status, 3);
  const receipt = handle.recordCommand({ command: process.execPath, args, result });
  const body = receipt.record.body.body;
  const tail = field(field(body, "stdout"), "tail").stringValue.trimEnd();
  const message = field(body, "message").stringValue;
  assert.equal(receipt.headline, `${message}: ${tail}`);
  assert.ok(receipt.headline.length < 5000, "raw 12000-byte output cannot bypass the retained tail bound");
  assert.equal(receipt.headline.includes(credential), false);
  assert.match(receipt.headline, /password=\[redacted\]$/u);
});

test("sv11-refusal: absent tails and successful output do not manufacture headline detail", () => {
  const handle = open();
  const failed = handle.recordCommand({ command: "fixture", result: { status: 2, signal: null, stdout: "", stderr: "" } });
  assert.equal(failed.headline, field(failed.record.body.body, "message").stringValue);
  const success = handle.recordCommand({ command: "fixture", result: { status: 0, signal: null, stdout: "ordinary detail", stderr: "warning" } });
  assert.equal(success.headline, "fixture succeeded");
  assert.equal(readTrace(handle.root, handle.traceId).messages.length, 2);
});

test("sv12-positive: nested spans and child environments retain admitted vendor state", () => {
  const state = "vendor=opaque,tenant@system=second";
  const incoming = { TRACEPARENT: parent, TRACESTATE: state, PRESERVE: "incoming" };
  const original = { ...incoming };
  const handle = open(incoming), nested = handle.span().span();
  const base = { TRACEPARENT: "stale", TRACESTATE: "old=value", PRESERVE: "child" };
  const env = nested.childEnvironment(base);
  assert.equal(handle.joined, true);
  assert.equal(nested.traceId, handle.traceId);
  assert.equal(nested.traceFlags, 0);
  assert.equal(env.TRACESTATE, state);
  assert.equal(handle.childEnvironment({}).TRACESTATE, state);
  assert.equal(env.PRESERVE, "child");
  assert.match(env.TRACEPARENT, new RegExp(`^00-${handle.traceId}-[0-9a-f]{16}-00$`, "u"));
  assert.notEqual(env.TRACEPARENT, nested.traceparent);
  assert.deepEqual(base, { TRACEPARENT: "stale", TRACESTATE: "old=value", PRESERVE: "child" });
  assert.deepEqual(incoming, original);
  const received = open(env);
  assert.equal(received.traceId, handle.traceId);
  assert.equal(received.childEnvironment({}).TRACESTATE, state);
});

test("sv12-level1-flags: received reserved bits remain evidence while new contexts emit sampled only", () => {
  const incoming = Object.freeze({ TRACEPARENT: parent.slice(0, -2) + "81",
    TRACESTATE: "vendor=original", PRESERVE: "incoming" });
  const original = { ...incoming }, remote = traceContextFromEnvironment(incoming);
  assert.equal(remote.ok, true);
  assert.equal(remote.context.flags, "81");
  assert.equal(remote.context.traceFlags, 0x81);
  const handle = open(incoming);
  assert.equal(handle.joined, true);
  assert.equal(handle.traceId, remote.context.traceId);
  assert.equal(handle.parentSpanId, remote.context.parentId);
  assert.equal(handle.traceFlags, 1, "the new observing context retains only the Level 1 sampled bit");
  assert.equal(handle.traceparent, `00-${handle.traceId}-${handle.spanId}-01`);
  const child = handle.childEnvironment();
  assert.notEqual(child, incoming);
  assert.match(child.TRACEPARENT, new RegExp(`^00-${handle.traceId}-[0-9a-f]{16}-01$`, "u"));
  assert.notEqual(child.TRACEPARENT, handle.traceparent);
  assert.equal(child.TRACESTATE, incoming.TRACESTATE);
  assert.equal(child.PRESERVE, incoming.PRESERVE);
  const recorded = handle.recordEvent({ operation: "level1.receiving", body: "observed" });
  assert.equal(recorded.record.body.flags, 1);
  assert.equal(readTrace(handle.root, handle.traceId).messages[0].body.flags, 1);
  assert.equal(remote.context.traceFlags, 0x81, "received evidence is not rewritten into a new context");
  assert.deepEqual(incoming, original);
});

test("sv12-refusal: discarded or absent vendor state never returns from an injection base", () => {
  for (const incoming of [
    { TRACEPARENT: parent },
    { TRACEPARENT: parent, TRACESTATE: "vendor=one,vendor=duplicate" },
    { TRACEPARENT: "invalid", TRACESTATE: "vendor=oldtrace" },
  ]) {
    const handle = open(incoming);
    const env = handle.span().childEnvironment({ TRACESTATE: "stale=from-base", KEEP: "yes" });
    assert.equal("TRACESTATE" in env, false);
    assert.equal(env.KEEP, "yes");
    if (incoming.TRACEPARENT === "invalid") {
      assert.equal(handle.joined, false);
      assert.notEqual(handle.traceId, parent.split("-")[1]);
    } else assert.equal(handle.joined, true);
  }
});
