/**
 * Infomaterial: finite filesystem patches as content-addressed material.
 *
 * A patch (one file, symbolic link or directory tree) is observed under entry
 * and byte ceilings, with every entry checked for concurrent mutation. Its
 * material root is the semantic identity of its Merkle node, so two trees with
 * the same names, modes, links and bytes share one root regardless of
 * traversal order. A directory plate observes one directory's direct names
 * without reading child interiors; a cover assembles independently observed
 * child patches under a plate into the same material root the whole tree has.
 * A receipt is an observation, plate or cover with its semantic identity and
 * canonical bytes, and validates against them.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, opendir, readlink } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";

export const MATERIAL_PROFILE = "org.emsenn.infomaterial.merkle.v2";
export const DIRECTORY_PLATE_PROFILE = "org.emsenn.infomaterial.directory-plate.v1";
export const COVER_PROFILE = "org.emsenn.infomaterial.patch-cover.v2";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const KINDS = ["file", "directory", "symbolic-link"];
const byteOrder = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const sorted = (map) => Object.fromEntries([...map].sort(([a], [b]) => byteOrder(a, b)));

function identified(value) {
  const bytes = semanticBytes(value);
  return { id: semanticId(value), bytes };
}

/** The receipt carrier of one identified value: its fields, identity and canonical bytes. */
export function receiptOf({ semanticId: id, canonicalBytes, ...rest }) {
  const value = rest.observation ?? rest.cover;
  return { ...value, semanticId: id, canonicalBytesBase64: Buffer.from(canonicalBytes).toString("base64") };
}

function admitReceipt(carrier, label) {
  if (!NI.test(carrier?.semanticId ?? "") || typeof carrier.canonicalBytesBase64 !== "string") throw new Error(`${label} lacks its semantic identity and canonical bytes`);
  const bytes = Buffer.from(carrier.canonicalBytesBase64, "base64");
  if (bytes.toString("base64") !== carrier.canonicalBytesBase64) throw new Error(`${label} bytes are not canonical base64`);
  const value = decodeSemantic(bytes);
  if (!semanticBytes(value).equals(bytes)) throw new Error(`${label} bytes are not canonical CBOR`);
  if (semanticId(value) !== carrier.semanticId) throw new Error(`${label} identity differs from its canonical bytes`);
  return value;
}

function externalBytesCommitment(digest) {
  return semanticId({ kind: "external-file-bytes", algorithm: "sha-256", digest: new Uint8Array(digest) });
}
function fileNode(digest, size, mode) {
  return { profile: MATERIAL_PROFILE, kind: "file", mode, size, content: externalBytesCommitment(digest) };
}

/** The material node and root of one regular file's bytes and mode. */
export function regularFileMaterial(bytes, mode) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new TypeError("regular file material bytes must be a byte sequence");
  if (typeof mode !== "bigint" || mode < 0n) throw new TypeError("regular file material mode must be a nonnegative bigint");
  const body = Buffer.from(bytes);
  const node = fileNode(sha256(body), BigInt(body.length), mode);
  return Object.freeze({ node, materialRoot: semanticId(node) });
}

function increment(map, key, amount = 1n) { map.set(key, (map.get(key) ?? 0n) + amount); }
function suffix(name) {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "[none]";
  const value = name.slice(index + 1).normalize("NFC").toLowerCase();
  return Buffer.byteLength(value, "utf8") <= 64 ? value : "[none]";
}
function snapshot(stat) { return { dev: stat.dev, ino: stat.ino, mode: stat.mode, size: stat.size, mtimeNs: stat.mtimeNs, ctimeNs: stat.ctimeNs }; }
function sameSnapshot(left, right) { return ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"].every((key) => left[key] === right[key]); }
async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest();
}
async function directoryNames(path) {
  const names = [];
  for await (const entry of await opendir(path)) names.push(entry.name.normalize("NFC"));
  return names.sort(byteOrder);
}

/**
 * Observe one complete patch. `onOccurrence` receives each entry's path,
 * occurrence and material identities and node; `onFile` may measure a regular
 * file, bound to the same mutation-checked read.
 */
export async function observeInfomaterial(root, { maximumEntries = 1_000_000, maximumBytes = 100_000_000_000n, onOccurrence, onFile } = {}) {
  root = resolve(root);
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1) throw new TypeError("maximumEntries must be a positive safe integer");
  if (typeof maximumBytes !== "bigint" || maximumBytes < 0n) throw new TypeError("maximumBytes must be a nonnegative bigint");
  if (onOccurrence !== undefined && typeof onOccurrence !== "function") throw new TypeError("onOccurrence must be a function when supplied");
  if (onFile !== undefined && typeof onFile !== "function") throw new TypeError("onFile must be a function when supplied");
  const initialRoot = await lstat(root, { bigint: true });
  if (!initialRoot.isFile() && !initialRoot.isDirectory() && !initialRoot.isSymbolicLink()) throw new Error("patch root must be a regular file, symbolic link, or directory");
  const counts = new Map(), bytesBySuffix = new Map(), filesBySuffix = new Map();
  let entries = 0, regularFileBytes = 0n;
  async function settle(name, relativePath, parentPath, node, analysis = null) {
    const material = { name, kind: node.kind, id: semanticId(node) };
    if (onOccurrence) {
      const occurrence = semanticId({ profile: MATERIAL_PROFILE, kind: "occurrence", path: relativePath, material: material.id });
      await onOccurrence({ path: relativePath, parentPath, occurrence, material: material.id, node, analysis });
    }
    return material;
  }
  async function visit(path, name, isRoot = false, relativePath = ".", parentPath = null) {
    entries += 1;
    if (entries > maximumEntries) throw new Error(`entry ceiling exceeded at ${path}`);
    const beforeStat = await lstat(path, { bigint: true }), before = snapshot(beforeStat);
    const normalized = isRoot && beforeStat.isDirectory() ? "." : name.normalize("NFC");
    if (beforeStat.isFile()) {
      regularFileBytes += beforeStat.size;
      if (regularFileBytes > maximumBytes) throw new Error(`byte ceiling exceeded at ${path}`);
      const digest = await hashFile(path);
      const analysis = onFile ? await onFile({ absolutePath: path, path: relativePath, size: beforeStat.size }) : null;
      if (!sameSnapshot(before, snapshot(await lstat(path, { bigint: true })))) throw new Error(`concurrent mutation observed at ${path}`);
      increment(counts, "file"); increment(filesBySuffix, suffix(name)); increment(bytesBySuffix, suffix(name), beforeStat.size);
      return settle(normalized, relativePath, parentPath, fileNode(digest, beforeStat.size, beforeStat.mode), analysis);
    }
    if (beforeStat.isSymbolicLink()) {
      const target = (await readlink(path)).normalize("NFC");
      if (!sameSnapshot(before, snapshot(await lstat(path, { bigint: true })))) throw new Error(`concurrent mutation observed at ${path}`);
      increment(counts, "symbolic-link");
      return settle(normalized, relativePath, parentPath, { profile: MATERIAL_PROFILE, kind: "symbolic-link", mode: beforeStat.mode, target });
    }
    if (beforeStat.isDirectory()) {
      const names = await directoryNames(path);
      if (new Set(names).size !== names.length) throw new Error(`directory names collide after NFC normalization at ${path}`);
      const children = [];
      for (const child of names) children.push(await visit(resolve(path, child), child, false, isRoot ? child : `${relativePath}/${child}`, relativePath));
      const afterNames = await directoryNames(path);
      if (!sameSnapshot(before, snapshot(await lstat(path, { bigint: true }))) || names.join("\u0000") !== afterNames.join("\u0000")) throw new Error(`concurrent mutation observed at ${path}`);
      increment(counts, "directory");
      return settle(normalized, relativePath, parentPath, { profile: MATERIAL_PROFILE, kind: "directory", mode: beforeStat.mode, children });
    }
    throw new Error(`unsupported filesystem material at ${path}`);
  }
  const material = await visit(root, basename(root), true);
  if (!sameSnapshot(snapshot(initialRoot), snapshot(await lstat(root, { bigint: true })))) throw new Error("territory root changed during observation");
  const observation = {
    type: "InfomaterialPatchObservation",
    profile: MATERIAL_PROFILE,
    materialRoot: material.id,
    rootKind: material.kind,
    patchComplete: true,
    globalInstantClaimed: false,
    territorialCoverClaimed: false,
    traversal: "all-patch-directory-entries-no-symlink-following",
    entries,
    regularFileBytes,
    counts: sorted(counts),
    filesBySuffix: sorted(filesBySuffix),
    bytesBySuffix: sorted(bytesBySuffix),
  };
  const document = identified(observation);
  return { observation, semanticId: document.id, canonicalBytes: document.bytes };
}

/** Check one direct patch observation receipt against its canonical bytes. */
export function validateInfomaterialObservationReceipt(receipt) {
  if (receipt?.type !== "InfomaterialPatchObservation" || receipt.profile !== MATERIAL_PROFILE || receipt.patchComplete !== true) throw new Error("canonical finite patch observation receipt required");
  if (!NI.test(receipt.materialRoot ?? "")) throw new Error("patch receipt lacks an exact material root");
  if (receipt.globalInstantClaimed !== false || receipt.territorialCoverClaimed !== false) throw new Error("patch receipt overclaims global time or territorial cover");
  if (!KINDS.includes(receipt.rootKind)) throw new Error("patch receipt lacks an exact root kind");
  const value = admitReceipt(receipt, "patch receipt");
  for (const field of ["type", "profile", "materialRoot", "rootKind", "entries", "regularFileBytes", "patchComplete", "globalInstantClaimed", "territorialCoverClaimed"]) {
    if (String(value[field]) !== String(receipt[field])) throw new Error(`patch receipt field ${field} differs from its canonical object`);
  }
  return receipt;
}

/** Observe one directory's direct names and kinds, without reading child interiors. */
export async function observeDirectoryPlate(location, { observedAt = new Date().toISOString() } = {}) {
  if (!isAbsolute(location ?? "")) throw new Error("directory plate location must be absolute");
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error("observedAt must be an ISO timestamp");
  location = resolve(location);
  const beforeStat = await lstat(location, { bigint: true });
  if (!beforeStat.isDirectory()) throw new Error("directory plate root must be a directory");
  const before = snapshot(beforeStat), mounts = [];
  for await (const entry of await opendir(location)) mounts.push({ raw: entry.name, name: entry.name.normalize("NFC") });
  mounts.sort((left, right) => byteOrder(left.name, right.name));
  if (new Set(mounts.map(({ name }) => name)).size !== mounts.length) throw new Error("directory names collide after NFC normalization");
  for (const mount of mounts) {
    const stat = await lstat(resolve(location, mount.raw), { bigint: true });
    if (stat.isFile()) mount.kind = "file";
    else if (stat.isDirectory()) mount.kind = "directory";
    else if (stat.isSymbolicLink()) mount.kind = "symbolic-link";
    else throw new Error("directory plate contains unsupported filesystem material");
    mount.snapshot = snapshot(stat);
  }
  const afterNames = await directoryNames(location);
  if (!sameSnapshot(before, snapshot(await lstat(location, { bigint: true }))) || mounts.map(({ name }) => name).join("\0") !== afterNames.join("\0")) throw new Error("directory plate changed during observation");
  for (const mount of mounts) if (!sameSnapshot(mount.snapshot, snapshot(await lstat(resolve(location, mount.raw), { bigint: true })))) throw new Error(`direct mount metadata changed during observation: ${mount.name}`);
  const directMounts = mounts.map(({ name, kind }) => ({ name, kind }));
  const mode = beforeStat.mode;
  const plateRoot = semanticId({ profile: DIRECTORY_PLATE_PROFILE, kind: "directory-plate", mode, mounts: directMounts });
  const observation = { type: "InfomaterialDirectoryPlateObservation", profile: DIRECTORY_PLATE_PROFILE, location, mode, mounts: directMounts, plateRoot, complete: true, vectorTimed: true, globalInstantClaimed: false, childInteriorsRead: false, observedAt };
  const document = identified(observation);
  return { observation, semanticId: document.id, canonicalBytes: document.bytes };
}

/** Check one directory plate receipt; returns its canonical value. */
export function validateDirectoryPlateReceipt(carrier) {
  if (carrier?.type !== "InfomaterialDirectoryPlateObservation" || carrier.profile !== DIRECTORY_PLATE_PROFILE) throw new Error("canonical directory plate observation required");
  const value = admitReceipt(carrier, "directory plate");
  if (value.type !== "InfomaterialDirectoryPlateObservation" || value.profile !== DIRECTORY_PLATE_PROFILE || value.complete !== true || value.vectorTimed !== true || value.globalInstantClaimed !== false || value.childInteriorsRead !== false || !NI.test(value.plateRoot ?? "") || !Array.isArray(value.mounts)) throw new Error("directory plate does not prove one complete shallow observation");
  const names = new Set();
  for (const mount of value.mounts) {
    if (typeof mount?.name !== "string" || !KINDS.includes(mount.kind) || names.has(mount.name)) throw new Error("directory plate contains a malformed or repeated mount");
    names.add(mount.name);
  }
  return value;
}

/** Check one directory patch cover receipt; returns its canonical value with its carrier. */
export function validateDirectoryPatchCoverReceipt(carrier) {
  if (carrier?.type !== "InfomaterialDirectoryPatchCover" || carrier.profile !== COVER_PROFILE) throw new Error("canonical infomaterial directory patch cover required");
  const value = admitReceipt(carrier, "patch cover");
  if (value.type !== "InfomaterialDirectoryPatchCover" || value.profile !== COVER_PROFILE || value.gapFree !== true || value.nonOverlapping !== true || value.vectorTimed !== true || value.globalInstantClaimed !== false || value.childInteriorsRead !== false || !NI.test(value.plateObservation ?? "") || !NI.test(value.plateRoot ?? "") || !NI.test(value.materialRoot ?? "") || !Array.isArray(value.mounts)) throw new Error("patch cover payload does not prove the required recursive material boundary");
  for (const mount of value.mounts) if (typeof mount?.name !== "string" || !KINDS.includes(mount.kind) || !NI.test(mount.materialRoot ?? "") || !NI.test(mount.observation ?? "")) throw new Error("patch cover contains a malformed mount");
  return { ...value, semanticId: carrier.semanticId, canonicalBytesBase64: carrier.canonicalBytesBase64 };
}

/** A finite patch is evidenced by a direct observation or by a gap-free cover of child patches. */
export function validateInfomaterialPatchEvidence(receipt) {
  if (receipt?.type === "InfomaterialPatchObservation") return validateInfomaterialObservationReceipt(receipt);
  if (receipt?.type === "InfomaterialDirectoryPatchCover") return validateDirectoryPatchCoverReceipt(receipt);
  throw new Error("canonical direct observation or recursive directory cover evidence required");
}

/** Assemble child patch evidence under one directory plate into a gap-free cover. */
export async function assembleDirectoryCover(plateReceipt, bindings, { coveredAt = new Date().toISOString() } = {}) {
  const plate = validateDirectoryPlateReceipt(plateReceipt);
  if (!Array.isArray(bindings)) throw new Error("bindings must be an array");
  if (!Number.isFinite(Date.parse(coveredAt))) throw new Error("coveredAt must be an ISO timestamp");
  const supplied = new Map();
  for (const binding of bindings) {
    if (!binding || Object.keys(binding).sort().join("\0") !== "mount\0receipt" || typeof binding.mount !== "string") throw new Error("each child binding must expose exactly mount and receipt");
    const name = binding.mount.normalize("NFC");
    if (supplied.has(name)) throw new Error(`duplicate child receipt for mount ${name}`);
    supplied.set(name, validateInfomaterialPatchEvidence(binding.receipt));
  }
  if (supplied.size !== plate.mounts.length) throw new Error("child receipts do not cover the direct-name set exactly");
  const mounts = plate.mounts.map(({ name, kind }) => {
    const receipt = supplied.get(name);
    if (!receipt) throw new Error(`missing child receipt for mount ${name}`);
    if (receipt.rootKind !== kind) throw new Error(`child receipt kind does not match mount ${name}`);
    return { name, kind, materialRoot: receipt.materialRoot, observation: receipt.semanticId, observedAt: receipt.observedAt ?? null };
  });
  const materialRoot = semanticId({ profile: MATERIAL_PROFILE, kind: "directory", mode: plate.mode, children: mounts.map(({ name, kind, materialRoot: id }) => ({ name, kind, id })) });
  const cover = {
    type: "InfomaterialDirectoryPatchCover", profile: COVER_PROFILE,
    plateObservation: plateReceipt.semanticId, plateRoot: plate.plateRoot,
    rootKind: "directory", materialRoot, mounts,
    gapFree: true, nonOverlapping: true, vectorTimed: true,
    globalInstantClaimed: false, childInteriorsRead: false, coveredAt,
  };
  const document = identified(cover);
  return { cover, semanticId: document.id, canonicalBytes: document.bytes };
}
