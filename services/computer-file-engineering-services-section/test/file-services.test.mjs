import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Readable } from "node:stream";

import { command as readFileCommand, readFileBytes, readFileText } from "../scripts/read-file.mjs";
import { command as searchFileCommand, searchFile } from "../scripts/search-file.mjs";
import { command as searchFilesCommand, searchFiles } from "../scripts/search-files.mjs";
import { command as writeFileCommand, writeFileBytes, writeFileText } from "../scripts/write-file.mjs";

/** Run a declared command over captured streams; resolves to its standard output. */
async function runDeclared(command, argv, input = "") {
  let stdout = "";
  await command.run({ argv, stdin: Readable.from([input]), stdout: { write(text) { stdout += text; return true; } }, stderr: { write() { return true; } } });
  return stdout;
}

test("read and atomic write operations compose over the same UTF-8 carrier", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "nested", "example.txt");

  const receipt = await writeFileText(path, "hello\n");
  assert.deepEqual(receipt, { path, bytes: 6 });
  assert.equal(await readFileText(path), "hello\n");
  assert.deepEqual(await readFileBytes(path), Buffer.from("hello\n"));
});

test("writeFileBytes round-trips arbitrary binary data without UTF-8 corruption", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-bytes-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "nested", "example.bin");
  const bytes = Buffer.from([0x00, 0xff, 0x80, 0x01, 0xfe]);

  const receipt = await writeFileBytes(path, bytes);
  assert.deepEqual(receipt, { path, bytes: 5 });
  assert.deepEqual(await readFileBytes(path), bytes);
});

test("writeFileBytes rejects a non-Buffer/Uint8Array payload", async () => {
  await assert.rejects(() => writeFileBytes("/tmp/whatever", "not bytes"), TypeError);
});

test("readFileText fatal option decodes strictly instead of substituting replacement characters", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-fatal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "invalid.txt");
  await writeFile(path, Buffer.from([0x68, 0x69, 0xff, 0x0a]));

  assert.equal(await readFileText(path), "hi�\n");
  await assert.rejects(() => readFileText(path, { fatal: true }), TypeError);
});

test("writeFileText flag wx creates only when the path is absent and never overwrites", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-wx-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "nested", "guarded.txt");

  const receipt = await writeFileText(path, "first\n", { flag: "wx" });
  assert.deepEqual(receipt, { path, bytes: 6 });
  await assert.rejects(() => writeFileText(path, "second\n", { flag: "wx" }), (error) => error.code === "EEXIST");
  assert.equal(await readFileText(path), "first\n");
});

test("writeFileText mode option sets explicit permission bits", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-mode-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "executable.sh");

  await writeFileText(path, "#!/bin/sh\n", { mode: 0o755 });
  assert.equal((await stat(path)).mode & 0o777, 0o755);
});

test("command modules import without effects and declare their commands", () => {
  for (const command of [readFileCommand, searchFileCommand, searchFilesCommand, writeFileCommand]) assert.equal(typeof command.run, "function");
});

test("search-file returns immutable byte-span evidence for one file carrier", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-search-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "bytes.bin");
  await writeFile(path, Buffer.from([0, 1, 0, 1, 0]));

  const result = await searchFile({ path, needle: new Uint8Array([0, 1, 0]) });
  assert.deepEqual(result, {
    type: "SearchEvidence",
    carrier: { type: "FileByteCarrier", path },
    relation: "contains",
    evidence: [
      { type: "ByteSpan", byteOffset: 0, byteLength: 3 },
      { type: "ByteSpan", byteOffset: 2, byteLength: 3 },
    ],
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.carrier), true);
  assert.equal(Object.isFrozen(result.evidence), true);
  assert.equal(Object.isFrozen(result.evidence[0]), true);
});

test("search-file reports absence without synthetic evidence", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-search-absent-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "bytes.bin");
  await writeFile(path, Buffer.from([0, 255, 2]));

  const result = await searchFile({ path, needle: new Uint8Array([255, 3]) });
  assert.deepEqual(result, {
    type: "SearchEvidence",
    carrier: { type: "FileByteCarrier", path },
    relation: "absent",
    evidence: [],
  });
});

test("search-file command accepts only explicit lossless byte encodings", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-search-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "bytes.bin");
  await writeFile(path, Buffer.from([0xff, 0x00, 0xff]));

  const stdout = await runDeclared(searchFileCommand, ["--needle-base64", "/wA=", path]);
  assert.deepEqual(JSON.parse(stdout), {
    type: "SearchEvidence",
    carrier: { type: "FileByteCarrier", path },
    relation: "contains",
    evidence: [{ type: "ByteSpan", byteOffset: 0, byteLength: 2 }],
  });
  await assert.rejects(runDeclared(searchFileCommand, ["text", path]), /usage:/);
});

test("search-files walks once, prioritizes regular files, and preserves its observation", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-searches-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "content"), { recursive: true });
  await mkdir(join(root, "ignored"), { recursive: true });
  await writeFile(join(root, "a.bin"), Buffer.from("xx"));
  await writeFile(join(root, "content", "z.bin"), Buffer.from("xx"));
  await writeFile(join(root, "ignored", "skip.bin"), Buffer.from("xx"));

  const result = await searchFiles({
    root,
    needle: Buffer.from("x"),
    excludes: ["ignored"],
    priorityPaths: ["content"],
    maxEntries: 20,
  });
  assert.equal(result.type, "FileSearchAggregate");
  assert.equal(result.walk.type, "PosixPathWalk");
  assert.equal(result.walk.excluded, 1);
  assert.equal(result.walk.truncated, false);
  assert.deepEqual(result.evidence.map(({ carrier }) => carrier.path), [
    join(root, "content", "z.bin"),
    join(root, "a.bin"),
  ]);
  assert.ok(result.evidence.every(({ type }) => type === "SearchEvidence"));
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.evidence), true);
});

test("search-files command composes explicit priority and exclusion options", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-searches-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "first"), { recursive: true });
  await writeFile(join(root, "a.bin"), "x");
  await writeFile(join(root, "first", "z.bin"), "x");

  const stdout = await runDeclared(searchFilesCommand, ["--needle-hex", "78", root, "--priority-path", "first"]);
  const result = JSON.parse(stdout);
  assert.deepEqual(result.evidence.map(({ carrier }) => carrier.path), [join(root, "first", "z.bin"), join(root, "a.bin")]);
  await assert.rejects(runDeclared(searchFilesCommand, [root]), /usage:/);
});

test("write-file stdin output is readable by read-file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "file-services-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "example.txt");

  const written = await runDeclared(writeFileCommand, [path], "hello from stdin");
  assert.deepEqual(JSON.parse(written), { path, bytes: 16 });
  assert.equal(await runDeclared(readFileCommand, [path]), "hello from stdin");
  assert.equal(await readFile(path, "utf8"), "hello from stdin");
});
