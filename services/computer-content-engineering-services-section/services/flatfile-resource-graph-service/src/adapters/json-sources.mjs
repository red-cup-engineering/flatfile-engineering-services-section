import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { admitRelativePosixFilepath } from "@red-cup-engineering/computer-filepath-engineering-services-section/admit-relative-posix-filepath";
import { parseJsonValue } from "@red-cup-engineering/json-services-section/parse-json-value";
import { makeCell } from "../kernel/cells.mjs";
import { projectAttributeCells } from "../provider/attribute-projection.mjs";
import { defineProvider } from "../provider/provider.mjs";

const MAX_SOURCE_BYTES = 1_048_576;
const MAX_SOURCE_COUNT = 4096;

function sourceNamespace(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("a source-owned namespace is required");
  let uri;
  try { uri = new URL(value); }
  catch { throw new TypeError("source namespace must be a qualified absolute URI"); }
  if (!["https:", "urn:"].includes(uri.protocol) || uri.username || uri.password || uri.search || uri.hash) {
    throw new TypeError("source namespace must be an HTTPS or URN identifier without credentials, query or fragment");
  }
  return value;
}

function sourcePaths(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_SOURCE_COUNT) {
    throw new TypeError("select from 1 to 4096 exact JSON source paths");
  }
  const admitted = paths.map(path => {
    const selected = admitRelativePosixFilepath(path);
    if (!selected.endsWith(".json") || selected.split("/").some(part =>
      ["..", ".git", "node_modules", ".env"].includes(part))) {
      throw new TypeError("selected sources must be normalized JSON records, not runtime or credential paths");
    }
    return selected;
  });
  if (new Set(admitted).size !== admitted.length) throw new TypeError("duplicate JSON source path");
  return Object.freeze([...admitted].sort());
}

/**
 * Observe source-owned JSON records as documentary *content*, not as enterprise
 * authority, accepted work or OWL domain facts. Files are explicitly selected
 * by their lawful consumer. This adapter uses the existing FARS provider,
 * attribute witness, typed-JSON and NI infrastructure, not a second graph.
 *
 * File revisions are SHA-256 of exact bytes. Each resource and attribute
 * witness is version-scoped; a changed source cannot inherit old provenance
 * even if a particular field retained its text. The stable focus names the
 * logical source path in its owner's URI namespace.
 */
export function jsonSourcesProvider({ id, root, namespace, paths }) {
  if (typeof root !== "string" || !root.trim()) throw new TypeError("JSON source root is required");
  const owner = sourceNamespace(namespace);
  const selected = sourcePaths(paths);
  return defineProvider({ id, async observe({ observedAt = new Date().toISOString() } = {}) {
    const sourceRoot = await realpath(root);
    const resources = [];
    for (const path of selected) {
      const file = resolve(sourceRoot, path);
      // Reject symlink aliases at any depth, and paths that cross the owner root.
      if (await realpath(file) !== file) throw new TypeError(`JSON source changes its selected path: ${path}`);
      const before = await lstat(file);
      if (!before.isFile() || before.size > MAX_SOURCE_BYTES) {
        throw new TypeError(`JSON source is not a bounded regular file: ${path}`);
      }
      const bytes = await readFile(file);
      const after = await lstat(file);
      if (bytes.length > MAX_SOURCE_BYTES || before.size !== bytes.length ||
          before.mtimeMs !== after.mtimeMs || before.size !== after.size) {
        throw new TypeError(`JSON source changed or exceeded its byte limit during observation: ${path}`);
      }
      let record;
      try { record = parseJsonValue(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch (error) { throw new TypeError(`JSON source is not an admitted UTF-8 JSON value: ${path}: ${error.message}`); }
      if (record === null || typeof record !== "object" || Array.isArray(record)) {
        throw new TypeError(`JSON source must declare an object record: ${path}`);
      }
      const revision = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      const focus = `urn:fars:source-json:${encodeURIComponent(owner)}:${encodeURIComponent(path)}`;
      const resource = `${focus}:${revision}`;
      const cells = [
        makeCell({ subject: resource, predicate: "urn:fars:type", object: "urn:fars:type:source-json" }),
        makeCell({ subject: resource, predicate: "urn:fars:source-namespace", object: owner }),
        makeCell({ subject: resource, predicate: "urn:fars:source-path", object: path }),
        makeCell({ subject: resource, predicate: "urn:fars:source-revision", object: revision }),
        ...projectAttributeCells({ subject: resource, resource, attributes: record }),
      ];
      resources.push(Object.freeze({ resource, focus, observedAt,
        cells: Object.freeze(cells), diagnostics: Object.freeze([]) }));
    }
    return Object.freeze({ resources: Object.freeze(resources), diagnostics: Object.freeze([]) });
  } });
}
