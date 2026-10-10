#!/usr/bin/env node
// Checks Markdown carriers for banned revision-annotation prose. House law
// (working-discipline.md, writing-markdown-carriers.md): a Markdown carrier
// is revised in place — wrong text deleted, true text inserted — never
// annotated with strikethrough, "Correction:"/"UPDATE:"/"EDIT:" labels,
// dated verification blocks, or footnotes about what the document used to
// say. Append-only belongs to data formats (journals, JSONL logs) only.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PATTERNS = Object.freeze([
  { name: "strikethrough", regex: /~~[^~\n]+~~/ },
  {
    name: "correction-prefix",
    regex: /^[ \t]*(?:[-*>][ \t]*)?\**(?:Correction|UPDATE|EDIT)\**:/i,
  },
  { name: "verified-block", regex: /\bVerified\s+\d{4}-\d{2}-\d{2}\b/i },
  {
    name: "formerly-provenance",
    regex: /\bformerly\s+(?:known as|called|named)\b/i,
  },
  {
    // Case-sensitive on purpose: a capitalized word after "formerly" is the
    // proper-noun rename tell ("formerly Fizz"); lower-casing it would also
    // catch ordinary adverbial use ("formerly worked here").
    name: "formerly-provenance-name",
    regex: /\bformerly\s+[A-Z][\w-]*\b/,
  },
  { name: "historical-name", regex: /\bthe historical name\b/i },
  {
    name: "previously-said",
    regex: /\b(?:this (?:note|document|guide|skill|carrier)|it)\s+previously\s+said\b/i,
  },
]);

// A quoted or code-spanned occurrence is a MENTION of the banned phrase
// (law prose citing its own forbidden examples), not a USE of it. Strip
// double/curly-quoted spans and inline code spans per line before matching;
// fenced code blocks are skipped entirely. This is a line-preserving
// heuristic, not a Markdown parse: it can under-strip a quote that itself
// contains a straight quote, which only widens what gets flagged (a false
// positive to review), never hides a real annotation.
function stripQuotedAndCode(line) {
  return line
    .replace(/"[^"]*"|“[^”]*”/g, "")
    .replace(/`[^`]*`/g, "");
}

export function scanMarkdownText(text) {
  const lines = text.split("\n");
  const hits = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const stripped = stripQuotedAndCode(raw);
    for (const { name, regex } of PATTERNS) {
      if (regex.test(stripped)) {
        hits.push({ line: index + 1, pattern: name, text: raw.trim() });
      }
    }
  }
  return hits;
}

function listMarkdownFiles(target) {
  const info = statSync(target);
  if (!info.isDirectory()) return [target];
  const found = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(target, entry.name);
    if (entry.isDirectory()) found.push(...listMarkdownFiles(full));
    else if (entry.isFile() && extname(entry.name) === ".md") found.push(full);
  }
  return found;
}

export function checkMarkdownRevisionDiscipline(targets) {
  const files = targets.flatMap(listMarkdownFiles);
  const violations = [];
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    for (const hit of scanMarkdownText(text)) violations.push({ path, ...hit });
  }
  return violations;
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    process.stderr.write(
      "usage: check-markdown-revision-discipline.mjs <file-or-dir> [...]\n",
    );
    process.exit(2);
  }
  const violations = checkMarkdownRevisionDiscipline(targets);
  for (const v of violations) {
    process.stdout.write(`${v.path}:${v.line}: [${v.pattern}] ${v.text}\n`);
  }
  if (violations.length > 0) {
    const fileCount = new Set(violations.map((v) => v.path)).size;
    process.stderr.write(
      `\n${violations.length} revision-discipline violation(s) in ${fileCount} file(s).\n`,
    );
    process.exit(1);
  }
  process.exit(0);
}
