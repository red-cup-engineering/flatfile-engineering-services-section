import { constants } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { niUriDigest } from "@red-cup-engineering/uri-services-section/ni-uri";

async function readDatasetFile(path) {
  let file;
  try {
    // Nonblocking open lets the regular-file check reject a FIFO without
    // waiting for an external writer. It does not change regular-file reads.
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (error.code === "ELOOP") throw new TypeError("dataset-symlink-refused");
    throw error;
  }
  try {
    if (!(await file.stat()).isFile()) throw new TypeError("dataset-regular-file-required");
    return await file.readFile();
  } finally {
    await file.close();
  }
}

const credential = /^(?:authorization|api[-_]?key(?:[-_]?id)?|api[-_]?secret(?:[-_]?key)?|secret|token|password|private[-_]?key|mnemonic)$/iu;
function refuseCredentials(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, member] of Object.entries(value)) {
    if (credential.test(key)) throw new TypeError("credential-bearing-dataset-refused");
    refuseCredentials(member, seen);
  }
}

export function createContentAddressedDatasetStore({ root, maximumBytes = 64 * 1024 * 1024 } = {}) {
  if (typeof root !== "string" || !root.trim() || !Number.isInteger(maximumBytes) || maximumBytes < 1024) throw new TypeError("dataset-store-root-and-bound-required");
  const ownedRoot = resolve(root);
  const datasetPath = (id) => {
    // The NI provider validates canonical syntax before resolve or file access.
    const digest = niUriDigest(id);
    const path = resolve(ownedRoot, `${digest}.rmn.cbor`);
    if (!path.startsWith(`${ownedRoot}${sep}`)) throw new TypeError("dataset-path-escape-refused");
    return path;
  };
  const storeDataset = async ({ dataset, mediaType = "application/rmn+cbor", observedAt, provenance = [] } = {}) => {
    refuseCredentials(dataset);
    if (!Number.isFinite(Date.parse(observedAt)) || !Array.isArray(provenance) || provenance.some((value) => typeof value !== "string")) throw new TypeError("dataset-metadata-invalid");
    const content = identifyJsonSemanticContent({ objectKind: "brokerage-control.dataset", value: dataset, witnessRoot: EMPTY_WITNESS_ROOT });
    const { bytes, token: id } = content;
    if (bytes.length > maximumBytes) throw new RangeError("dataset-byte-bound-exceeded");
    await mkdir(ownedRoot, { recursive: true, mode: 0o700 });
    const path = datasetPath(id);
    try { await writeFile(path, bytes, { flag: "wx", mode: 0o600 }); } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await readDatasetFile(path);
      if (!existing.equals(bytes)) throw new TypeError("content-address-collision-refused");
    }
    return Object.freeze({ type: "ContentAddressedDatasetManifest", version: 1, id, mediaType, byteLength: bytes.length, observedAt: new Date(observedAt).toISOString(), provenance: Object.freeze([...provenance]), immutable: true });
  };
  const readDataset = async (manifest) => {
    if (manifest?.type !== "ContentAddressedDatasetManifest" || typeof manifest.id !== "string") throw new TypeError("dataset-manifest-required");
    const bytes = await readDatasetFile(datasetPath(manifest.id));
    return admitJsonSemanticContent({ bytes, token: manifest.id, objectKind: "brokerage-control.dataset" }).value;
  };
  return Object.freeze({ storeDataset, readDataset });
}
