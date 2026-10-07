import { mkdir, readFile, readdir, rmdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createImmutableContentCustody } from "@red-cup-engineering/immutable-content-custody-service";

import { startWitnessJournalDocumentHttpProvider } from "./http-provider.mjs";
import { sha256Base64Url } from "@red-cup-engineering/cryptographic-data-service/integrity";

const PROFILE = "org.red-cup-engineering.filesystem-witness-journal-document.v1";
const CUSTODY_PROFILE = "org.red-cup-engineering.filesystem-immutable-content.v1";
const LEGACY_OBJECT_FIELDS = Object.freeze(["bytes", "mediaType", "ni", "profile"]);

function isLegacyObject(value) {
  return value !== null && !Array.isArray(value) && typeof value === "object"
    && value.profile === PROFILE && typeof value.ni === "string"
    && typeof value.mediaType === "string" && typeof value.bytes === "string";
}
function isExactLegacyObject(value) {
  const fields = Object.keys(value).sort();
  return fields.length === LEGACY_OBJECT_FIELDS.length
    && fields.every((field, index) => field === LEGACY_OBJECT_FIELDS[index]);
}

function objectPath(root, key) {
  if (typeof key !== "string" || !/^immutable\/sha-256\/[^/]{2}\/[^/]+$/u.test(key)) throw new TypeError("filesystem immutable content key is invalid");
  return join(root, "objects", ...key.split("/")) + ".json";
}
async function seatCurrent(path, value) {
  const bytes = Buffer.from(JSON.stringify(value) + "\n");
  await mkdir(resolve(path, ".."), { recursive: true });
  try { await writeFile(path, bytes, { flag: "wx", mode: 0o444 }); }
  catch (error) {
    if (error?.code !== "EEXIST") throw error;
    if (!(await readFile(path)).equals(bytes)) throw new Error("immutable content collision at " + path);
  }
}
function filesystemContentStore(root) {
  return Object.freeze({
    async putCurrent(key, { body, byteLength, sha256, mediaType }) {
      const bytes = Buffer.from(body);
      if (bytes.length !== byteLength) throw new Error("filesystem immutable content length mismatch");
      await seatCurrent(objectPath(root, key), { profile: CUSTODY_PROFILE, key, bytes: bytes.toString("base64"), byteLength, sha256, mediaType });
    },
    async get(key) {
      try {
        const value = JSON.parse(await readFile(objectPath(root, key), "utf8"));
        if (value.profile !== CUSTODY_PROFILE || value.key !== key || typeof value.bytes !== "string") throw new Error("filesystem immutable custody returned a foreign object");
        const body = Buffer.from(value.bytes, "base64");
        if (body.length !== value.byteLength) throw new Error("filesystem immutable custody length mismatch");
        return { body, mediaType: value.mediaType, etag: value.sha256 };
      } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
    },
  });
}
async function migrateLegacyObjects(root, custody) {
  const legacy = join(root, "objects", "sha-256");
  let entries;
  try { entries = await readdir(legacy, { withFileTypes: true }); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
  for (const entry of entries.filter((value) => value.isFile() && value.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name))) {
    const source = join(legacy, entry.name);
    const snapshot = await readFile(source);
    const value = JSON.parse(snapshot);
    // Rehydrate verified known content even if its source also carries owner metadata.
    if (!isLegacyObject(value)) continue;
    await custody.put({ ni: value.ni, bytes: Buffer.from(value.bytes, "base64"), mediaType: value.mediaType });
    // Only the exact old carrier can be retired; richer JSON belongs to its owner.
    if (!isExactLegacyObject(value)) continue;
    // Give already-pending filesystem writes a turn before deciding the source is unchanged.
    await new Promise((done) => setImmediate(done));
    if (!(await readFile(source)).equals(snapshot)) {
      throw new Error("legacy witness-journal object changed during migration: " + entry.name);
    }
    await rm(source);
  }
  try { await rmdir(legacy); } catch (error) {
    if (error?.code !== "ENOTEMPTY" && error?.code !== "ENOENT") throw error;
  }
}

export async function createFilesystemWitnessJournalBinding(root) {
  if (typeof root !== "string" || root === "") throw new TypeError("filesystem witness-journal root must be a nonempty path");
  const absoluteRoot = resolve(root);
  const indexes = join(absoluteRoot, "indexes", "category-reference", "sha-256");
  await mkdir(indexes, { recursive: true });
  const custody = createImmutableContentCustody({ store: filesystemContentStore(absoluteRoot) });
  await migrateLegacyObjects(absoluteRoot, custody);

  const categoryIndex = Object.freeze({
    async add({ predicate, category, ni }) {
      if (![predicate, category, ni].every((value) => typeof value === "string" && value !== "")) throw new TypeError("category reference fields must be nonempty");
      const directory = join(indexes, sha256Base64Url(`${predicate}\n${category}`));
      await mkdir(directory, { recursive: true });
      await seatCurrent(join(directory, `${sha256Base64Url(ni)}.json`), { profile: PROFILE, predicate, category, ni });
      return Object.freeze({ profile: PROFILE, predicate, category, ni });
    },
    async query(category, { predicate = "urn:emsenn:witness-journal:category", continuationToken } = {}) {
      if (continuationToken !== undefined) throw new TypeError("filesystem category index does not paginate");
      const directory = join(indexes, sha256Base64Url(`${predicate}\n${category}`));
      let names;
      try { names = await readdir(directory); } catch (error) {
        if (error?.code === "ENOENT") return Object.freeze({ references: Object.freeze([]), continuationToken: undefined });
        throw error;
      }
      const references = [];
      for (const name of names.filter((value) => value.endsWith(".json")).sort()) {
        const value = JSON.parse(await readFile(join(directory, name), "utf8"));
        if (value.profile !== PROFILE || value.predicate !== predicate || value.category !== category || typeof value.ni !== "string") throw new Error("filesystem category index returned a foreign reference");
        references.push(Object.freeze({ profile: PROFILE, predicate, category, ni: value.ni }));
      }
      return Object.freeze({ references: Object.freeze(references), continuationToken: undefined });
    },
  });
  return Object.freeze({ custody, categoryIndex, root: absoluteRoot });
}

export async function startFilesystemWitnessJournalProviderProcess({ root, ...options } = {}) {
  const binding = await createFilesystemWitnessJournalBinding(root);
  return startWitnessJournalDocumentHttpProvider(binding, options);
}

export const FILESYSTEM_WITNESS_JOURNAL_PROFILE = PROFILE;
