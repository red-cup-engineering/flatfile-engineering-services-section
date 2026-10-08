import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { walkPosixPaths, walkPosixPathsSync } from "../scripts/walk-posix-paths.mjs";

async function buildFixture() {
  const root = await mkdtemp(join(tmpdir(), "path-walking-"));
  // The symlink target lives outside root entirely, so anything found under
  // it in a walk would prove the symlink was followed rather than recorded.
  const outsideTarget = await mkdtemp(join(tmpdir(), "path-walking-outside-"));
  await mkdir(join(root, "src", "nested"), { recursive: true });
  await mkdir(join(root, "node_modules", "left-pad"), { recursive: true });
  await mkdir(join(root, ".git"), { recursive: true });
  await writeFile(join(root, "README.md"), "# fixture\n");
  await writeFile(join(root, "src", "index.mjs"), "export {};\n");
  await writeFile(join(root, "src", "nested", "data.json"), "{}\n");
  await writeFile(join(root, "src", "nested", "notes"), "no extension\n");
  await writeFile(join(root, "node_modules", "left-pad", "index.js"), "module.exports = {};\n");
  await writeFile(join(root, ".git", "HEAD"), "ref: refs/heads/main\n");
  await writeFile(join(outsideTarget, "hidden.txt"), "should not be walked\n");
  await symlink(outsideTarget, join(root, "src", "linked-dir"));
  return { root, outsideTarget };
}

test("walks a real tree and skips symlinked directories", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const walk = await walkPosixPaths({ root, excludes: ["node_modules", ".git"] });
    assert.equal(walk.type, "PosixPathWalk");
    assert.equal(walk.root, root);

    const paths = walk.files.map((file) => file.path);
    assert.deepEqual(paths, [
      "README.md",
      "src/index.mjs",
      "src/linked-dir",
      "src/nested/data.json",
      "src/nested/notes",
    ]);

    const symlinkEntry = walk.files.find((file) => file.path === "src/linked-dir");
    assert.equal(symlinkEntry.kind, "symlink");
    assert.equal(paths.some((path) => path.includes("hidden.txt")), false, "symlinked dir must not be traversed");

    const readme = walk.files.find((file) => file.path === "README.md");
    assert.equal(readme.kind, "file");
    assert.equal(readme.bytes, (await readFile(join(root, "README.md"))).byteLength);

    // node_modules (1 dir entry) and .git (1 dir entry) pruned at their own segment.
    assert.equal(walk.excluded, 2);
    // src, src/nested — node_modules and .git are excluded before their
    // interiors are ever visited, so they do not add to the count.
    assert.equal(walk.directories, 2);

    assert.ok(Object.isFrozen(walk));
    assert.ok(Object.isFrozen(walk.files));
    assert.ok(Object.isFrozen(walk.files[0]));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("two walks of the same tree are byte-identical", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const first = await walkPosixPaths({ root, excludes: ["node_modules", ".git"] });
    const second = await walkPosixPaths({ root, excludes: ["node_modules", ".git"] });
    assert.equal(JSON.stringify(first), JSON.stringify(second));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("with no excludes, node_modules and .git are walked like anything else", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const walk = await walkPosixPaths({ root });
    const paths = walk.files.map((file) => file.path);
    assert.ok(paths.includes("node_modules/left-pad/index.js"));
    assert.ok(paths.includes(".git/HEAD"));
    assert.equal(walk.excluded, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("glob-lite exclude matches a segment prefix", async () => {
  const root = await mkdtemp(join(tmpdir(), "path-walking-glob-"));
  try {
    await mkdir(join(root, "build-output"), { recursive: true });
    await writeFile(join(root, "build-output", "bundle.js"), "1\n");
    await writeFile(join(root, "keep.js"), "1\n");
    const walk = await walkPosixPaths({ root, excludes: ["build-*"] });
    assert.deepEqual(walk.files.map((file) => file.path), ["keep.js"]);
    assert.equal(walk.excluded, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("root is required", async () => {
  await assert.rejects(() => walkPosixPaths({}), TypeError);
});

test("maxEntries bounds actual observed directory entries", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const walk = await walkPosixPaths({ root, excludes: ["node_modules", ".git"], maxEntries: 2 });
    assert.equal(walk.scanned, 2);
    assert.equal(walk.truncated, true);
    assert.ok(walk.files.length <= 2);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("sync and async adapters have exact policy and projection parity", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const options = {
      root,
      excludes: ["node_modules", ".git"],
      extensions: [".md", ".json"],
      includeFile: ({ path }) => !path.includes("data"),
      maxDepth: 3,
      symlinks: "skip",
      paths: "absolute",
      result: "paths",
    };
    const sync = walkPosixPathsSync(options);
    const async = await walkPosixPaths(options);
    assert.deepEqual(sync, async);
    assert.deepEqual(sync.files, [join(root, "README.md")]);
    assert.equal(sync.skipped, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("missing roots can throw or project an empty walk in both adapters", async () => {
  const root = join(tmpdir(), `absent-path-walking-${process.pid}-${Date.now()}`);
  assert.throws(() => walkPosixPathsSync({ root }), { code: "ENOENT" });
  await assert.rejects(() => walkPosixPaths({ root }), { code: "ENOENT" });
  const sync = walkPosixPathsSync({ root, missing: "empty" });
  const async = await walkPosixPaths({ root, missing: "empty" });
  assert.deepEqual(sync, async);
  assert.deepEqual(sync.files, []);
});

test("symlink refusal, depth bounds, and relative path projection are shared", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    assert.throws(() => walkPosixPathsSync({ root, symlinks: "refuse" }), /symbolic link refused/u);
    await assert.rejects(() => walkPosixPaths({ root, symlinks: "refuse" }), /symbolic link refused/u);
    const sync = walkPosixPathsSync({ root, maxDepth: 0, result: "paths" });
    const async = await walkPosixPaths({ root, maxDepth: 0, result: "paths" });
    assert.deepEqual(sync, async);
    assert.deepEqual(sync.files, ["README.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("inspectEntry sees every non-excluded file, directory, and symlink with sync/async parity", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const observed = [];
    const inspectEntry = (entry) => observed.push(entry);
    await walkPosixPaths({ root, excludes: ["node_modules", ".git"], inspectEntry });
    const asyncEntries = observed.splice(0);
    walkPosixPathsSync({ root, excludes: ["node_modules", ".git"], inspectEntry });
    assert.deepEqual(observed, asyncEntries);
    assert.ok(observed.some(({ path, kind }) => path === "README.md" && kind === "file"));
    assert.ok(observed.some(({ path, kind }) => path === "src" && kind === "directory"));
    assert.ok(observed.some(({ path, kind }) => path === "src/linked-dir" && kind === "symlink"));
    assert.ok(observed.every(Object.isFrozen));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("inspectEntry can refuse an empty unsafe directory before descent", async () => {
  const root = await mkdtemp(join(tmpdir(), "path-walking-inspect-"));
  const refusal = new Error("unsafe entry refused");
  const admitEntry = ({ name }) => { if (name === "empty-secret") throw refusal; };
  try {
    await mkdir(join(root, "empty-secret"));
    assert.throws(() => walkPosixPathsSync({ root, inspectEntry: admitEntry }), refusal);
    await assert.rejects(() => walkPosixPaths({ root, inspectEntry: admitEntry }), refusal);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("excludes run before inspectEntry", async () => {
  const { root, outsideTarget } = await buildFixture();
  try {
    const seen = [];
    await walkPosixPaths({ root, excludes: [".git"], inspectEntry: ({ path }) => seen.push(path) });
    assert.ok(!seen.some((path) => path === ".git" || path.startsWith(".git/")));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outsideTarget, { recursive: true, force: true });
  }
});

test("inspectEntry errors propagate unchanged", async () => {
  const root = await mkdtemp(join(tmpdir(), "path-walking-error-"));
  const error = new RangeError("inspection failed");
  try {
    await writeFile(join(root, "file.txt"), "text\n");
    assert.throws(() => walkPosixPathsSync({ root, inspectEntry: () => { throw error; } }), error);
    await assert.rejects(() => walkPosixPaths({ root, inspectEntry: async () => { throw error; } }), error);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
