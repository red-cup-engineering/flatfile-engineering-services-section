import { lstatSync, readdirSync } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const slash = (path) => path.split(sep).join("/");
const quote = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matcher = (pattern) => pattern.includes("*")
  ? (name) => new RegExp(`^${pattern.split("*").map(quote).join(".*")}$`).test(name)
  : (name) => name === pattern;

const POLICIES = { m: ["missing", "throw", "empty", "skip"], u: ["unreadable", "throw", "empty", "skip"], l: ["symlinks", "record", "skip", "refuse"], s: ["specialFiles", "skip", "refuse"], p: ["paths", "relative", "absolute"], r: ["result", "entries", "paths"] };

function options(value = {}) {
  const { root, excludes = [], extensions, includeFile = () => true, inspectEntry = () => {}, maxDepth = Infinity, maxEntries = Infinity } = value;
  if (typeof root !== "string" || !root) throw new TypeError("root is required");
  if (!Array.isArray(excludes) || !excludes.every((item) => typeof item === "string" && item)) throw new TypeError("invalid excludes");
  if (extensions !== undefined && (!Array.isArray(extensions) || !extensions.every((item) => typeof item === "string" && item.startsWith(".")))) throw new TypeError("invalid extensions");
  if (typeof includeFile !== "function") throw new TypeError("invalid includeFile");
  if (typeof inspectEntry !== "function") throw new TypeError("invalid inspectEntry");
  for (const [name, limit] of [["maxDepth", maxDepth], ["maxEntries", maxEntries]]) if (limit !== Infinity && (!Number.isInteger(limit) || limit < 0)) throw new TypeError(`invalid ${name}`);
  const n = { root: resolve(root), x: excludes.map(matcher), e: extensions && new Set(extensions.map((item) => item.toLowerCase())), i: includeFile, v: inspectEntry, d: maxDepth, n: maxEntries };
  for (const [key, [name, fallback, ...accepted]] of Object.entries(POLICIES)) {
    n[key] = value[name] ?? fallback;
    if (![fallback, ...accepted].includes(n[key])) throw new TypeError(`invalid ${name}`);
  }
  return n;
}

function disposition(error, c) {
  return error?.code === "ENOENT" || error?.code === "ENOTDIR" ? c.m : c.u;
}

function* program(c) {
  const f = [], q = [{ a: c.root, r: "", d: 0 }];
  let dirs = 0, cut = 0, seen = 0, skip = 0, trunc = false;
  while (q.length && !trunc) {
    const dir = q.pop();
    let entries;
    try { entries = yield ["readdir", dir.a]; }
    catch (error) {
      const action = disposition(error, c);
      if (action === "throw") throw error;
      if (action === "empty" && dir.d === 0) break;
      skip += 1; continue;
    }
    const kids = [];
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (seen >= c.n) { trunc = true; break; }
      if (c.x.some((match) => match(entry.name))) { cut += 1; continue; }
      seen += 1;
      const abs = resolve(dir.a, entry.name);
      const rel = dir.r ? `${dir.r}/${slash(entry.name)}` : slash(entry.name);
      // A directory entry already carries its kind; only the entries result, which reports
      // sizes, needs the lstat.
      let st = entry;
      if (c.r === "entries") {
        try { st = yield ["lstat", abs]; }
        catch (error) { if (disposition(error, c) === "throw") throw error; skip += 1; continue; }
      }
      const kind = st.isSymbolicLink() ? "symlink" : st.isDirectory() ? "directory" : st.isFile() ? "file" : "special";
      yield ["inspect", c.v, Object.freeze({ path: rel, absolutePath: abs, name: entry.name, kind, depth: dir.d })];
      if (st.isSymbolicLink()) {
        if (c.l === "refuse") throw new Error(`symbolic link refused: ${rel}`);
        if (c.l === "record") f.push({ r: rel, a: abs, k: "symlink", b: st.size });
        else skip += 1;
      } else if (st.isDirectory()) {
        dirs += 1;
        if (dir.d < c.d) kids.push({ a: abs, r: rel, d: dir.d + 1 });
      } else if (st.isFile()) {
        const file = { path: rel, absolutePath: abs, name: entry.name, extension: extname(entry.name).toLowerCase(), depth: dir.d };
        if ((!c.e || c.e.has(file.extension)) && c.i(Object.freeze(file))) f.push({ r: rel, a: abs, k: "file", b: st.size });
      } else if (c.s === "refuse") throw new Error(`special file refused: ${rel}`);
      else skip += 1;
    }
    for (let index = kids.length - 1; index >= 0; index -= 1) q.push(kids[index]);
  }
  f.sort((a, b) => a.r.localeCompare(b.r));
  const files = f.map((file) => {
    const path = c.p === "absolute" ? file.a : file.r;
    return c.r === "paths" ? path : Object.freeze({ path, kind: file.k, bytes: file.b });
  });
  return Object.freeze({ type: "PosixPathWalk", root: c.root, files: Object.freeze(files), directories: dirs, excluded: cut, scanned: seen, skipped: skip, truncated: trunc });
}

function sync(generator) {
  let step = generator.next();
  while (!step.done) try {
    const [operation, value, entry] = step.value;
    let result = operation === "readdir" ? readdirSync(value, { withFileTypes: true }) : operation === "lstat" ? lstatSync(value) : value(entry);
    if (operation === "inspect" && result?.then) throw new TypeError("inspectEntry must be synchronous in walkPosixPathsSync");
    step = generator.next(result);
  }
  catch (error) { step = generator.throw(error); }
  return step.value;
}

async function asyncWalk(generator) {
  let step = generator.next();
  while (!step.done) try {
    const [operation, value, entry] = step.value;
    const result = operation === "readdir" ? await readdir(value, { withFileTypes: true }) : operation === "lstat" ? await lstat(value) : await value(entry);
    step = generator.next(result);
  }
  catch (error) { step = generator.throw(error); }
  return step.value;
}

export const walkPosixPathsSync = (value) => sync(program(options(value)));
export async function walkPosixPaths(value) { return asyncWalk(program(options(value))); }
