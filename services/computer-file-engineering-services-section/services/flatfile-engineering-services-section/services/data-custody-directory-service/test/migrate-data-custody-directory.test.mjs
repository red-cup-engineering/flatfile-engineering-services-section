import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  applyDataCustodyMigrationPlan,
  applyDataCustodyMigrationRow,
  classifyDataCustodyEntry,
  planDataCustodyMigration,
} from "../src/migrate-data-custody-directory.mjs";
import {
  migrateDataCustodyDirectory,
  resolveMigrationDataDir,
} from "../scripts/migrate-data-custody-directory.mjs";
import { checkDataCustodyDirectory } from "../scripts/check-data-custody-directory.mjs";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "migrate-data-custody-directory-test-"));
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result;
}

function initGitRepo(root) {
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "test"]);
}

test("classifyDataCustodyEntry: journal-named directory classifies as logs", () => {
  const row = classifyDataCustodyEntry({ name: "journals", kind: "directory", isEmpty: false });
  assert.equal(row.classification, "logs");
  assert.equal(row.destination, "data/logs/journals");
  assert.match(row.reason, /journal\/event-stream/);
});

test("classifyDataCustodyEntry: .jsonl file classifies as logs regardless of name", () => {
  const row = classifyDataCustodyEntry({ name: "arrivals-feed.jsonl", kind: "file", isJsonlLike: true });
  assert.equal(row.classification, "logs");
  assert.equal(row.destination, "data/logs/arrivals-feed.jsonl");
});

test("classifyDataCustodyEntry: cache-named directory classifies as state", () => {
  const row = classifyDataCustodyEntry({ name: "forge-cache", kind: "directory", isEmpty: false });
  assert.equal(row.classification, "state");
  assert.equal(row.destination, "data/state/forge-cache");
});

test("classifyDataCustodyEntry: forge-out build-output directory classifies as state", () => {
  const row = classifyDataCustodyEntry({ name: "forge-out", kind: "directory", isEmpty: false });
  assert.equal(row.classification, "state");
});

test("classifyDataCustodyEntry: runtime directory classifies as state", () => {
  const row = classifyDataCustodyEntry({ name: "runtime", kind: "directory", isEmpty: false });
  assert.equal(row.classification, "state");
  assert.match(row.reason, /runtime\/cache\/lock\/store/);
});

test("classifyDataCustodyEntry: dated .json file classifies as records", () => {
  const row = classifyDataCustodyEntry({ name: "2026-09-03-deployment.json", kind: "file", hasDateInName: true });
  assert.equal(row.classification, "records");
  assert.match(row.reason, /YYYY-MM-DD date/);
});

test("classifyDataCustodyEntry: .json file with an observed_at top-level field classifies as records", () => {
  const row = classifyDataCustodyEntry({
    name: "snapshot.json",
    kind: "file",
    jsonTopLevelFields: ["observed_at", "value"],
  });
  assert.equal(row.classification, "records");
  assert.match(row.reason, /observed_at/);
});

test("classifyDataCustodyEntry: .json file with a recordedAt top-level field classifies as records", () => {
  const row = classifyDataCustodyEntry({
    name: "attestation.json",
    kind: "file",
    jsonTopLevelFields: ["recordedAt"],
  });
  assert.equal(row.classification, "records");
});

test("classifyDataCustodyEntry: schema file classifies as records", () => {
  const row = classifyDataCustodyEntry({ name: "thing.schema.json", kind: "file", isSchemaLike: true });
  assert.equal(row.classification, "records");
  assert.match(row.reason, /schema-file records pattern/);
});

test("classifyDataCustodyEntry: directory with a dated YYYY/MM/DD subtree classifies as records", () => {
  const row = classifyDataCustodyEntry({ name: "captures", kind: "directory", isEmpty: false, hasDatedSubtree: true });
  assert.equal(row.classification, "records");
  assert.equal(row.destination, "data/records/captures");
  assert.match(row.reason, /dated subtree/);
});

test("planDataCustodyMigration: a captures/ directory shaped as YYYY/MM/DD plans as records", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "captures", "2026", "08", "29", "systemd-user"), { recursive: true });
    writeFileSync(join(dataDir, "captures", "2026", "08", "29", "systemd-user", "x.service"), "[Unit]\n", "utf8");

    const plan = planDataCustodyMigration(dataDir);
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rows[0].entry, "captures");
    assert.equal(plan.rows[0].classification, "records");
    assert.equal(plan.refusals.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planDataCustodyMigration: an entry still referenced by a writer refuses instead of planning a move", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "cache"), { recursive: true });
    writeFileSync(join(dataDir, "cache", "x.json"), "{}", "utf8");
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, "scripts", "x.mjs"), 'const dir = "data/cache/";\n', "utf8");

    const plan = planDataCustodyMigration(dataDir);
    assert.equal(plan.rows.length, 0);
    assert.equal(plan.refusals.length, 1);
    assert.equal(plan.refusals[0].entry, "cache");
    assert.equal(plan.refusals[0].reason, "referenced-by-writer");
    assert.equal(plan.refusals[0].classification, "state");
    assert.deepEqual(plan.refusals[0].references, [join("scripts", "x.mjs")]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planDataCustodyMigration: the same package plans normally once the writer reference is removed", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "cache"), { recursive: true });
    writeFileSync(join(dataDir, "cache", "x.json"), "{}", "utf8");
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, "scripts", "x.mjs"), 'const dir = "elsewhere";\n', "utf8");

    const plan = planDataCustodyMigration(dataDir);
    assert.equal(plan.refusals.length, 0);
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rows[0].entry, "cache");
    assert.equal(plan.rows[0].classification, "state");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("classifyDataCustodyEntry: empty directory classifies as purge", () => {
  const row = classifyDataCustodyEntry({ name: "empty-leftover", kind: "directory", isEmpty: true });
  assert.equal(row.classification, "purge");
  assert.equal(row.destination, null);
});

test("classifyDataCustodyEntry: non-empty directory with no matching pattern is a refusal", () => {
  const row = classifyDataCustodyEntry({ name: "mystery", kind: "directory", isEmpty: false });
  assert.equal(row.reason, "unclassified");
  assert.equal(row.classification, undefined);
  assert.deepEqual(Object.keys(row).sort(), ["entry", "reason"]);
});

test("classifyDataCustodyEntry: plain .json file with no date or dated field is a refusal", () => {
  const row = classifyDataCustodyEntry({ name: "notes.json", kind: "file", jsonTopLevelFields: ["title", "body"] });
  assert.equal(row.reason, "unclassified");
});

test("planDataCustodyMigration: plan mode changes nothing on disk", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "logs"), { recursive: true });
    mkdirSync(join(dataDir, "forge-cache"), { recursive: true });
    writeFileSync(join(dataDir, "forge-cache", "x.json"), "{}", "utf8");
    mkdirSync(join(dataDir, "journals"), { recursive: true });

    const plan = planDataCustodyMigration(dataDir);
    assert.equal(plan.rows.length, 2);
    const byEntry = Object.fromEntries(plan.rows.map((r) => [r.entry, r]));
    assert.equal(byEntry["forge-cache"].classification, "state");
    assert.equal(byEntry.journals.classification, "logs");
    assert.equal(plan.refusals.length, 0);

    // nothing moved
    assert.equal(existsSync(join(dataDir, "forge-cache")), true);
    assert.equal(existsSync(join(dataDir, "journals")), true);
    assert.equal(existsSync(join(dataDir, "state")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planDataCustodyMigration: missing data/ directory yields an empty conformant plan", () => {
  const root = tempRoot();
  try {
    const plan = planDataCustodyMigration(join(root, "data"));
    assert.deepEqual(plan.rows, []);
    assert.deepEqual(plan.refusals, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("migrateDataCustodyDirectory: --apply moves offenders and the post-apply gate reports zero offenders", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "logs"), { recursive: true });
    mkdirSync(join(dataDir, "forge-cache"), { recursive: true });
    writeFileSync(join(dataDir, "forge-cache", "x.json"), "{}", "utf8");
    mkdirSync(join(dataDir, "journals"), { recursive: true });
    mkdirSync(join(dataDir, "empty-leftover"), { recursive: true });

    const planResult = migrateDataCustodyDirectory(dataDir, { apply: false });
    assert.equal(planResult.applied, null);
    assert.equal(planResult.offendersAfter, null);
    // nothing moved by a plan-mode call
    assert.equal(existsSync(join(dataDir, "forge-cache")), true);

    const applyResult = migrateDataCustodyDirectory(dataDir, { apply: true });
    assert.equal(applyResult.ok, true);
    assert.equal(applyResult.offendersAfter, 0);
    assert.equal(applyResult.applied.length, 3);

    assert.equal(existsSync(join(dataDir, "state", "forge-cache", "x.json")), true);
    assert.equal(existsSync(join(dataDir, "logs", "journals")), true);
    assert.equal(existsSync(join(dataDir, "empty-leftover")), false);
    assert.equal(existsSync(join(dataDir, "forge-cache")), false);

    const gate = checkDataCustodyDirectory(root);
    assert.equal(gate.conformant, true);
    assert.deepEqual(gate.offenders, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("migrateDataCustodyDirectory: refusals block --apply and are named in the result", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(join(dataDir, "mystery"), { recursive: true });
    writeFileSync(join(dataDir, "mystery", "keep.txt"), "hi", "utf8");

    const result = migrateDataCustodyDirectory(dataDir, { apply: true });
    assert.equal(result.ok, false);
    assert.equal(result.refusals.length, 1);
    assert.equal(result.refusals[0].entry, "mystery");
    assert.equal(result.refusals[0].reason, "unclassified");
    // the unclassified entry is left untouched
    assert.equal(existsSync(join(dataDir, "mystery", "keep.txt")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveMigrationDataDir: --package resolves through the package's own checker resolver", () => {
  const root = tempRoot();
  try {
    const resolved = resolveMigrationDataDir({ packageDir: root });
    assert.equal(resolved, join(root, "data"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveMigrationDataDir: throws when neither option is given", () => {
  assert.throws(() => resolveMigrationDataDir({}), /one of --data-dir or --package is required/);
});

test("applyDataCustodyMigrationRow: git-tracked entry moves via git mv", () => {
  const root = tempRoot();
  try {
    initGitRepo(root);
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "journals"), { recursive: true });
    writeFileSync(join(dataDir, "journals", "entry.jsonl"), "{}\n", "utf8");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "seed tracked journals"]);

    const plan = planDataCustodyMigration(dataDir);
    assert.equal(plan.rows.length, 1);
    const applied = applyDataCustodyMigrationRow(dataDir, plan.rows[0]);
    assert.equal(applied.method, "git-mv");
    assert.equal(existsSync(join(dataDir, "logs", "journals", "entry.jsonl")), true);
    assert.equal(existsSync(join(dataDir, "journals")), false);

    const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    assert.match(status.stdout, /^R {2}data\/journals\/entry\.jsonl -> data\/logs\/journals\/entry\.jsonl$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationRow: untracked entry in a git repo moves via plain rename", () => {
  const root = tempRoot();
  try {
    initGitRepo(root);
    writeFileSync(join(root, "README.md"), "seed", "utf8");
    git(root, ["add", "README.md"]);
    git(root, ["commit", "-qm", "seed"]);

    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "runtime"), { recursive: true });
    writeFileSync(join(dataDir, "runtime", "lock.json"), "{}", "utf8");

    const plan = planDataCustodyMigration(dataDir);
    const applied = applyDataCustodyMigrationRow(dataDir, plan.rows[0]);
    assert.equal(applied.method, "fs-rename");
    assert.equal(existsSync(join(dataDir, "state", "runtime", "lock.json")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationRow: gitignored entry moves via plain rename, not git mv", () => {
  const root = tempRoot();
  try {
    initGitRepo(root);
    writeFileSync(join(root, ".gitignore"), "data/runtime/\n", "utf8");
    git(root, ["add", ".gitignore"]);
    git(root, ["commit", "-qm", "seed gitignore"]);

    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "runtime"), { recursive: true });
    writeFileSync(join(dataDir, "runtime", "cache.bin"), "x", "utf8");

    const plan = planDataCustodyMigration(dataDir);
    const applied = applyDataCustodyMigrationRow(dataDir, plan.rows[0]);
    assert.equal(applied.method, "fs-rename");
    assert.equal(existsSync(join(dataDir, "state", "runtime", "cache.bin")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationRow: outside any git repo moves via plain rename", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "runtime"), { recursive: true });
    writeFileSync(join(dataDir, "runtime", "x.txt"), "x", "utf8");

    const plan = planDataCustodyMigration(dataDir);
    const applied = applyDataCustodyMigrationRow(dataDir, plan.rows[0]);
    assert.equal(applied.method, "fs-rename");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationRow: purge removes an empty directory via rmdir", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "empty-leftover"), { recursive: true });

    const plan = planDataCustodyMigration(dataDir);
    const row = plan.rows.find((r) => r.entry === "empty-leftover");
    const applied = applyDataCustodyMigrationRow(dataDir, row);
    assert.equal(applied.method, "rmdir");
    assert.equal(existsSync(join(dataDir, "empty-leftover")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationRow: throws on a refusal row", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "mystery"), { recursive: true });
    writeFileSync(join(dataDir, "mystery", "keep.txt"), "hi", "utf8");
    const plan = planDataCustodyMigration(dataDir);
    assert.throws(() => applyDataCustodyMigrationRow(dataDir, plan.refusals[0]), /unclassified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyDataCustodyMigrationPlan: applies every row in order", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "runtime"), { recursive: true });
    writeFileSync(join(dataDir, "runtime", "x.txt"), "x", "utf8");
    mkdirSync(join(dataDir, "journals"), { recursive: true });

    const plan = planDataCustodyMigration(dataDir);
    const applied = applyDataCustodyMigrationPlan(dataDir, plan.rows);
    assert.equal(applied.length, 2);
    assert.equal(existsSync(join(dataDir, "state", "runtime", "x.txt")), true);
    assert.equal(existsSync(join(dataDir, "logs", "journals")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI runs --plan by default and prints JSON without moving anything", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "forge-cache"), { recursive: true });
    writeFileSync(join(dataDir, "forge-cache", "x.json"), "{}", "utf8");

    const cliPath = new URL("../scripts/migrate-data-custody-directory.mjs", import.meta.url).pathname;
    const result = spawnSync(process.execPath, [cliPath, "--data-dir", dataDir], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.applied, null);
    assert.equal(parsed.rows[0].classification, "state");
    assert.equal(existsSync(join(dataDir, "forge-cache")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI exits 1 and names refusals when a --data-dir --apply hits an unclassified entry", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "mystery"), { recursive: true });
    writeFileSync(join(dataDir, "mystery", "keep.txt"), "hi", "utf8");

    const cliPath = new URL("../scripts/migrate-data-custody-directory.mjs", import.meta.url).pathname;
    const result = spawnSync(process.execPath, [cliPath, "--data-dir", dataDir, "--apply"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.refusals[0].entry, "mystery");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the CLI --help prints usage JSON and exits 0", () => {
  const cliPath = new URL("../scripts/migrate-data-custody-directory.mjs", import.meta.url).pathname;
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.kind, "data-custody.migrate.usage");
  assert.ok(Array.isArray(parsed.options) && parsed.options.length > 0);
});

test("the CLI refuses an unknown option as a datum, not a stack trace, and exits 2", () => {
  const cliPath = new URL("../scripts/migrate-data-custody-directory.mjs", import.meta.url).pathname;
  const result = spawnSync(process.execPath, [cliPath, "--data-dir", "/tmp", "--x"], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stderr, "");
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.kind, "data-custody.migrate.refusal");
  assert.equal(parsed.reason, "unknown-option");
  assert.equal(parsed.option, "--x");
  assert.ok(Array.isArray(parsed.usage) && parsed.usage.length > 0);
});

test("the CLI resolves --package to the section's data/ directory and exits 0 on --apply once conformant", () => {
  const root = tempRoot();
  try {
    const dataDir = join(root, "data");
    mkdirSync(join(dataDir, "journals"), { recursive: true });

    const cliPath = new URL("../scripts/migrate-data-custody-directory.mjs", import.meta.url).pathname;
    const result = spawnSync(process.execPath, [cliPath, "--package", root, "--apply"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.dataDir, dataDir);
    assert.equal(parsed.ok, true);
    assert.equal(existsSync(join(dataDir, "logs", "journals")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
