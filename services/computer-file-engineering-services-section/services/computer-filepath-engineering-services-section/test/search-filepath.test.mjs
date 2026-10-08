import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  listFilepathsMatchingString,
  listMentionsOfStringUnderFilepath,
  command,
} from "../scripts/search-filepath.mjs";


async function withFixture(run) {
  const root = await mkdtemp(join(tmpdir(), "search-filepath-"));
  try {
    await mkdir(join(root, "deploy"));
    await mkdir(join(root, "node_modules"));
    await mkdir(join(root, ".hidden"));
    await mkdir(join(root, "services", "witness-journal-service"), { recursive: true });
    await writeFile(join(root, "deploy", "unit.service"), "first Needle\nneedle and needle\n");
    await writeFile(join(root, "node_modules", "cached.txt"), "needle\n");
    await writeFile(join(root, ".hidden", "note.txt"), "needle\n");
    await writeFile(join(root, "binary.bin"), Buffer.from([110, 101, 101, 100, 108, 101, 0]));
    await writeFile(join(root, "services", "witness-journal-service", "README.md"), "unrelated\n");
    await symlink(join(root, "deploy", "unit.service"), join(root, "WitnessJournal.md"));
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("lists every literal mention with deterministic filepath, line, column, and matched text", async () => {
  await withFixture(async (root) => {
    const matches = await listMentionsOfStringUnderFilepath({ root, string: "needle", caseSensitive: false });
    assert.deepEqual(matches, [
      { path: ".hidden/note.txt", line: 1, column: 1, match: "needle" },
      { path: "deploy/unit.service", line: 1, column: 7, match: "Needle" },
      { path: "deploy/unit.service", line: 2, column: 1, match: "needle" },
      { path: "deploy/unit.service", line: 2, column: 12, match: "needle" },
      { path: "node_modules/cached.txt", line: 1, column: 1, match: "needle" },
    ]);
    assert.ok(Object.isFrozen(matches));
    assert.ok(Object.isFrozen(matches[0]));
  });
});

test("searches hidden and ignored paths by default and applies only explicit segment exclusions", async () => {
  await withFixture(async (root) => {
    const matches = await listMentionsOfStringUnderFilepath({
      root,
      string: "needle",
      excludes: ["node_*", ".hidden"],
    });
    assert.deepEqual(matches.map(({ path }) => path), ["deploy/unit.service", "deploy/unit.service"]);
  });
});

test("skips binary files and honors an explicit per-file byte bound", async () => {
  await withFixture(async (root) => {
    const matches = await listMentionsOfStringUnderFilepath({ root, string: "needle", maxBytes: 12 });
    assert.deepEqual(matches.map(({ path }) => path), [".hidden/note.txt", "node_modules/cached.txt"]);
  });
});

test("accepts a regular file as the root filepath", async () => {
  await withFixture(async (root) => {
    const path = join(root, "deploy", "unit.service");
    const matches = await listMentionsOfStringUnderFilepath({ root: path, string: "Needle" });
    assert.deepEqual(matches, [{ path: "unit.service", line: 1, column: 7, match: "Needle" }]);
  });
});

test("matches full filepaths with separator tolerance and exact-basename ranking", async () => {
  await withFixture(async (root) => {
    const matches = await listFilepathsMatchingString({ root, string: "WitnessJournal" });
    assert.deepEqual(matches, [
      { path: "WitnessJournal.md", matchKind: "filepath", matchedText: "WitnessJournal", score: 1 },
      { path: "services/witness-journal-service/README.md", matchKind: "filepath", matchedText: "witness-journal", score: 0.8 },
    ]);
  });
});

test("filepath matching supports case sensitivity, word boundaries, and explicit exclusions", async () => {
  await withFixture(async (root) => {
    assert.deepEqual(
      await listFilepathsMatchingString({ root, string: "witnessJournal", caseSensitive: true }),
      [{ path: "services/witness-journal-service/README.md", matchKind: "filepath", matchedText: "witness-journal", score: 0.8 }],
    );
    assert.deepEqual(
      await listFilepathsMatchingString({ root, string: "journal", wordBoundary: true, excludes: ["services"] }),
      [],
    );
  });
});

/** Run the declared command over captured streams. */
async function runDeclared(argv) {
  let output = "";
  await command.run({ argv, stdout: { write(text) { output += text; return true; } }, stderr: { write() { return true; } } });
  return output;
}

test("the declared command emits one NDJSON record per mention", async () => {
  await withFixture(async (root) => {
    const stdout = await runDeclared(["--root", root, "--string", "Needle"]);
    assert.deepEqual(stdout.trim().split("\n").map(JSON.parse), [
      { path: "deploy/unit.service", line: 1, column: 7, match: "Needle" },
    ]);
  });
});

test("the declared command exposes filepath-name matching as an explicit scope", async () => {
  await withFixture(async (root) => {
    const stdout = await runDeclared(["--root", root, "--string", "WitnessJournal", "--scope", "filepath"]);
    assert.deepEqual(stdout.trim().split("\n").map(JSON.parse).map(({ path }) => path), [
      "WitnessJournal.md",
      "services/witness-journal-service/README.md",
    ]);
  });
});

test("invalid or incomplete arguments refuse with usage status 64", async () => {
  await assert.rejects(runDeclared(["--root", "."]), (error) => command.exitCode(error) === 64 && /string must be a nonempty string/u.test(command.formatError(error)));
});
