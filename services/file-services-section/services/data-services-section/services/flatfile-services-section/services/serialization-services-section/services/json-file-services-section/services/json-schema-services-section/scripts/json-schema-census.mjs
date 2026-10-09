#!/usr/bin/env node
import { readFileSync, readdirSync, lstatSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { censusClassified, classifyCensusEntry, censusRecords, recordKindDeclaration } from "../src/census.mts";

const value = (flag) => { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; };
const rootArg = value("--root"), outArg = value("--out"), verify = process.argv.includes("--verify"), records = process.argv.includes("--records");
if (!rootArg || (!outArg && !records)) throw new Error("usage: json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH [--verify] | json-schema-census --records --root ABSOLUTE_PATH [--rev REV] [--out ABSOLUTE_PATH]");
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
  const { canonical } = await import("@red-cup-engineering/json-file-codec-service");
  const entries = [];
  function walk(dir) { for (const name of readdirSync(dir)) { if (name === ".git" || name === "node_modules" || name === ".venv" || name === ".pnpm-store" || name === ".tmp" || name === "dist" || name === "runtime-images") continue; const path = resolve(dir, name); if (path === out) continue; let info; try { info = lstatSync(path); } catch { continue; } if (info.isSymbolicLink()) continue; if (info.isDirectory()) walk(path); else if (/\.(?:json|[cm]?[jt]s|md|rml|txt)$/.test(name)) { try { entries.push(classifyCensusEntry({ path: relative(root, path), content: readFileSync(path, "utf8") })); } catch { /* a mutable corpus may race the read; classify only observed files */ } } } }
  walk(root); const result = censusClassified(entries); const bytes = `${canonical(result)}\n`;
  if (verify && existsSync(out) && readFileSync(out, "utf8") !== bytes) throw new Error(`census artifact differs: ${out}`);
  if (!verify) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, bytes); }
  process.stdout.write(`${JSON.stringify({ out, counts: result.counts, roleCounts: result.roleCounts })}\n`);
}
