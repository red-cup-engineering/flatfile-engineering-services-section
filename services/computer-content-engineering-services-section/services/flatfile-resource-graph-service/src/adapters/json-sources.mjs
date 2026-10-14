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

function sourceSelections(sources) {
  if (!Array.isArray(sources) || sources.length < 1 || sources.length > MAX_SOURCE_COUNT) {
    throw new TypeError("select from 1 to 4096 source-pinned JSON records");
  }
  const admitted = sources.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        Object.keys(item).some(key => !["path", "digest"].includes(key))) {
      throw new TypeError("every source requires only path and digest");
    }
    const path = admitRelativePosixFilepath(item.path);
    if (!path.endsWith(".json") || path.split("/").some(part =>
      ["..", ".git", "node_modules", ".env"].includes(part))) {
      throw new TypeError("selected sources must be normalized JSON records, not runtime or credential paths");
    }
    if (typeof item.digest !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(item.digest)) {
      throw new TypeError("every source must carry its owner's exact SHA-256 digest");
    }
    return Object.freeze({ path, digest: item.digest });
  });
  if (new Set(admitted.map(source => source.path)).size !== admitted.length) {
    throw new TypeError("duplicate JSON source path");
  }
  return Object.freeze([...admitted].sort((a, b) => a.path.localeCompare(b.path)));
}

/**
 * Select existing JSON source records from a source-owned catalog. This is a
 * pure projection of the catalog's own canonicalPath and SHA-256 pins; it
 * creates no shadow catalog, authority, or synthetic work record.
 *
 * Group names are exact, explicit selections (e.g. a professional repertoire's
 * offices, duties, works). Skill directories and executable scripts are not
 * JSON records and must use their distinct source-qualified provider.
 * The caller remains responsible for authenticating the catalog itself and
 * for the right to read every selected source. Nothing here confers appointment.
 */
export function selectCatalogJsonSources(catalog, groups) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog) ||
      !Array.isArray(groups) || groups.length < 1 || groups.length > 128 ||
      new Set(groups).size !== groups.length) {
    throw new TypeError("catalog selection requires unique explicit source groups");
  }
  const selections = [];
  for (const group of groups) {
    if (typeof group !== "string" || !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(group) ||
        !Object.hasOwn(catalog, group) || !Array.isArray(catalog[group])) {
      throw new TypeError("requested catalog group does not contain source records");
    }
    for (const entry of catalog[group]) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
          typeof entry.id !== "string" || !entry.id.trim() ||
          typeof entry.canonicalPath !== "string") {
        throw new TypeError("catalog entries must identify source-owned JSON files");
      }
      selections.push({ path: entry.canonicalPath, digest: entry.digest });
    }
  }
  return sourceSelections(selections);
}

/**
 * Observe source-owned JSON records as documentary *content*, not as enterprise
 * authority, accepted work or OWL domain facts. Files are explicitly selected
 * by their lawful consumer. This adapter uses the existing FARS provider,
 * attribute witness, typed-JSON and NI infrastructure, not a second graph.
 *
 * Every selection requires its owning source's expected SHA-256 digest,
 * such as Coesite's existing professional-repertoire catalog declares.
 * File revisions are SHA-256 of exact bytes. Each resource and attribute
 * witness is version-scoped; a changed source cannot inherit old provenance
 * even if a particular field retained its text. The stable focus names the
 * logical source path in its owner's URI namespace.
 */
export function jsonSourcesProvider({ id, root, namespace, sources }) {
  if (typeof root !== "string" || !root.trim()) throw new TypeError("JSON source root is required");
  const owner = sourceNamespace(namespace);
  const selected = sourceSelections(sources);
  return defineProvider({ id, async observe({ observedAt = new Date().toISOString() } = {}) {
    const sourceRoot = await realpath(root);
    const resources = [];
    for (const { path, digest } of selected) {
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
      if (revision !== digest) throw new TypeError(`JSON source digest changed or is not owner-qualified: ${path}`);
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
