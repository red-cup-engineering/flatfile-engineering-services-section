import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { observeMarkdownVaultDirectory } from "../src/observe-markdown-vault-directory.mjs";

async function withVault(paths, run) {
  const root = await mkdtemp(join(tmpdir(), "markdown-reader-admission-"));
  try {
    for (const path of paths) {
      await mkdir(dirname(join(root, path)), {recursive: true});
      await writeFile(join(root, path), `# ${path}\n`);
    }
    await run(root);
  } finally { await rm(root, {recursive: true, force: true}); }
}

function counters(observation) {
  return Object.fromEntries(["enumerated", "scanned", "excluded", "available", "truncated"].map(key => [key, observation[key]]));
}

test("the caller's reader scope excludes unrelated sections and service control files", async () => {
  const paths = [
    "science-section/content/text/receiving-control.md",
    "unadmitted-section/content/text/receiving-control.md",
    "services/receiving-control.md",
  ];
  await withVault(paths, async root => {
    const calls = [];
    const observation = await observeMarkdownVaultDirectory({root, admitPath: path => {
      calls.push(path);
      return path.startsWith("science-section/");
    }});
    assert.deepEqual(observation.paths, [paths[0]]);
    assert.deepEqual(calls, [...paths].sort());
    assert.deepEqual(counters(observation), {enumerated: 3, scanned: 3, excluded: 2, available: 1, truncated: false});
    assert.deepEqual(observation.diagnostics, []);
  });
});

test("admission receives canonical root-relative paths when a region is selected", async () => {
  await withVault(["science-section/content/text/a.md", "science-section/content/text/b.md", "outside.md"], async root => {
    const calls = [];
    const observation = await observeMarkdownVaultDirectory({root, region: "./science-section/content/../content/text", admitPath: path => {
      calls.push(path);
      return path === "science-section/content/text/b.md";
    }});
    assert.equal(observation.region, "science-section/content/text");
    assert.deepEqual(calls, ["science-section/content/text/a.md", "science-section/content/text/b.md"]);
    assert.deepEqual(observation.paths, ["science-section/content/text/b.md"]);
    assert.deepEqual(counters(observation), {enumerated: 2, scanned: 2, excluded: 1, available: 1, truncated: false});
  });
});

test("reader rejection consumes maxScan while limit applies only to admitted paths", async () => {
  await withVault(["a.md", "b.md", "c.md", "d.md", "e.md"], async root => {
    const calls = [];
    const admitPath = path => { calls.push(path); return path !== "a.md" && path !== "c.md"; };
    const observation = await observeMarkdownVaultDirectory({root, admitPath, maxScan: 4, limit: 1});
    assert.deepEqual(calls, ["a.md", "b.md", "c.md", "d.md"]);
    assert.deepEqual(observation.paths, ["b.md"]);
    assert.deepEqual(counters(observation), {enumerated: 5, scanned: 4, excluded: 2, available: 2, truncated: true});
    calls.length = 0;
    const complete = await observeMarkdownVaultDirectory({root, admitPath, maxScan: 5, limit: 3});
    assert.deepEqual(complete.paths, ["b.md", "d.md", "e.md"]);
    assert.deepEqual(counters(complete), {enumerated: 5, scanned: 5, excluded: 2, available: 3, truncated: false});
    assert.equal(calls.length, 5);
  });
});

test("zero output and scan bounds retain their separate inventory meanings", async () => {
  await withVault(["a.md", "b.md"], async root => {
    let calls = 0;
    const admitPath = path => { calls += 1; return path === "b.md"; };
    const noScan = await observeMarkdownVaultDirectory({root, admitPath, maxScan: 0});
    assert.deepEqual(noScan.paths, []);
    assert.deepEqual(counters(noScan), {enumerated: 2, scanned: 0, excluded: 0, available: 0, truncated: true});
    assert.equal(calls, 0);
    const noOutput = await observeMarkdownVaultDirectory({root, admitPath, limit: 0});
    assert.deepEqual(noOutput.paths, []);
    assert.deepEqual(counters(noOutput), {enumerated: 2, scanned: 2, excluded: 1, available: 1, truncated: true});
    assert.equal(calls, 2);
  });
});

test("reader admission remains ordered and bounded across the 64-observation batch boundary", async () => {
  const paths = Array.from({length: 130}, (_, i) => `${String(i).padStart(3, "0")}.md`);
  await withVault(paths, async root => {
    const calls = [];
    const observation = await observeMarkdownVaultDirectory({root, maxScan: 129, limit: 200, admitPath: path => {
      calls.push(path);
      return Number.parseInt(path, 10) % 3 === 0;
    }});
    assert.deepEqual(calls, paths.slice(0, 129));
    assert.deepEqual(observation.paths, paths.slice(0, 129).filter(path => Number.parseInt(path, 10) % 3 === 0));
    assert.deepEqual(counters(observation), {enumerated: 130, scanned: 129, excluded: 86, available: 43, truncated: true});
  });
});

test("omitting a reader predicate retains the existing admit-all behavior", async () => {
  await withVault(["a.md", "nested/b.markdown", "ignored.txt", ".git/hidden.md"], async root => {
    const original = await observeMarkdownVaultDirectory({root});
    const explicit = await observeMarkdownVaultDirectory({root, admitPath: () => true});
    assert.deepEqual(explicit, original);
    assert.deepEqual(original.paths, ["a.md", "nested/b.markdown"]);
    assert.ok(Object.isFrozen(explicit));
    for (const key of ["paths", "diagnostics", "excludes"]) assert.ok(Object.isFrozen(explicit[key]));
  });
});

test("rejecting every candidate reports an empty complete inventory", async () => {
  await withVault(["a.md", "b.md"], async root => {
    const observation = await observeMarkdownVaultDirectory({root, admitPath: () => false});
    assert.deepEqual(observation.paths, []);
    assert.deepEqual(counters(observation), {enumerated: 2, scanned: 2, excluded: 2, available: 0, truncated: false});
  });
});

test("invalid predicate values fail before filesystem work, including empty inventories", async () => {
  for (const admitPath of [null, false, true, 1, "allow", {}, []]) {
    await assert.rejects(observeMarkdownVaultDirectory({admitPath}), {name: "TypeError", message: "admitPath must be a function"});
  }
  await withVault([], async root => {
    await assert.rejects(observeMarkdownVaultDirectory({root, maxScan: 0, limit: 0, admitPath: null}), /admitPath must be a function/u);
  });
});

test("a synchronous predicate must return a boolean, with async results failing closed", async () => {
  await withVault(["a.md"], async root => {
    for (const result of [undefined, null, 0, 1, "", "allow", {}, []]) {
      await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: () => result}), {name: "TypeError", message: "admitPath must return a boolean"});
    }
    await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: async () => false}), /admitPath must return a boolean/u);
  });
});

test("reader policy exceptions propagate unchanged, even when they resemble filesystem errors", async () => {
  await withVault(["a.md"], async root => {
    const failure = Object.assign(new Error("reader policy failed"), {code: "ENOENT"});
    await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: () => { throw failure; }}), error => error === failure);
  });
});

test("supplier-excluded symlinks and hidden directories never reach the reader predicate", async () => {
  await withVault(["a.md", ".git/hidden.md", "private/hidden.md"], async root => {
    await symlink(join(root, "a.md"), join(root, "linked.md"));
    await symlink(join(root, "missing-target.md"), join(root, "missing.md"));
    const calls = [];
    const observation = await observeMarkdownVaultDirectory({root, excludes: [".git", "private"], admitPath: path => { calls.push(path); return true; }});
    assert.deepEqual(calls, ["a.md"]);
    assert.deepEqual(observation.paths, ["a.md"]);
    assert.deepEqual(counters(observation), {enumerated: 1, scanned: 1, excluded: 0, available: 1, truncated: false});
  });
});

test("eligibility failures retain diagnostics for reader-admitted candidates", async t => {
  const codes = ["ENOENT", "ENOTDIR", "EACCES", "EPERM"];
  await withVault([...codes.map(code => `${code}.md`), "directory.md", "symlink.md", "yes.md"], async root => {
    const original = fs.promises.lstat;
    t.mock.method(fs.promises, "lstat", async path => {
      const name = basename(path, ".md");
      if (codes.includes(name)) throw Object.assign(new Error(`fixture ${name}`), {code: name});
      if (name === "directory") return {isSymbolicLink: () => false, isFile: () => false};
      if (name === "symlink") return {isSymbolicLink: () => true, isFile: () => true};
      return original(path);
    });
    syncBuiltinESMExports();
    try {
      const calls = [];
      const observation = await observeMarkdownVaultDirectory({root, admitPath: path => { calls.push(path); return true; }});
      assert.deepEqual(calls, [...codes.map(code => `${code}.md`), "directory.md", "symlink.md", "yes.md"].sort());
      assert.deepEqual(observation.paths, ["yes.md"]);
      assert.deepEqual(counters(observation), {enumerated: 7, scanned: 7, excluded: 6, available: 1, truncated: false});
      assert.deepEqual(observation.diagnostics.map(({code}) => code), [...codes].sort());
      assert.ok(observation.diagnostics.every(Object.isFrozen));
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  });
});

test("unexpected eligibility errors still abort the observation unchanged", async t => {
  await withVault(["a.md"], async root => {
    const failure = Object.assign(new Error("fixture I/O failure"), {code: "EIO"});
    t.mock.method(fs.promises, "lstat", async () => { throw failure; });
    syncBuiltinESMExports();
    try {
      await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: () => true}), error => error === failure);
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  });
});

test("reader-rejected candidates receive no eligibility I/O and disclose no diagnostic paths", async t => {
  await withVault(["science-section/yes.md", "unadmitted-section/no.md"], async root => {
    const original = fs.promises.lstat;
    const observed = [];
    t.mock.method(fs.promises, "lstat", async path => {
      observed.push(path);
      if (path.includes("unadmitted-section")) throw Object.assign(new Error("unadmitted path disappeared"), {code: "ENOENT"});
      return original(path);
    });
    syncBuiltinESMExports();
    try {
      const observation = await observeMarkdownVaultDirectory({root, admitPath: path => path.startsWith("science-section/")});
      assert.deepEqual(observation.diagnostics, []);
      assert.deepEqual(observed, [join(root, "science-section/yes.md")]);
      assert.deepEqual(observation.paths, ["science-section/yes.md"]);
      assert.deepEqual(counters(observation), {enumerated: 2, scanned: 2, excluded: 1, available: 1, truncated: false});
      assert.equal(JSON.stringify(observation).includes("unadmitted-section"), false);
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  });
});

test("invalid rejected promises are refused without leaving an unhandled rejection", async () => {
  await withVault(["a.md"], async root => {
    await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: async () => { throw Error("async policy failure"); }}), /admitPath must return a boolean/u);
    await assert.rejects(observeMarkdownVaultDirectory({root, admitPath: () => Promise.reject(Error("promised policy failure"))}), /admitPath must return a boolean/u);
    await new Promise(resolve => setImmediate(resolve));
  });
});
