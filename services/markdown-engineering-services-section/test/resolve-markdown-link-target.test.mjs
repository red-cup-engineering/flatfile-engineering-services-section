import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveMarkdownLinkTarget } from "../src/resolve-markdown-link-target.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "resolve-markdown-link-target-"));
  const carrierPath = join(root, "notes", "carrier.md");
  await mkdir(join(root, "notes"), { recursive: true });
  await writeFile(carrierPath, "# Carrier\n");
  return { root, carrierPath };
}

test("throws only for malformed input", async () => {
  const { root, carrierPath } = await fixture();
  await assert.rejects(() => resolveMarkdownLinkTarget(42, { carrierPath, root }), TypeError);
  await assert.rejects(() => resolveMarkdownLinkTarget("x", { carrierPath: "", root }), TypeError);
  await assert.rejects(() => resolveMarkdownLinkTarget("x", { carrierPath, root: "" }), TypeError);
  await rm(root, { recursive: true, force: true });
});

test("classifies an absolute web or mailto scheme as its own case, not a filesystem question", async () => {
  const { root, carrierPath } = await fixture();
  for (const [target, scheme] of [
    ["https://example.com/page", "https"],
    ["http://example.com/page", "http"],
    ["mailto:person@example.com", "mailto"],
  ]) {
    const result = await resolveMarkdownLinkTarget(target, { carrierPath, root });
    assert.equal(result.status, "scheme");
    assert.equal(result.resolved, null);
    assert.equal(result.scheme, scheme);
    assert.equal(result.path, null);
  }
  await rm(root, { recursive: true, force: true });
});

test("classifies a disallowed absolute scheme as a scheme case too, never a failure", async () => {
  const { root, carrierPath } = await fixture();
  const result = await resolveMarkdownLinkTarget("ftp://example.com/file", { carrierPath, root });
  assert.equal(result.status, "scheme");
  assert.equal(result.scheme, "ftp");
  assert.equal(result.resolved, null);
  await rm(root, { recursive: true, force: true });
});

test("resolves a bare fragment as pointing at the carrier itself", async () => {
  const { root, carrierPath } = await fixture();
  const result = await resolveMarkdownLinkTarget("#section", { carrierPath, root });
  assert.equal(result.status, "same-document");
  assert.equal(result.resolved, true);
  assert.equal(result.fragment, "section");
  assert.equal(result.path, null);
  await rm(root, { recursive: true, force: true });
});

test("resolves a relative path with a trailing fragment", async () => {
  const { root, carrierPath } = await fixture();
  await mkdir(join(root, "terms"), { recursive: true });
  await writeFile(join(root, "terms", "pacing.md"), "# Pacing\n");
  const result = await resolveMarkdownLinkTarget("../terms/pacing.md#related", { carrierPath, root });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolved, true);
  assert.equal(result.path, "terms/pacing.md");
  assert.equal(result.fragment, "related");
  await rm(root, { recursive: true, force: true });
});

test("decodes percent-encoded characters in a path before checking existence", async () => {
  const { root, carrierPath } = await fixture();
  await writeFile(join(root, "notes", "the note.md"), "# The note\n");
  const result = await resolveMarkdownLinkTarget("the%20note.md", { carrierPath, root });
  assert.equal(result.status, "resolved");
  assert.equal(result.path, "notes/the note.md");
  await rm(root, { recursive: true, force: true });
});

test("resolves a plain relative link to an existing sibling file", async () => {
  const { root, carrierPath } = await fixture();
  await writeFile(join(root, "notes", "sibling.md"), "# Sibling\n");
  const result = await resolveMarkdownLinkTarget("sibling.md", { carrierPath, root });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolved, true);
  assert.equal(result.path, "notes/sibling.md");
  await rm(root, { recursive: true, force: true });
});

test("reports a path that simply does not exist as missing, not a throw", async () => {
  const { root, carrierPath } = await fixture();
  const result = await resolveMarkdownLinkTarget("nowhere.md", { carrierPath, root });
  assert.equal(result.status, "missing");
  assert.equal(result.resolved, false);
  await rm(root, { recursive: true, force: true });
});

test("refuses a path that lexically escapes the confining root", async () => {
  const { root, carrierPath } = await fixture();
  const result = await resolveMarkdownLinkTarget("../../../../../etc/passwd", { carrierPath, root });
  assert.equal(result.status, "escaped");
  assert.equal(result.resolved, false);
  await rm(root, { recursive: true, force: true });
});

test("refuses a path that escapes the confining root through a symbolic link", async () => {
  const { root, carrierPath } = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "resolve-markdown-link-target-outside-"));
  await writeFile(join(outside, "secret.md"), "# Secret\n");
  await symlink(join(outside, "secret.md"), join(root, "notes", "escape-link.md"));
  const result = await resolveMarkdownLinkTarget("escape-link.md", { carrierPath, root });
  assert.equal(result.status, "escaped");
  assert.equal(result.resolved, false);
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});
