import { resolve, sep } from "node:path";

/**
 * The three lawful subdirectories under a section's `data/` — the ONLY
 * shapes durable state or receipts may live under (owner-ruled
 * 2026-08-30): `logs` for journals/event streams, `records` for dated
 * receipts/settlements/attestations/deployments/projections/schemas, and
 * `state` for runtime trees/caches/reservations/locks/task stores/
 * content-addressed stores. Any other `data/<topic>/` name is the
 * documented slop pattern.
 *
 * @type {readonly ["logs", "records", "state"]}
 */
export const DATA_CUSTODY_KINDS = Object.freeze(["logs", "records", "state"]);

const DATA_CUSTODY_KIND_SET = new Set(DATA_CUSTODY_KINDS);

/**
 * @param {string} root
 * @returns {void}
 * @throws {TypeError} when root is not a nonempty string
 */
function requireRoot(root) {
  if (typeof root !== "string" || root.length === 0) {
    throw new TypeError("data-custody-directory: root must be a nonempty string");
  }
}

/**
 * @param {string} kind
 * @returns {void}
 * @throws {TypeError} when kind is not one of DATA_CUSTODY_KINDS
 */
function requireKind(kind) {
  if (!DATA_CUSTODY_KIND_SET.has(kind)) {
    throw new TypeError(
      `data-custody-directory: kind must be one of ${DATA_CUSTODY_KINDS.join(", ")}, got ${JSON.stringify(kind)}`,
    );
  }
}

/**
 * @param {readonly unknown[]} segments
 * @returns {void}
 * @throws {TypeError} when a segment is not a plain path component
 */
function requireSegments(segments) {
  for (const segment of segments) {
    if (typeof segment !== "string" || segment.length === 0) {
      throw new TypeError(`data-custody-directory: segment must be a nonempty string, got ${JSON.stringify(segment)}`);
    }
    if (segment === "." || segment === "..") {
      throw new TypeError(`data-custody-directory: segment must not be "." or "..", got ${JSON.stringify(segment)}`);
    }
    if (segment.includes("/") || segment.includes("\\") || segment.includes(sep)) {
      throw new TypeError(`data-custody-directory: segment must not contain a path separator, got ${JSON.stringify(segment)}`);
    }
  }
}

/**
 * Resolve the absolute directory for one of a section's three lawful
 * `data/` custody kinds, optionally descending into further plain
 * segments beneath it.
 *
 * @param {string} root - the owning section's absolute root directory
 * @param {"logs"|"records"|"state"} kind - which custody trio member
 * @param {...string} segments - further plain path components beneath the kind directory
 * @returns {string} the absolute resolved path `<root>/data/<kind>/<segments...>`
 * @throws {TypeError} when root, kind, or any segment is invalid
 */
export function dataCustodyDirectory(root, kind, ...segments) {
  requireRoot(root);
  requireKind(kind);
  requireSegments(segments);
  return resolve(root, "data", kind, ...segments);
}

/**
 * Resolve all three lawful custody directories for a section root at once.
 *
 * @param {string} root - the owning section's absolute root directory
 * @returns {Readonly<{root: string, logs: string, records: string, state: string}>}
 * @throws {TypeError} when root is invalid
 */
export function dataCustodyDirectories(root) {
  requireRoot(root);
  return Object.freeze({
    root,
    logs: dataCustodyDirectory(root, "logs"),
    records: dataCustodyDirectory(root, "records"),
    state: dataCustodyDirectory(root, "state"),
  });
}
