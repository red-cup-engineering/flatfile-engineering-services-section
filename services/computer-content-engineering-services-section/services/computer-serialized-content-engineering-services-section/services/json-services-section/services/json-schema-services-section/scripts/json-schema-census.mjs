#!/usr/bin/env node
import { readFileSync, readdirSync, lstatSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { censusClassified, classifyCensusEntry, censusRecords, recordKindDeclaration } from "../dist/census.mjs";

// One census, three faces: `--root/--out` writes the recovery artifact, `--records` reads the
// tracked data/records kinds from git, and a stdin JSON request ({ root, maxBytes?, maxFiles? })
// answers with the classified census. All classification is src/census.mts; nothing here classifies.
export const inputSchema = {
  type: "object",
  required: ["root"],
  properties: {
    root: { type: "string" },
    maxBytes: { type: "integer", minimum: 1 },
    maxFiles: { type: "integer", minimum: 1 },
  },
};
export const outputSchema = {
  type: "object",
  required: ["entries", "counts", "roleCounts"],
};

const SKIPPED = new Set([".git", "node_modules", ".venv", ".pnpm-store", ".tmp", "dist", "runtime-images"]);

/** Classify every census-relevant file under an explicit root, retaining no source bodies; `exclude` is skipped, `maxBytes`/`maxFiles` bound the read. */
export function classifyTree(root, { exclude, maxBytes = Infinity, maxFiles = Infinity } = {}) {
  const entries = [], pending = [resolve(root)];
  let bytes = 0;
  while (pending.length) {
    const dir = pending.pop();
    for (const name of readdirSync(dir).sort()) {
      if (SKIPPED.has(name)) continue;
      const path = resolve(dir, name);
      if (path === exclude) continue;
      let info;
      try { info = lstatSync(path); } catch { continue; }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) { pending.push(path); continue; }
      if (!/\.(?:json|[cm]?[jt]s|md|rml|txt)$/u.test(name)) continue;
      bytes += info.size;
      if (bytes > maxBytes || entries.length >= maxFiles) throw new RangeError("schema census exceeds maxBytes or maxFiles");
      try { entries.push(classifyCensusEntry({ path: relative(root, path), content: readFileSync(path, "utf8") })); } catch { /* a mutable corpus may race the read; classify only observed files */ }
    }
  }
  return entries;
}

/** The request face: census of the schema artifacts under an explicit absolute root. */
export function censusSchemaPath({ root, maxBytes = 33554432, maxFiles = 20000 }) {
  if (typeof root !== "string" || !root.startsWith("/")) throw new TypeError("root must be an explicit absolute path");
  return censusClassified(classifyTree(resolve(root), { maxBytes, maxFiles }));
}

const USAGE = "usage: json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH [--verify] | json-schema-census --records --root ABSOLUTE_PATH [--rev REV] [--out ABSOLUTE_PATH] | json-schema-census < request.json";

async function main(args) {
  if (args.length === 0) {
    process.stdout.write(`${JSON.stringify(censusSchemaPath(JSON.parse(readFileSync(0, "utf8"))))}\n`);
    return;
  }
  const value = (flag) => { const at = args.indexOf(flag); return at < 0 ? undefined : args[at + 1]; };
  const rootArg = value("--root"), outArg = value("--out"), verify = args.includes("--verify"), records = args.includes("--records");
  if (!rootArg || (!outArg && !records)) throw new Error(USAGE);
  if (!rootArg.startsWith("/") || (outArg && !outArg.startsWith("/"))) throw new Error("root and out must be explicit absolute paths");
  const root = resolve(rootArg), out = outArg && resolve(outArg);

  /** Tracked blobs matching `select`, from `git ls-files -s` (or `git ls-tree -r` of a named revision); no tree is walked. */
  function trackedFiles(select, rev) {
    const listing = rev
      ? execFileSync("git", ["-C", root, "ls-tree", "-r", "-z", "--full-tree", rev], { maxBuffer: 2 ** 31 })
      : execFileSync("git", ["-C", root, "ls-files", "-s", "-z"], { maxBuffer: 2 ** 31 });
    return listing.toString("utf8").split("\0").filter(Boolean).flatMap((line) => {
      const tab = line.indexOf("\t"), [mode, second, third] = line.slice(0, tab).split(" "), path = line.slice(tab + 1);
      const blob = rev ? third : second, type = rev ? second : "blob";
      return mode === "160000" || type !== "blob" || !select(path) ? [] : [{ path, blob }];
    });
  }

  /** Read blobs through one `git cat-file --batch`: sizes for all, text for those `wanted` selects (heads bounded to `headBytes`). */
  function readBlobs(files, wanted, headBytes = 4096) {
    const blobs = [...new Set(files.map((file) => file.blob))];
    const output = execFileSync("git", ["-C", root, "cat-file", "--batch"], { input: `${blobs.join("\n")}\n`, maxBuffer: 2 ** 31 });
    const read = new Map();
    for (let offset = 0, index = 0; index < blobs.length; index += 1) {
      const newline = output.indexOf(10, offset), [blob, type, size] = output.subarray(offset, newline).toString("latin1").split(" ");
      if (type !== "blob") throw new Error(`git cat-file: ${blobs[index]} is ${type ?? "missing"}`);
      const start = newline + 1, bytes = Number(size);
      read.set(blob, { bytes, body: output.subarray(start, start + bytes) });
      offset = start + bytes + 1;
    }
    return files.map((file) => {
      const { bytes, body } = read.get(file.blob), entry = { path: file.path, blob: file.blob, bytes, head: body.subarray(0, headBytes).toString("utf8") };
      return wanted(file.path) ? { ...entry, content: body.toString("utf8") } : entry;
    });
  }

  if (records) {
    const rev = value("--rev");
    const recordFiles = trackedFiles((path) => `/${path}`.includes("/data/records/"), rev);
    const entries = readBlobs(recordFiles, (path) => path.endsWith(".schema.json") || /(?:^|\/)README\.md$/iu.test(path));
    const declarations = readBlobs(trackedFiles((path) => path.endsWith(".schema.json"), rev), () => true)
      .flatMap((entry) => { const declaration = recordKindDeclaration(entry.path, entry.content); return declaration ? [declaration] : []; });
    let head = null;
    try { head = execFileSync("git", ["-C", root, "rev-parse", "--verify", "--quiet", rev ?? "HEAD"], { stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim(); } catch { if (rev) throw new Error(`unknown revision: ${rev}`); }
    const result = { root, commit: head, source: rev ? `git ls-tree ${rev}` : "git ls-files", ...censusRecords(entries, declarations) };
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, text); }
    process.stdout.write(out ? `${JSON.stringify({ out, commit: head, totals: result.totals, readingCounts: result.readingCounts })}\n` : text);
  } else {
    const { canonicalJson: canonical } = await import("@red-cup-engineering/json-services-section/canonical-json");
    const result = censusClassified(classifyTree(root, { exclude: out })), bytes = `${canonical(result)}\n`;
    if (verify && existsSync(out) && readFileSync(out, "utf8") !== bytes) throw new Error(`census artifact differs: ${out}`);
    if (!verify) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, bytes); }
    process.stdout.write(`${JSON.stringify({ out, counts: result.counts, roleCounts: result.roleCounts })}\n`);
  }
}

if (import.meta.main) await main(process.argv.slice(2));
