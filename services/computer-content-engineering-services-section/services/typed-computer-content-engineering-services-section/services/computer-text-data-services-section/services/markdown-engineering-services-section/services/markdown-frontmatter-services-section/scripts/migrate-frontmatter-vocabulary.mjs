#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";


import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { mutateMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { decodeYamlDocument } from "@red-cup-engineering/yaml-frontmatter-codec-service";
import { writeFileTextSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

export const DEFAULT_SYSTEM_TAGS = new Set([
  "archived", "blocked", "complete", "deprecated", "draft", "experimental",
  "in-progress", "private", "proposed", "published", "public", "stable",
]);

/** Apply the repository's frontmatter vocabulary migration to one document. */
export function migrateFrontmatterVocabulary(text, { systemTags = DEFAULT_SYSTEM_TAGS } = {}) {
  const fence = splitMarkdownFrontmatterFence(text);
  if (fence?.format !== "yaml") return { text, changes: [] };
  const { document } = decodeYamlDocument(fence.raw);
  const current = { ...readMarkdownFrontmatter(text).frontmatter };
  const changes = [];
  let next = text;
  const list = (key) => {
    const value = current[key];
    if (value === undefined || value === null) return [];
    if (typeof value === "string") return [value];
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
  };
  const flow = (key) => document.get(key, true)?.flow === true;
  const set = (key, value, options = {}) => {
    next = mutateMarkdownFrontmatter(next, { mode: "set", key, value, ...options });
    current[key] = value;
  };
  const remove = (key) => {
    next = mutateMarkdownFrontmatter(next, { mode: "delete", keys: [key] });
    delete current[key];
  };
  if (Object.hasOwn(current, "provenance")) {
    const authors = list("authors");
    if (authors !== null && !authors.includes("Claude Opus")) {
      set("authors", [...authors, "Claude Opus"], { beforeKey: "provenance" });
      changes.push("added Claude Opus to authors");
    }
    remove("provenance");
    changes.push("removed provenance");
  }
  if (current.type === "research-note") {
    set("type", "note");
    changes.push("changed type research-note to note");
  }
  if (current.status === "draft-for-iteration" && list("tags") !== null) {
    set("tags", [...new Set([...list("tags"), "draft"])], { beforeKey: "keywords" });
    remove("status");
    changes.push("changed status draft-for-iteration to tag draft");
  }
  const tags = list("tags"), keywords = list("keywords");
  if (tags !== null && keywords !== null) {
    const system = tags.filter((value) => systemTags.has(value));
    const topical = tags.filter((value) => !systemTags.has(value));
    if (topical.length > 0) {
      set("keywords", [...new Set([...keywords, ...topical])], { beforeKey: "tags", flow: Object.hasOwn(current, "keywords") ? flow("keywords") : flow("tags") });
      if (system.length > 0) set("tags", system);
      else remove("tags");
      changes.push(`moved ${topical.length} topical tag(s) to keywords`);
    }
  }
  return { text: next, changes };
}

export function repositoryMarkdownFiles(root) {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md", "*.markdown"], {
    cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024,
  }).split("\n").filter(Boolean).map((path) => resolve(root, path)).filter((path) => {
    try { return statSync(path).isFile(); } catch { return false; }
  });
}

export function runMigrateFrontmatterVocabulary(argv, io = process) {
  const options = parseArguments(argv);
  const files = options.paths.length > 0 ? options.paths.map((path) => resolve(path)) : repositoryMarkdownFiles(options.root);
  const receipts = [];
  const counts = new Map();
  for (const path of files) {
    const source = readFileSync(path, "utf8");
    const result = migrateFrontmatterVocabulary(source, { systemTags: options.systemTags });
    if (result.text === source) continue;
    if (options.apply) writeFileTextSync(path, result.text);
    receipts.push({ path, changes: result.changes });
    for (const change of result.changes) counts.set(change, (counts.get(change) ?? 0) + 1);
  }
  const report = { applied: options.apply, examined: files.length, changed: receipts.length, counts: Object.fromEntries([...counts].sort()), receipts };
  io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function parseArguments(argv) {
  let apply = false;
  let root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const systemTags = new Set(DEFAULT_SYSTEM_TAGS);
  const paths = [];
  let afterSeparator = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") { afterSeparator = true; continue; }
    if (!afterSeparator && argument === "--apply") apply = true;
    else if (!afterSeparator && argument === "--root") root = resolve(argv[++index]);
    else if (!afterSeparator && argument === "--system-tag") systemTags.add(argv[++index]);
    else if (!afterSeparator && argument.startsWith("--")) throw new TypeError(`unknown option ${argument}`);
    else paths.push(argument);
  }
  return { apply, root, systemTags, paths };
}


if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) {
  try { runMigrateFrontmatterVocabulary(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`migrate-frontmatter-vocabulary: ${error.message}\n`); process.exitCode = 64; }
}
