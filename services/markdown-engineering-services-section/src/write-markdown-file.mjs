import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { confineWritablePath, isMarkdownPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const MODES = new Set(["create", "replace", "upsert"]);
const REVISION = /^sha256:[a-f0-9]{64}$/u;

export class MarkdownFileRevisionConflict extends Error {
  constructor({ relativePath, expectedRevision, currentRevision }) {
    super(`write refused because ${relativePath} does not have the expected revision`);
    this.name = "MarkdownFileRevisionConflict";
    this.relativePath = relativePath;
    this.expectedRevision = expectedRevision;
    this.currentRevision = currentRevision;
  }
}

export function markdownFileRevision(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return sha256Digest(text);
}

export function prepareMarkdownFileText(text, normalization = "semantic") {
  if (normalization === "preserve") return text;
  if (normalization !== "semantic") throw new TypeError("normalization must be semantic or preserve");
  return normalizeLinefeeds(text);
}

export async function writeMarkdownFile(pathOrOptions, text) {
  const options = typeof pathOrOptions === "string" ? { path: pathOrOptions, text, mode: "upsert" } : pathOrOptions;
  if (!options || typeof options !== "object") throw new TypeError("path or options must be supplied");
  const mode = options.mode ?? "create";
  if (!MODES.has(mode)) throw new TypeError("mode must be create, replace, or upsert");
  if (typeof options.path !== "string" || options.path.length === 0) throw new TypeError("path must be a nonempty string");
  if (!isMarkdownPath(options.path)) throw new TypeError("path must name a Markdown file");
  if (typeof options.text !== "string") throw new TypeError("text must be a string");
  if (options.expectedRevision !== undefined && (typeof options.expectedRevision !== "string" || !REVISION.test(options.expectedRevision))) {
    throw new TypeError("expectedRevision must be a sha256 revision");
  }
  const address = options.root === undefined
    ? { path: resolve(options.path), relativePath: options.path }
    : await confineWritablePath({ root: options.root, path: options.path });
  let exists = true;
  try { await access(address.path); } catch (error) {
    if (error?.code === "ENOENT") exists = false;
    else throw error;
  }
  if (mode === "create" && exists) throw new Error("create refused because the Markdown file already exists");
  if (mode === "replace" && !exists) throw new Error("replace refused because the Markdown file does not exist");
  const normalized = prepareMarkdownFileText(options.text, options.normalization ?? "semantic");
  const current = exists ? await readFile(address.path, "utf8") : null;
  const previousRevision = current === null ? null : markdownFileRevision(current);
  if (options.expectedRevision !== undefined && previousRevision !== options.expectedRevision) {
    throw new MarkdownFileRevisionConflict({ relativePath: address.relativePath, expectedRevision: options.expectedRevision, currentRevision: previousRevision });
  }
  const revision = markdownFileRevision(normalized);
  if (current === normalized) {
    return Object.freeze({ ...address, text: normalized, bytes: Buffer.byteLength(normalized), changed: false, created: false, previousRevision, revision });
  }
  const receipt = await writeFileText(address.path, normalized);
  return Object.freeze({ ...address, ...receipt, text: normalized, changed: true, created: !exists, previousRevision, revision });
}
