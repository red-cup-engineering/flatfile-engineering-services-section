/**
 * The raw mark-coordinate base of the 561 Group Semioverse L-Space.
 *
 * A finite digital resource consists of raw bytes. Its content address is the
 * RFC 6920 NI name of those exact bytes; every bit has a position and value:
 *   (address, bit, value)  where bit is MSB-first, zero-based.
 *
 * This is an admission-neutral incidence BASE, not a replacement for SCA,
 * SEN, SEAVT, SignCell, FOUR, FCA, Chu or sheaf semantics. Those are
 * source-qualified projections on this base. Media types and source claims
 * label interpretations, never change raw-byte identity. Unlike a Markdown
 * archive, this admits *any* finite digital representation.
 *
 * Addressed bit membership is lazy, never a scan of all bits. Inter-resource
 * arrows must be explicitly supplied: coincident substrings, timestamps,
 * paths and shared words do NOT imply causal, semantic or authority arrows.
 */
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { bytesEqual, canonicalCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const rawBytes = new WeakMap();
const MAX_WINDOW = 256;
const isIndex = value => Number.isSafeInteger(value) && value >= 0;
const rawBitValue = (bytes, bit) => (bytes[Math.floor(bit / 8)] >> (7 - (bit % 8))) & 1;
const finiteString = value => typeof value === "string" && value.length > 0 && value.length <= 256;

function snapshot(value) { return canonicalCarrier(value); }

/** Own arbitrary bytes and present their identity without interpreting them. */
export function markResource(bytes, { mediaType = "application/octet-stream", source } = {}) {
  if (!(bytes instanceof Uint8Array))
    throw new TypeError("markResource: binary source must be Uint8Array");
  if (!finiteString(mediaType))
    throw new TypeError("markResource: mediaType must be a nonempty bounded string");
  if (!Number.isSafeInteger(bytes.byteLength * 8))
    throw new RangeError("markResource: bit-address space exceeds safe integer indices");
  const owned = Uint8Array.from(bytes);
  const resource = Object.freeze({
    kind: "lspace.mark-resource",
    address: makeNiUri(owned),
    byteLength: owned.length,
    bitLength: owned.length * 8,
    mediaType,
    ...(source === undefined ? {} : { source: snapshot(source) }),
  });
  rawBytes.set(resource, owned);
  return resource;
}

/** Return one Mark's actual (address, bit, value), as a typed, addressed cell. */
export function bitAt(resource, bit) {
  const bytes = rawBytes.get(resource);
  if (bytes === undefined) throw new TypeError("bitAt: an admitted mark resource is required");
  if (!isIndex(bit) || bit >= resource.bitLength) throw new RangeError("bitAt: bit outside source resource");
  const value = rawBitValue(bytes, bit);
  const triple = Object.freeze([resource.address, bit, value]);
  return Object.freeze({
    kind: "lspace.mark-bit", address: resource.address, bit, value,
    cell: triple, id: semanticId(triple),
  });
}

/**
 * Exact bounded values of a bit interval on one admitted raw resource.
 * Unlike bitAt this does not construct and hash a SignCell coordinate per
 * bit: the consumer already has the source address and records positions.
 * The Data owner remains sole source of bit ordering and source ownership.
 */
export function bitValues(resource, { offset = 0, count = 64 } = {}) {
  const bytes = rawBytes.get(resource);
  if (bytes === undefined) throw new TypeError("bitValues: admitted mark resource required");
  if (!isIndex(offset) || !isIndex(count) || count > 32768 ||
      offset > resource.bitLength || count > resource.bitLength - offset)
    throw new RangeError("bitValues: invalid or unbounded bit interval");
  return Object.freeze(Array.from({ length: count }, (_item, index) =>
    rawBitValue(bytes, offset + index)));
}

/** Bounded bit projection. The source can be arbitrarily longer than the window. */
export function bitWindow(resource, { offset = 0, limit = 64 } = {}) {
  if (!isIndex(offset) || !isIndex(limit) || limit < 1 || limit > MAX_WINDOW)
    throw new RangeError("bitWindow: safe offset and 1..256 bit limit required");
  if (!rawBytes.has(resource)) throw new TypeError("bitWindow: an admitted mark resource is required");
  if (offset > resource.bitLength) throw new RangeError("bitWindow: offset past end");
  const end = Math.min(resource.bitLength, offset + limit);
  const bits = Object.freeze(Array.from({ length: end - offset }, (_, i) => bitAt(resource, offset + i)));
  return Object.freeze({
    kind: "lspace.mark-window", resource: resource.address, bitLength: resource.bitLength,
    offset, bits, next: end < resource.bitLength ? end : null,
  });
}

/**
 * One explicitly supplied cross-resource incidence. Each source retains its
 * authored evidence; neither absence nor contradictory testimony is silently
 * resolved to a positive relation.
 */
function admitRelation(value, addresses) {
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      !addresses.has(value.from) || !addresses.has(value.to) ||
      !finiteString(value.predicate))
    throw new TypeError("markSpace: each relation needs known address endpoints and typed predicate");
  const evidence = value.evidence === undefined ? { for: [], against: [] } : value.evidence;
  if (!evidence || !Array.isArray(evidence.for) || !Array.isArray(evidence.against))
    throw new TypeError("markSpace: relation evidence requires separate for and against arrays");
  const witness = snapshot({ for: evidence.for, against: evidence.against });
  const cell = snapshot([value.from, value.predicate, value.to]);
  return Object.freeze({
    kind: "lspace.mark-relation", id: semanticId([cell, witness]),
    from: value.from, predicate: value.predicate, to: value.to,
    evidence: witness, cell,
  });
}

/**
 * One coherent finite incidence presentation over any digital resource kind.
 * Identical bytes are one content object with multiple situated presentations.
 * No default inter-resource arrows and no claim that the presentation is
 * already a Grothendieck site or a global semantic/causal topology.
 */
export function markSpace(inputs, { relations = [] } = {}) {
  if (!Array.isArray(inputs) || !Array.isArray(relations))
    throw new TypeError("markSpace: resources and relations must be finite lists");
  const held = new Map(), presentations = new Map();
  for (const entry of inputs) {
    if (!entry || typeof entry !== "object")
      throw new TypeError("markSpace: each input needs bytes and optional source attribution");
    const admitted = markResource(entry.bytes, entry);
    const previous = held.get(admitted.address);
    if (previous !== undefined && !bytesEqual(rawBytes.get(previous), rawBytes.get(admitted)))
      throw new Error("markSpace: content-address collision between distinct raw sources");
    if (previous === undefined) held.set(admitted.address, admitted);
    const names = presentations.get(admitted.address) ?? new Map();
    const identity = semanticId([admitted.mediaType, admitted.source ?? null]);
    names.set(identity, Object.freeze({
      mediaType: admitted.mediaType,
      ...(admitted.source === undefined ? {} : { source: admitted.source }),
    }));
    presentations.set(admitted.address, names);
  }
  const addresses = new Set(held.keys());
  const edges = Object.freeze(relations.map(relation => admitRelation(relation, addresses)));
  const resources = Object.freeze([...held.values()].map(resource => Object.freeze({
    kind: resource.kind, address: resource.address, byteLength: resource.byteLength,
    bitLength: resource.bitLength,
    presentations: Object.freeze([...presentations.get(resource.address).values()]),
  })).sort((a, b) => a.address < b.address ? -1 : a.address > b.address ? 1 : 0));
  return Object.freeze({
    kind: "lspace.mark-space",
    resources, relations: edges,
    get: address => held.get(address) ?? null,
    bit: (address, offset) => bitAt(held.get(address), offset),
    window: (address, options) => bitWindow(held.get(address), options),
  });
}
