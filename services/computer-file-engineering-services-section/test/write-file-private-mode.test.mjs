import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { writeFileBytes, writeFileBytesSync, writeFileText, writeFileTextSync } from "../scripts/write-file.mjs";

test("atomic writes apply explicit or preserved permissions before exposing temporary bytes", {
  skip: process.platform === "win32" ? "requires POSIX file mode semantics" : false,
}, async (t) => {
  const root = await fsp.mkdtemp(join(tmpdir(), "file-services-private-mode-"));
  const previousUmask = process.umask(0);
  const observed = [];
  const original = {
    open: fsp.open,
    writeFile: fsp.writeFile,
    openSync: fs.openSync,
    writeFileSync: fs.writeFileSync,
  };
  const isTemporary = (path) => typeof path === "string" && path.startsWith(`${root}/`) && path.endsWith(".tmp");
  const observe = (path) => {
    // writeFileSync can also call the observed openSync internally. Keep the
    // earliest sighting of each temporary file rather than double-counting it.
    if (!observed.some((entry) => entry.path === path)) {
      observed.push({ path, mode: fs.statSync(path).mode & 0o777 });
    }
  };

  // Observe both the corrected descriptor-based creation and the old writeFile
  // path. A final-mode assertion alone misses the old transient 0666 exposure.
  fsp.open = async (...args) => {
    const handle = await original.open(...args);
    if (isTemporary(args[0]) && args[1] === "wx") observe(args[0]);
    return handle;
  };
  fsp.writeFile = async (...args) => {
    const result = await original.writeFile(...args);
    if (isTemporary(args[0])) observe(args[0]);
    return result;
  };
  fs.openSync = (...args) => {
    const descriptor = original.openSync(...args);
    if (isTemporary(args[0]) && args[1] === "wx") observe(args[0]);
    return descriptor;
  };
  fs.writeFileSync = (...args) => {
    const result = original.writeFileSync(...args);
    if (isTemporary(args[0])) observe(args[0]);
    return result;
  };
  syncBuiltinESMExports();

  const writers = [
    ["text async", writeFileText, "private state\n"],
    ["text sync", writeFileTextSync, "private state\n"],
    ["bytes async", writeFileBytes, Buffer.from([0, 255, 128, 1])],
    ["bytes sync", writeFileBytesSync, new Uint8Array([0, 255, 128, 1])],
  ];
  const cases = [
    { name: "explicit private", options: { mode: 0o600 }, expected: 0o600 },
    { name: "exclusive private", options: { mode: 0o600, flag: "wx" }, expected: 0o600 },
    { name: "preserved private", initialMode: 0o600, expected: 0o600 },
    { name: "explicit readonly", options: { mode: 0o400 }, expected: 0o400 },
    { name: "explicit inaccessible", options: { mode: 0o000 }, expected: 0o000 },
    { name: "preserved readonly", initialMode: 0o400, expected: 0o400 },
    { name: "preserved inaccessible", initialMode: 0o000, expected: 0o000 },
    { name: "ordinary default", expected: 0o666 },
  ];

  try {
    let serial = 0;
    for (const [name, write, data] of writers) {
      for (const item of cases) {
        await t.test(`${name}: ${item.name}`, async () => {
          const path = join(root, `state-${serial++}`);
          if (item.initialMode !== undefined) {
            original.writeFileSync(path, "old state", { mode: item.initialMode });
          }
          observed.length = 0;
          const receipt = await write(path, data, item.options);
          assert.deepEqual(receipt, { path, bytes: Buffer.byteLength(data) });
          assert.equal(Object.isFrozen(receipt), true);
          assert.equal(observed.length, 1, "observe the actual temporary file before chmod/publish");
          assert.equal(observed[0].mode, item.expected, "temporary file permissions must already be correct");
          assert.equal(fs.statSync(path).mode & 0o777, item.expected, "final permissions remain unchanged");
          // Only the synthetic fixture is made readable, after checking its mode.
          fs.chmodSync(path, 0o600);
          assert.deepEqual(fs.readFileSync(path), Buffer.from(data));
          assert.equal(fs.readdirSync(root).some((file) => file.startsWith(`.${basename(path)}.`)), false);

          if (item.options?.flag === "wx") {
            const before = fs.readFileSync(path);
            observed.length = 0;
            await assert.rejects(async () => write(path, data, item.options), { code: "EEXIST" });
            assert.equal(observed.length, 1);
            assert.equal(observed[0].mode, 0o600, "rejected exclusive writes also protect temporary bytes");
            assert.deepEqual(fs.readFileSync(path), before);
            assert.equal(fs.statSync(path).mode & 0o777, 0o600);
            assert.equal(fs.readdirSync(root).some((file) => file.startsWith(`.${basename(path)}.`)), false);
          }
        });
      }
    }
  } finally {
    fsp.open = original.open;
    fsp.writeFile = original.writeFile;
    fs.openSync = original.openSync;
    fs.writeFileSync = original.writeFileSync;
    syncBuiltinESMExports();
    process.umask(previousUmask);
    await fsp.rm(root, { recursive: true, force: true });
  }
});
