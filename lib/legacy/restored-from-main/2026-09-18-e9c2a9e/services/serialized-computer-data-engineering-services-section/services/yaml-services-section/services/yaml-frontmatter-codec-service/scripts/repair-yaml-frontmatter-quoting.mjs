#!/usr/bin/env node
/**
 * Repair the single most common shape of GEODE `geode.frontmatter-defect`
 * across a directory tree: a plain-scalar YAML mapping value that `yaml`'s
 * strict parser refuses (most often a bibliographic `title:`/`container-title:`
 * containing an unescaped ": ", which strict YAML reads as an illegal nested
 * mapping). It quotes only the exact value `encodeYaml`'s own `needsQuote`
 * predicate (exported here as `needsQuoteAsPlainScalar`) would already have
 * quoted had the file been produced by this codec, using this codec's own
 * `quoteYamlScalar` escaping. Every other byte of the file, including every
 * other frontmatter line, is left untouched.
 *
 * It never guesses at structural defects (duplicate keys, truncated fences,
 * prose leaked into frontmatter, ...): a file whose first remaining parse
 * error isn't a quotable plain scalar is left unmodified and reported with
 * its exact reason, for manual review.
 *
 * Usage:
 *   node repair-yaml-frontmatter-quoting.mjs --root <dir> [--apply] [--report <path>]
 *
 * Without --apply this is a dry run: it reports what it would change without
 * writing anything.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseDocument, LineCounter } from "yaml";
import { needsQuoteAsPlainScalar, quoteYamlScalar } from "../dist/index.mjs";

const SKIP_DIRECTORIES = new Set(["node_modules", ".git"]);
// Mirrors @red-cup-engineering/split-markdown-frontmatter-fence-service's YAML
// fence, split into named groups so the original delimiters round-trip byte-exact.
const FENCE = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/u;
const MAX_REPAIR_ITERATIONS = 50;

function parseArgs(argv) {
  const args = { apply: false, root: null, report: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--root") args.root = argv[(index += 1)];
    else if (arg === "--report") args.report = argv[(index += 1)];
    else throw new Error(`unrecognized argument: ${arg}`);
  }
  if (!args.root) throw new Error("--root is required");
  return args;
}

function* findMarkdownFiles(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      yield* findMarkdownFiles(path);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield path;
    }
  }
}

function parseYaml(text) {
  const lineCounter = new LineCounter();
  const document = parseDocument(text, {
    strict: true,
    uniqueKeys: true,
    prettyErrors: false,
    lineCounter,
    keepSourceTokens: true,
  });
  return { document, lineCounter };
}

// A key candidate must look like a word the house codec would actually write as a
// key (see isPlainKey/KEY_PATTERN in ../src/index.mts) — never a leading flow/quote
// indicator such as "[" or "{". Otherwise "- [Some: Title](url)" would misparse as
// the compact mapping {"[Some": "Title](url)"} instead of one bracketed scalar.
const MAPPING_LINE = /^(\s*(?:-\s+)?)([A-Za-z0-9_][^:]*|"[^"]*"|'[^']*')(:[ \t]+)(\S.*?)(\s*)$/u;
const SEQUENCE_ITEM_LINE = /^(\s*-\s+)(\S.*?)(\s*)$/u;

function quotedValueOrNull(value) {
  if (value.startsWith('"') || value.startsWith("'")) return null;
  if (!needsQuoteAsPlainScalar(value)) return null;
  return quoteYamlScalar(value);
}

/** If the plain-scalar value on `lines[lineIndex]` needs quoting and isn't already quoted, quote it. Otherwise null. */
function quoteOffendingLine(lines, lineIndex) {
  const line = lines[lineIndex];
  if (line === undefined) return null;

  const mapping = line.match(MAPPING_LINE);
  if (mapping !== null) {
    const [, prefix, key, separator, value, trailingSpace] = mapping;
    const quoted = quotedValueOrNull(value);
    if (quoted === null) return null;
    const repaired = `${prefix}${key}${separator}${quoted}${trailingSpace}`;
    return repaired === line ? null : repaired;
  }

  const sequenceItem = line.match(SEQUENCE_ITEM_LINE);
  if (sequenceItem !== null) {
    const [, prefix, value, trailingSpace] = sequenceItem;
    const quoted = quotedValueOrNull(value);
    if (quoted === null) return null;
    const repaired = `${prefix}${quoted}${trailingSpace}`;
    return repaired === line ? null : repaired;
  }

  return null;
}

/** Repair one frontmatter YAML block. Returns { ok: true, text, changes } or { ok: false, reason, line }. */
function repairFrontmatterYaml(rawYaml) {
  const newline = rawYaml.includes("\r\n") ? "\r\n" : "\n";
  const lines = rawYaml.split(/\r\n|\n/u);
  const changes = [];
  for (let iteration = 0; iteration < MAX_REPAIR_ITERATIONS; iteration += 1) {
    const { document, lineCounter } = parseYaml(lines.join(newline));
    if (document.errors.length === 0) {
      return { ok: true, text: lines.join(newline), iterations: iteration, changes };
    }
    const [firstError] = document.errors;
    const offset = firstError.pos?.[0];
    if (offset === undefined) return { ok: false, reason: firstError.message, line: null };
    const { line: oneBasedLine } = lineCounter.linePos(offset);
    const lineIndex = oneBasedLine - 1;
    const repairedLine = quoteOffendingLine(lines, lineIndex);
    if (repairedLine === null) return { ok: false, reason: firstError.message, line: oneBasedLine };
    changes.push({ line: oneBasedLine, before: lines[lineIndex], after: repairedLine });
    lines[lineIndex] = repairedLine;
  }
  return { ok: false, reason: `did not converge within ${MAX_REPAIR_ITERATIONS} iterations`, line: null };
}

function repairFile(path) {
  const original = readFileSync(path, "utf8");
  const bom = original.startsWith("﻿") ? "﻿" : "";
  const body = bom ? original.slice(1) : original;
  const fenceMatch = body.match(FENCE);
  if (fenceMatch === null) return { status: "no-frontmatter" };
  const [whole, open, rawYaml, close] = fenceMatch;
  const firstPass = parseYaml(rawYaml);
  if (firstPass.document.errors.length === 0) return { status: "already-valid" };
  const repair = repairFrontmatterYaml(rawYaml);
  if (!repair.ok) return { status: "unresolved", reason: repair.reason, line: repair.line };
  const rest = body.slice(whole.length);
  const rewritten = `${bom}${open}${repair.text}${close}${rest}`;
  return { status: "repaired", text: rewritten, iterations: repair.iterations, changes: repair.changes };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = { repaired: [], unresolved: [], alreadyValid: 0, noFrontmatter: 0 };
  for (const path of findMarkdownFiles(args.root)) {
    const outcome = repairFile(path);
    const relPath = relative(args.root, path);
    if (outcome.status === "already-valid") results.alreadyValid += 1;
    else if (outcome.status === "no-frontmatter") results.noFrontmatter += 1;
    else if (outcome.status === "unresolved") {
      results.unresolved.push({ path: relPath, reason: outcome.reason, line: outcome.line });
    } else if (outcome.status === "repaired") {
      results.repaired.push({ path: relPath, iterations: outcome.iterations, changes: outcome.changes });
      if (args.apply) writeFileSync(path, outcome.text, "utf8");
    }
  }

  console.log(`root: ${args.root}`);
  console.log(`mode: ${args.apply ? "apply" : "dry run (pass --apply to write)"}`);
  console.log(`already valid: ${results.alreadyValid}`);
  console.log(`no frontmatter fence: ${results.noFrontmatter}`);
  console.log(`${args.apply ? "repaired" : "repairable"}: ${results.repaired.length}`);
  console.log(`unresolved (left untouched, needs manual review): ${results.unresolved.length}`);
  for (const { path, reason, line } of results.unresolved) {
    console.log(`  UNRESOLVED ${path} :${line ?? "?"}: ${reason}`);
  }

  if (args.report) {
    writeFileSync(args.report, JSON.stringify(results, null, 2), "utf8");
    console.log(`report written to ${args.report}`);
  }
}

main();
