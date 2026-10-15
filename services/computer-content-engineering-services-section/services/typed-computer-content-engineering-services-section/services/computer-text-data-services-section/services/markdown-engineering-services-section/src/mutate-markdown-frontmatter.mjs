#!/usr/bin/env node

import { basename, extname } from "node:path";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";
import { dumpMarkdownFrontmatter } from "./dump-markdown-frontmatter.mjs";
import { encodeToml } from "@red-cup-engineering/toml-file-codec-service";
import { mutateYamlTopLevelMapping } from "@red-cup-engineering/yaml-frontmatter-codec-service";

function record(value, name) { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be a JSON object`); return value; }
function document(frontmatter, body, format) {
  return dumpMarkdownFrontmatter(frontmatter, body, format);
}

function mutateYamlFrontmatter(text, mutation) {
  const fence = splitMarkdownFrontmatterFence(text);
  const { rawStart, rawEnd } = fence.source;
  return text.slice(0, rawStart) + mutateYamlTopLevelMapping(text.slice(rawStart, rawEnd), mutation) + text.slice(rawEnd);
}

/**
 * Mutate the frontmatter data form of one Markdown document.
 *
 * Request `mode` is `set`, `merge`, `delete`, or `rename`; input and output
 * are Markdown strings. Existing YAML/TOML format is retained unless a valid
 * `format` override is supplied.
 */
export function mutateMarkdownFrontmatter(text, request = {}) {
  if (typeof text !== "string" || request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("text and a mutation request are required");
  const { mode, format } = request;
  if (!["set", "merge", "delete", "rename"].includes(mode)) throw new TypeError("mode must be set, merge, delete, or rename");
  if (format !== undefined && format !== "yaml" && format !== "toml") throw new TypeError("format must be yaml or toml");
  const fence = splitMarkdownFrontmatterFence(text);
  const sameFormat = format === undefined || format === fence?.format;
  if (mode === "delete") {
    if (!Array.isArray(request.keys) || request.keys.some((key) => typeof key !== "string")) throw new TypeError("keys must be a string array");
    if (fence === null) return text;
    if (fence.format === "yaml" && sameFormat) return mutateYamlFrontmatter(text, { mode: "delete", keys: request.keys });
  }
  if (mode === "merge" && fence?.format === "yaml" && sameFormat) {
    let next = text;
    for (const [key, value] of Object.entries(record(request.patch, "patch"))) next = mutateYamlFrontmatter(next, { mode: "set", key, value });
    return next;
  }
  if (mode === "set" && sameFormat && fence?.format === "yaml" && typeof request.key === "string" && Object.hasOwn(request, "value")) {
    return mutateYamlFrontmatter(text, { mode: "set", key: request.key, value: request.value, beforeKey: request.beforeKey, flow: request.flow });
  }
  if (mode === "rename" && sameFormat && fence?.format === "yaml" && request.overwrite !== true) {
    if (typeof request.from !== "string" || typeof request.to !== "string") throw new TypeError("from and to must be strings");
    try {
      return mutateYamlFrontmatter(text, { mode: "rename", from: request.from, to: request.to });
    } catch (error) {
      if (!(error instanceof TypeError) || !error.message.endsWith(`top-level key ${request.to} already exists`)) throw error;
      const parsed = readMarkdownFrontmatter(text), current = parsed.frontmatter ?? {}, source = current[request.from];
      const canResolveTermName = request.from === "title"
        && request.to === "name"
        && typeof request.filenameStem === "string"
        && typeof source === "string"
        && source.trim() !== ""
        && current.name === request.filenameStem;
      if (!canResolveTermName) throw new TypeError(`frontmatter key ${request.to} already exists`);
      if (source === current.name) return mutateYamlFrontmatter(text, { mode: "delete", keys: ["title"] });
      const withName = mutateYamlFrontmatter(text, { mode: "set", key: "name", value: source });
      return mutateYamlFrontmatter(withName, { mode: "delete", keys: ["title"] });
    }
  }
  const parsed = readMarkdownFrontmatter(text), current = parsed.frontmatter ?? {}, preferred = format ?? parsed.format ?? "yaml";
  let next;
  if (mode === "delete") {
    next = { ...current };
    for (const key of request.keys) delete next[key];
  } else if (mode === "set" && typeof request.key === "string" && Object.hasOwn(request, "value")) {
    next = { ...current, [request.key]: request.value };
  } else if (mode === "set") {
    if (request.frontmatter !== null && request.frontmatter !== undefined) record(request.frontmatter, "frontmatter");
    next = request.frontmatter ?? null;
  } else if (mode === "merge") {
    next = { ...current, ...record(request.patch, "patch") };
  } else {
    if (typeof request.from !== "string" || typeof request.to !== "string") throw new TypeError("from and to must be strings");
    if (!(request.from in current)) return text;
    if (request.overwrite !== true && request.to in current) throw new TypeError(`frontmatter key ${request.to} already exists`);
    next = { ...current, [request.to]: current[request.from] }; delete next[request.from];
  }
  if (fence !== null && sameFormat && next !== null && preferred === "toml") {
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    return text.slice(0, fence.source.rawStart) + encodeToml(next).replaceAll("\n", newline) + text.slice(fence.source.rawEnd);
  }
  return document(next, parsed.body, preferred);
}

export async function runMutateMarkdownFrontmatter(argv, write, io = process) {
  const separator = argv.indexOf("--");
  const options = separator === -1 ? argv : argv.slice(0, separator);
  const paths = separator === -1 ? [] : argv.slice(separator + 1);
  if (options.length < 2 || paths.length === 0) {
    throw new TypeError("usage: mutate-markdown-frontmatter (--delete KEY | --rename FROM=TO) [...] -- FILE.md [FILE.md ...]");
  }
  const keys = [];
  const renames = [];
  for (let index = 0; index < options.length; index += 2) {
    const option = options[index], value = options[index + 1];
    if (option === "--delete" && typeof value === "string") {
      keys.push(value);
      continue;
    }
    if (option === "--rename" && typeof value === "string" && value.includes("=")) {
      const [from, ...rest] = value.split("=");
      const to = rest.join("=");
      if (from === "" || to === "") throw new TypeError("rename must be FROM=TO");
      renames.push({ from, to });
      continue;
    }
    throw new TypeError("only paired --delete KEY and --rename FROM=TO mutations are admitted");
  }
  const receipts = [];
  for (const path of paths) {
    const text = await readMarkdownFile(path);
    let next = keys.length === 0 ? text : mutateMarkdownFrontmatter(text, { mode: "delete", keys });
    for (const { from, to } of renames) {
      next = mutateMarkdownFrontmatter(next, { mode: "rename", from, to, filenameStem: basename(path, extname(path)) });
    }
    receipts.push(await write({ path, text: next, mode: "replace", normalization: "preserve" }));
  }
  io.stdout.write(`${JSON.stringify(receipts.map(({ path, bytes, changed }) => ({ path, bytes, changed })), null, 2)}\n`);
  return receipts;
}
