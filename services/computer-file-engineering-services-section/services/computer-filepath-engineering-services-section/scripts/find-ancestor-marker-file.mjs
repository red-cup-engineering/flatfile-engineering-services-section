import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * Walks from a start directory upward and reports the nearest ancestor holding a file of the marker name, or null.
 * @param {object} request A record with the start directory and the marker file name.
 * @returns {Promise<object>} An AncestorMarkerFile record.
 * @throws {TypeError} When start or marker is not a non-empty string.
 */
export async function findAncestorMarkerFile(request) {
  if (typeof request?.start !== "string" || request.start.length === 0 || typeof request?.marker !== "string" || request.marker.length === 0) {
    throw new TypeError("a non-empty start and marker are required");
  }
  let current = resolve(request.start);
  for (;;) {
    try {
      await access(join(current, request.marker));
      return { type: "AncestorMarkerFile", start: request.start, marker: request.marker, path: current };
    } catch {
      const parent = dirname(current);
      if (parent === current) return { type: "AncestorMarkerFile", start: request.start, marker: request.marker, path: null };
      current = parent;
    }
  }
}

export const operation = Object.freeze({ name: "find-ancestor-marker-file", description: "Walks from a start directory upward and reports the nearest ancestor holding a file of the marker name, or null.", operation: findAncestorMarkerFile });
