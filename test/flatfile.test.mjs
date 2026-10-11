// flatfile.test.mjs -- conformance tests for every src/flatfile.mjs law: whole-file atomic write
// (OP1/OP2), UTF-8 whole-file text read (a round-trip with the writer), binarity sniff (including
// the edge case where the head block's very last byte is the NUL, and a short file shorter than
// the sniff window), and the plain file -> regular-file -> flatfile spine classifier. Hermetic
// temp-dir fixtures; no net.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { writeFlatfile, readFlatfileText, sniffFileBinarity, classifyFlatfile } from "../src/flatfile.mjs";

const withDir = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), "flatfile-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// === writeFlatfile ===============================================================================

test("writeFlatfile rejects a non-string path", () => {
  assert.throws(() => writeFlatfile(42, "x"), TypeError);
  assert.throws(() => writeFlatfile("", "x"), TypeError);
});

test("writeFlatfile rejects non-string content", () => {
  withDir((dir) => {
    assert.throws(() => writeFlatfile(join(dir, "a.txt"), 42), TypeError);
  });
});

test("writeFlatfile creates missing parent directories", () => {
  withDir((dir) => {
    const path = join(dir, "nested", "deeper", "a.txt");
    writeFlatfile(path, "hello");
    assert.equal(readFlatfileText(path), "hello");
  });
});

test("writeFlatfile returns the path written and leaves no temp file behind", () => {
  withDir((dir) => {
    const path = join(dir, "a.txt");
    const returned = writeFlatfile(path, "content");
    assert.equal(returned, path);
    const leftovers = readdirSync(dir).filter((name) => name !== "a.txt");
    assert.deepEqual(leftovers, []);
  });
});

test("writeFlatfile overwrites an existing file atomically (old-whole or new-whole only)", () => {
  withDir((dir) => {
    const path = join(dir, "a.txt");
    writeFlatfile(path, "old content");
    writeFlatfile(path, "new content");
    assert.equal(readFlatfileText(path), "new content");
  });
});

test("writeFlatfile cleans up its temp file when the write fails", () => {
  withDir((dir) => {
    // Point the target at a path whose parent cannot be created (a file where a directory is expected).
    const blocker = join(dir, "blocker");
    writeFileSync(blocker, "x");
    const path = join(blocker, "a.txt");
    assert.throws(() => writeFlatfile(path, "content"));
    // Nothing but the original blocker file should exist in dir.
    assert.deepEqual(readdirSync(dir), ["blocker"]);
  });
});

// === readFlatfileText: UTF-8 round-trip =========================================================

test("readFlatfileText round-trips exactly what writeFlatfile wrote, including multi-byte UTF-8", () => {
  withDir((dir) => {
    const path = join(dir, "utf8.txt");
    const text = "plain ascii, an em dash —, and 日本語 characters, and an emoji 🎉";
    writeFlatfile(path, text);
    assert.equal(readFlatfileText(path), text);
  });
});

test("readFlatfileText rejects a non-string path", () => {
  assert.throws(() => readFlatfileText(""), TypeError);
});

// === sniffFileBinarity ===========================================================================

test("sniffFileBinarity reports \"flat\" for a NUL-free file", () => {
  withDir((dir) => {
    const path = join(dir, "flat.txt");
    writeFileSync(path, "no null bytes here");
    assert.equal(sniffFileBinarity(path), "flat");
  });
});

test("sniffFileBinarity reports \"binary\" when a NUL appears anywhere in the head block", () => {
  withDir((dir) => {
    const path = join(dir, "binary.bin");
    writeFileSync(path, Buffer.from([0x61, 0x62, 0x00, 0x63]));
    assert.equal(sniffFileBinarity(path), "binary");
  });
});

test("sniffFileBinarity edge case: a NUL as the very last byte of the 8192-byte head block", () => {
  withDir((dir) => {
    const path = join(dir, "edge.bin");
    const buf = Buffer.alloc(8192, 0x61); // 'a' repeated
    buf[8191] = 0x00; // NUL exactly at the last byte of the sniff window
    writeFileSync(path, buf);
    assert.equal(sniffFileBinarity(path), "binary");
  });
});

test("sniffFileBinarity edge case: a NUL past the 8192-byte head block is not seen", () => {
  withDir((dir) => {
    const path = join(dir, "past-window.bin");
    const buf = Buffer.alloc(8193, 0x61);
    buf[8192] = 0x00; // one byte past the sniff window
    writeFileSync(path, buf);
    assert.equal(sniffFileBinarity(path), "flat");
  });
});

test("sniffFileBinarity handles a file shorter than the sniff window", () => {
  withDir((dir) => {
    const path = join(dir, "short.txt");
    writeFileSync(path, "hi");
    assert.equal(sniffFileBinarity(path), "flat");
  });
});

test("sniffFileBinarity handles an empty file", () => {
  withDir((dir) => {
    const path = join(dir, "empty.txt");
    writeFileSync(path, "");
    assert.equal(sniffFileBinarity(path), "flat");
  });
});

test("sniffFileBinarity rejects a non-string path", () => {
  assert.throws(() => sniffFileBinarity(""), TypeError);
});

// === classifyFlatfile: the file -> regular-file -> flatfile spine ==============================

test("classifyFlatfile classifies a NUL-free regular file as \"flatfile\"", () => {
  withDir((dir) => {
    const path = join(dir, "a.txt");
    writeFileSync(path, "plain text");
    assert.deepEqual(classifyFlatfile(path), {
      path,
      isRegularFile: true,
      binarity: "flat",
      kind: "flatfile",
    });
  });
});

test("classifyFlatfile classifies a regular file with a NUL as \"binary-file\"", () => {
  withDir((dir) => {
    const path = join(dir, "a.bin");
    writeFileSync(path, Buffer.from([0x00, 0x01]));
    assert.deepEqual(classifyFlatfile(path), {
      path,
      isRegularFile: true,
      binarity: "binary",
      kind: "binary-file",
    });
  });
});

test("classifyFlatfile classifies a directory as not a regular file, with null binarity and kind", () => {
  withDir((dir) => {
    const sub = join(dir, "subdir");
    mkdirSync(sub);
    assert.deepEqual(classifyFlatfile(sub), {
      path: sub,
      isRegularFile: false,
      binarity: null,
      kind: null,
    });
  });
});

test("classifyFlatfile rejects a non-string path", () => {
  assert.throws(() => classifyFlatfile(""), TypeError);
});

test("classifyFlatfile throws for a path that does not exist", () => {
  withDir((dir) => {
    assert.throws(() => classifyFlatfile(join(dir, "missing.txt")));
  });
});
