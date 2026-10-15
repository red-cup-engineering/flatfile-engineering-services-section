import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeFileBytes, writeFileBytesSync, writeFileText, writeFileTextSync } from "../scripts/write-file.mjs";

const writers = [
  ["text sync", writeFileTextSync, "replacement"],
  ["text async", writeFileText, "replacement"],
  ["bytes sync", writeFileBytesSync, Buffer.from([0, 255, 128])],
  ["bytes async", writeFileBytes, new Uint8Array([0, 255, 128])],
];
function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "file-temporary-custody-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

// A generated name is only a candidate. Exclusive open must succeed before
// failure cleanup has custody of that path, regardless of publication mode.
for (const [name, writer, data] of writers) {
  for (const flag of [undefined, "wx"]) {
    for (const existing of [false, true]) {
      test(`${name}: temporary collision preserves foreign custody (${flag ?? "replace"}, destination ${existing ? "present" : "absent"})`, async (t) => {
        const root = fixture(t), path = join(root, "file");
        const temporary = join(root, `.file.${process.pid}.collision.tmp`);
        if (existing) fs.writeFileSync(path, "original destination");
        fs.writeFileSync(temporary, "foreign temporary", { mode: 0o600 });
        const before = fs.statSync(temporary);
        const original = crypto.randomUUID;
        crypto.randomUUID = () => "collision";
        syncBuiltinESMExports();
        try {
          await assert.rejects(async () => writer(path, data, { flag }), { code: "EEXIST" });
        } finally {
          crypto.randomUUID = original;
          syncBuiltinESMExports();
        }
        assert.equal(fs.readFileSync(temporary, "utf8"), "foreign temporary");
        const after = fs.statSync(temporary);
        assert.equal(after.ino, before.ino);
        assert.equal(after.mode, before.mode);
        assert.equal(fs.existsSync(path), existing);
        if (existing) assert.equal(fs.readFileSync(path, "utf8"), "original destination");
      });
    }
  }

  test(`${name}: failed owned temporary write cleans up and preserves destination`, async (t) => {
    const root = fixture(t), path = join(root, "file");
    fs.writeFileSync(path, "original destination");
    const failure = Object.assign(new Error("injected write failure"), { code: "EIO" });
    const originalWrite = fs.writeFileSync, originalOpen = fsp.open;
    fs.writeFileSync = (fd, ...args) => {
      if (typeof fd !== "number") return originalWrite(fd, ...args);
      originalWrite(fd, "partial");
      throw failure;
    };
    fsp.open = async (...args) => {
      const handle = await originalOpen(...args);
      if (args[1] === "wx") {
        const write = handle.writeFile.bind(handle);
        handle.writeFile = async () => { await write("partial"); throw failure; };
      }
      return handle;
    };
    syncBuiltinESMExports();
    try {
      await assert.rejects(async () => writer(path, data), error => error === failure);
    } finally {
      fs.writeFileSync = originalWrite;
      fsp.open = originalOpen;
      syncBuiltinESMExports();
    }
    assert.equal(fs.readFileSync(path, "utf8"), "original destination");
    assert.deepEqual(fs.readdirSync(root), ["file"]);
  });
}
