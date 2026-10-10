import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dataCustodyDirectories, dataCustodyDirectory, DATA_CUSTODY_KINDS } from "../src/data-custody-directory.mjs";
import { resolveDataCustodyDirectory } from "../scripts/resolve-data-custody-directory.mjs";
import { checkDataCustodyDirectory } from "../scripts/check-data-custody-directory.mjs";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "data-custody-directory-test-"));
}

test("resolves each of the three lawful kinds", () => {
  const root = "/example/root";
  for (const kind of DATA_CUSTODY_KINDS) {
    assert.equal(dataCustodyDirectory(root, kind), join(root, "data", kind));
  }
  assert.equal(dataCustodyDirectory(root, "records", "schema", "thing.json"), join(root, "data", "records", "schema", "thing.json"));
});

test("dataCustodyDirectories resolves all three at once, frozen", () => {
  const root = "/example/root";
  const directories = dataCustodyDirectories(root);
  assert.deepEqual(directories, {
    root,
    logs: join(root, "data", "logs"),
    records: join(root, "data", "records"),
    state: join(root, "data", "state"),
  });
  assert.equal(Object.isFrozen(directories), true);
});

test("a fourth kind throws TypeError", () => {
  assert.throws(() => dataCustodyDirectory("/example/root", "cache"), TypeError);
});

test("segment traversal throws TypeError", () => {
  assert.throws(() => dataCustodyDirectory("/example/root", "state", ".."), TypeError);
  assert.throws(() => dataCustodyDirectory("/example/root", "state", "."), TypeError);
  assert.throws(() => dataCustodyDirectory("/example/root", "state", "a/b"), TypeError);
  assert.throws(() => dataCustodyDirectory("/example/root", "state", ""), TypeError);
});

test("invalid root throws TypeError", () => {
  assert.throws(() => dataCustodyDirectory("", "state"), TypeError);
  assert.throws(() => dataCustodyDirectory(42, "state"), TypeError);
});

test("resolveDataCustodyDirectory optionally creates the directory", () => {
  const root = tempRoot();
  try {
    const directory = resolveDataCustodyDirectory(root, "state", ["locks"], { create: true });
    assert.equal(directory, join(root, "data", "state", "locks"));
    assert.equal(checkDataCustodyDirectory(root).conformant, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkDataCustodyDirectory reports conformant on a missing data/ directory", () => {
  const root = tempRoot();
  try {
    const result = checkDataCustodyDirectory(root);
    assert.equal(result.conformant, true);
    assert.deepEqual(result.offenders, []);
    assert.equal(Object.isFrozen(result), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkDataCustodyDirectory reports conformant on a clean trio", () => {
  const root = tempRoot();
  try {
    mkdirSync(join(root, "data", "logs"), { recursive: true });
    mkdirSync(join(root, "data", "records"), { recursive: true });
    mkdirSync(join(root, "data", "state"), { recursive: true });
    const result = checkDataCustodyDirectory(root);
    assert.equal(result.conformant, true);
    assert.deepEqual(result.offenders, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("checkDataCustodyDirectory reports offenders for an invented data/<topic>/ directory", () => {
  const root = tempRoot();
  try {
    mkdirSync(join(root, "data", "logs"), { recursive: true });
    mkdirSync(join(root, "data", "receipts"), { recursive: true });
    writeFileSync(join(root, "data", "stray.json"), "{}", "utf8");
    const result = checkDataCustodyDirectory(root);
    assert.equal(result.conformant, false);
    assert.deepEqual([...result.offenders].sort(), ["receipts", "stray.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI runs as an entrypoint when invoked through a bin-style symlink", () => {
  const scratch = tempRoot();
  try {
    const target = fileURLToPath(new URL("../scripts/resolve-data-custody-directory.mjs", import.meta.url));
    const link = join(scratch, "resolve-data-custody-directory");
    symlinkSync(target, link);
    const result = spawnSync(process.execPath, [link, "--root", "/svc/root", "--kind", "logs"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), join("/svc/root", "data", "logs"));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
