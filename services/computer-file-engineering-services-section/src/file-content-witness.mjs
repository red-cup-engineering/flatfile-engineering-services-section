import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

function boundedPath(rootDirectory, relativePath) {
  if (typeof rootDirectory !== "string" || rootDirectory.trim() === "") throw new TypeError("rootDirectory must be nonempty text");
  if (typeof relativePath !== "string" || relativePath.trim() === "" || path.isAbsolute(relativePath)) throw new TypeError("relativePath must be nonempty relative text");
  const root = path.resolve(rootDirectory); const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new TypeError(`file witness path escapes rootDirectory: ${relativePath}`);
  return resolved;
}

export async function observeFileContentWitness({ rootDirectory, relativePath }) {
  const filePath = boundedPath(rootDirectory, relativePath);
  try { const bytes = await readFile(filePath); return Object.freeze({ path: relativePath, exists: true, bytes: bytes.byteLength, sha256: sha256Hex(bytes) }); }
  catch (error) { if (error?.code === "ENOENT") return Object.freeze({ path: relativePath, exists: false, bytes: 0, sha256: null }); throw error; }
}

/** Perform one bounded filesystem observation over an explicit file set. */
export async function observeFileContentWitnesses({ rootDirectory, relativePaths }) {
  if (!Array.isArray(relativePaths) || relativePaths.some((item) => typeof item !== "string")) throw new TypeError("relativePaths must be an array of strings");
  const paths = [...new Set(relativePaths)].sort();
  const files = Object.freeze(await Promise.all(paths.map((relativePath) => observeFileContentWitness({ rootDirectory, relativePath }))));
  return Object.freeze({ kind: "file-content-witness.observation", rootDirectory: path.resolve(rootDirectory), count: files.length, files });
}
