#!/usr/bin/env node

import { isDeepStrictEqual } from "node:util";
import { deleteYamlNestedKey } from "@red-cup-engineering/yaml-frontmatter-codec-service";

import { mutateMarkdownFrontmatter } from "./mutate-markdown-frontmatter.mjs";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";

function keyPath(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.some((key) => typeof key !== "string" || key.length === 0)) {
    throw new TypeError(`${name} must be a nonempty string path`);
  }
  return value;
}

function valueAtPath(record, path) {
  let value = record;
  for (const key of path) {
    if (value === null || typeof value !== "object" || Array.isArray(value) || !Object.hasOwn(value, key)) return { found: false };
    value = value[key];
  }
  return { found: true, value };
}

function deletePath(record, path, index = 0) {
  const key = path[index];
  if (key === undefined || !Object.hasOwn(record, key)) return { changed: false, value: record };
  const next = { ...record };
  if (index === path.length - 1) delete next[key];
  else {
    const child = record[key];
    if (child === null || typeof child !== "object" || Array.isArray(child)) return { changed: false, value: record };
    const result = deletePath(child, path, index + 1);
    if (!result.changed) return { changed: false, value: record };
    if (Object.keys(result.value).length === 0) delete next[key];
    else next[key] = result.value;
  }
  return { changed: true, value: next };
}

function setPath(record, path, value, { overwrite }, index = 0) {
  const key = path[index];
  const next = { ...record };
  if (index === path.length - 1) {
    if (Object.hasOwn(record, key) && !overwrite) throw new TypeError(`frontmatter key ${formatPath(path)} already exists`);
    next[key] = value;
    return next;
  }
  const child = record[key];
  if (child !== undefined && (child === null || typeof child !== "object" || Array.isArray(child))) {
    throw new TypeError(`frontmatter key ${formatPath(path.slice(0, index + 1))} is not a mapping`);
  }
  next[key] = setPath(child ?? {}, path, value, { overwrite }, index + 1);
  return next;
}

function formatPath(path) { return `/${path.map((key) => key.replaceAll("~", "~0").replaceAll("/", "~1")).join("/")}`; }

/** Delete one YAML mapping key path while retaining every other source byte. */
function deleteYamlMappingPath(text, path) {
  if (path.length === 1) return mutateMarkdownFrontmatter(text, { mode: "delete", keys: path });
  const fence = splitMarkdownFrontmatterFence(text);
  if (fence?.format !== "yaml") throw new TypeError("relocating a nested frontmatter key requires YAML frontmatter");
  // fence.raw has its own trailing line terminator stripped, but rawEnd
  // does not exclude it — operate on the exact slice so a deletion that
  // reaches the last line does not lose that terminator.
  const exact = text.slice(fence.source.rawStart, fence.source.rawEnd);
  const raw = deleteYamlNestedKey(exact, path);
  return `${text.slice(0, fence.source.rawStart)}${raw}${text.slice(fence.source.rawEnd)}`;
}

/**
 * Move a YAML frontmatter value between mapping key paths.
 *
 * Top-level destinations retain all unrelated YAML source bytes. Arbitrary
 * nested destinations are supported through the canonical YAML serializer.
 */
export function relocateMarkdownFrontmatterKey(text, request = {}) {
  if (typeof text !== "string" || request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("text and a relocation request are required");
  const from = keyPath(request.from, "from"), to = keyPath(request.to, "to");
  if (formatPath(from) === formatPath(to)) return text;
  const parsed = readMarkdownFrontmatter(text);
  if (parsed.format === null) return text;
  if (parsed.format !== "yaml") throw new TypeError("relocating nested frontmatter keys requires YAML frontmatter");
  const source = valueAtPath(parsed.frontmatter, from);
  if (!source.found) return text;
  const destination = valueAtPath(parsed.frontmatter, to);
  if (destination.found && !isDeepStrictEqual(destination.value, source.value) && request.overwrite !== true) {
    throw new TypeError(`frontmatter key ${formatPath(to)} already exists with a different value`);
  }
  if (to.length === 1) {
    const withDestination = !destination.found || (request.overwrite === true && !isDeepStrictEqual(destination.value, source.value))
      ? mutateMarkdownFrontmatter(text, { mode: "set", key: to[0], value: source.value, beforeKey: request.beforeKey })
      : text;
    return deleteYamlMappingPath(withDestination, from);
  }
  const withoutSource = deletePath(parsed.frontmatter, from);
  const next = setPath(withoutSource.value, to, source.value, { overwrite: request.overwrite === true || destination.found });
  return mutateMarkdownFrontmatter(text, { mode: "set", frontmatter: next, format: "yaml" });
}

function parsePointer(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length === 1) throw new TypeError("paths must be nonempty JSON Pointers");
  return value.slice(1).split("/").map((part) => {
    if (/~(?:[^01]|$)/u.test(part)) throw new TypeError(`invalid JSON Pointer ${value}`);
    return part.replaceAll("~1", "/").replaceAll("~0", "~");
  });
}

function parseMove(value) {
  const separator = value.indexOf("=");
  if (separator === -1) throw new TypeError("move must be FROM=TO, using JSON Pointer paths");
  return { from: parsePointer(value.slice(0, separator)), to: parsePointer(value.slice(separator + 1)) };
}

export async function runRelocateMarkdownFrontmatterKey(argv, write, io = process) {
  const separator = argv.indexOf("--");
  const options = separator === -1 ? argv : argv.slice(0, separator);
  const paths = separator === -1 ? [] : argv.slice(separator + 1);
  const moves = [];
  for (let index = 0; index < options.length; index += 2) {
    if (options[index] !== "--move" || typeof options[index + 1] !== "string") throw new TypeError("usage: relocate-markdown-frontmatter-key --move /FROM=/TO [...] -- FILE.md [FILE.md ...]");
    moves.push(parseMove(options[index + 1]));
  }
  if (moves.length === 0 || paths.length === 0) throw new TypeError("usage: relocate-markdown-frontmatter-key --move /FROM=/TO [...] -- FILE.md [FILE.md ...]");
  const receipts = [];
  for (const path of paths) {
    const source = await readMarkdownFile(path);
    const text = moves.reduce((next, move) => relocateMarkdownFrontmatterKey(next, move), source);
    const receipt = await write({ path, text, mode: "replace", normalization: "preserve" });
    receipts.push({ path: receipt.path, changed: receipt.changed, bytes: receipt.bytes });
  }
  io.stdout.write(`${JSON.stringify(receipts, null, 2)}\n`);
  return receipts;
}
