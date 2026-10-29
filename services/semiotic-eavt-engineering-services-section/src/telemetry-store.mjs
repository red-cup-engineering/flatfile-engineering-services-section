/**
 * The telemetry store: SignCell's channels, messages and blobs kept in the SEAVT store (telemetry.md).
 *
 *   blobs     data/blobs/telemetry/sha-256/<first 2>/<remaining 41 digest characters>   whole bytes, named by their RFC 6920 digest
 *   channels  records of type `telemetry-channel`                         the content of a channel, so its address is the store's
 *   messages  records of type `telemetry-log` on the thread named by the trace id, causes = the thread's frontier
 *
 * A message record is `{kind, channel, observedAt, body, causes}`, so the store's address of it is SignCell's message address.
 * Every function is synchronous and durable before it returns: a producer that is killed one line later has already kept
 * its record, which an in-memory batch exporter would have lost.
 */
import { closeSync, mkdirSync, openSync, readFileSync, readSync, fstatSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeFileBytesSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { niBucketPath, niPathSegments } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { admitChannel, admitMessage, admitPacket, channel as makeChannel, message as makeMessage, packet, packetToOtlpLogs } from "@red-cup-engineering/signcell/signal";
import { extend, get, heads, put, readHead, walk } from "./store-core.mjs";
import { NI_PATH_VERSION, StoreCorruption, StoreError, checkRoot } from "./layout.mjs";
import { isAbsoluteSeavtClock } from "./clock.mjs";

export const MESSAGE_TYPE = "telemetry-log";
export const CHANNEL_TYPE = "telemetry-channel";
export const UNTRACED = "untraced";
const TRACE_ID = /^[0-9a-f]{32}$/u;

export const blobFile = (root, address) => {
  if (!isNiUri(address)) throw new StoreError("address", `not a canonical sha-256 NI address: ${String(address)}`);
  // Record buckets hold many addressed JSONL rows. A raw blob needs every
  // digest character in its path; the same bucket prefix cannot name it.
  return join(checkRoot(root), "data", "blobs", "telemetry", ...niPathSegments(address, [2, 41]));
};

// Historical writers placed one raw blob in a shared record-bucket path.
// Preserve that file read-only, admitting it only for its actual byte digest.
const legacyBlobFile = (root, address) => join(checkRoot(root), "data", "blobs", "telemetry", niBucketPath(address, NI_PATH_VERSION));

function readBlobFile(file, address) {
  let bytes;
  try { bytes = new Uint8Array(readFileSync(file)); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  if (!verifyNiUri(bytes, address)) throw new StoreCorruption(`${file} does not hash to ${address}`);
  return bytes;
}

/** Keeps supplied bytes at their full RFC 6920 address. Occupied files must verify before success. */
export function putBlob(root, bytes) {
  if (!(bytes instanceof Uint8Array)) throw new StoreError("blob", "a blob is bytes");
  const address = makeNiUri(bytes);
  const file = blobFile(root, address);
  if (readBlobFile(file, address) !== undefined) return address;
  mkdirSync(dirname(file), { recursive: true });
  try { writeFileBytesSync(file, bytes, { flag: "wx", mode: 0o644 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
  // The shared File writer publishes completed bytes atomically. EEXIST may
  // mean a concurrent publisher won, but alone establishes no byte custody.
  if (readBlobFile(file, address) === undefined)
    throw new StoreError("blob", `blob ${address} is unavailable after publication`);
  return address;
}

/** The bytes the address names, or undefined when not held. Bytes that do not hash to the address are refused. */
export function getBlob(root, address) {
  return readBlobFile(blobFile(root, address), address) ?? readBlobFile(legacyBlobFile(root, address), address);
}

/** Current-address path existence; historical shared paths require verified bytes. Use getBlob for full custody validation. */
export function hasBlob(root, address) {
  try { statSync(blobFile(root, address)); return true; }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readBlobFile(legacyBlobFile(root, address), address) !== undefined;
  }
}

/** Current-address file size without reading bytes; legacy bucket identity must be verified first. */
export function blobSize(root, address) {
  let descriptor;
  try { descriptor = openSync(blobFile(root, address), "r"); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readBlobFile(legacyBlobFile(root, address), address)?.byteLength;
  }
  try { return fstatSync(descriptor).size; } finally { closeSync(descriptor); }
}

const withoutId = ({ id, ...rest }) => rest;

/** Keeps a channel; its store address is its SignCell address. */
export function putChannel(root, channel) {
  const checked = admitChannel(channel);
  if (!checked.ok) throw new StoreError("channel", checked.refusal.message);
  const address = put(root, CHANNEL_TYPE, withoutId(channel));
  if (address !== channel.id) throw new StoreCorruption("a channel's store address differs from its SignCell address");
  return address;
}

export function getChannel(root, address) {
  const record = get(root, CHANNEL_TYPE, address);
  if (record === undefined) return undefined;
  const checked = admitChannel({ ...record, id: address });
  if (!checked.ok) throw new StoreCorruption(`channel ${address}: ${checked.refusal.message}`);
  let value;
  try { value = makeChannel(record); }
  catch (error) { if (!(error instanceof TypeError)) throw error; throw new StoreCorruption(`channel ${address}: ${error.message}`); }
  if (value.id !== address) throw new StoreCorruption(`channel ${address} is not a canonical SignCell channel`);
  return value;
}

/**
 * Appends a message on the thread of `traceId` (`untraced` when none), caused by the thread's whole frontier, and returns the
 * message with its address. The channel must have been put. A trace id that is not thirty-two lowercase hexadecimal characters is refused.
 * Optional `expect` carries the caller's prior frontier to the store's conditional append; omission records a new observation normally.
 */
export function appendMessage(root, { channel, traceId, observedAt, body, expect }) {
  if (traceId !== undefined && !TRACE_ID.test(traceId)) throw new StoreError("trace-id", "a trace id is thirty-two lowercase hexadecimal characters");
  if (getChannel(root, channel) === undefined) throw new StoreError("channel", `channel ${channel} was not put`);
  if (!isAbsoluteSeavtClock(observedAt)) throw new StoreError("message", "a message needs a real observed instant");
  // Admit caller fields before publishing a record or advancing the head. The
  // store's existing locked extend still supplies the actual causal frontier.
  const candidate = makeMessage({ channel, observedAt, body });
  if (candidate.body.traceId !== undefined && candidate.body.traceId !== traceId)
    throw new StoreError("trace-id", "a message's declared trace differs from its destination thread");
  const { id, causes, ...record } = candidate;
  const address = extend(root, MESSAGE_TYPE, traceId ?? UNTRACED, record, { expect });
  return readMessage(root, address);
}

function admittedMessage(record, address) {
  const checked = admitMessage({ ...record, id: address });
  if (!checked.ok) throw new StoreCorruption(`message ${address}: ${checked.refusal.message}`);
  if (!isAbsoluteSeavtClock(record.observedAt)) throw new StoreCorruption(`message ${address} has an invalid observed instant`);
  // Reuse the source constructor for a deeply owned canonical value. Hash
  // validity alone does not admit extra fields or a noncanonical cause list.
  const value = makeMessage(record);
  if (value.id !== address) throw new StoreCorruption(`message ${address} is not a canonical SignCell message`);
  return value;
}

export function readMessage(root, address) {
  const record = get(root, MESSAGE_TYPE, address);
  return record === undefined ? undefined : admittedMessage(record, address);
}

/** The trace ids the store holds threads for. */
export function* traces(root) {
  for (const { name, head } of heads(root, MESSAGE_TYPE, { strict: true })) yield { traceId: name, frontier: head.frontier, at: head.at };
}

/**
 * Admitted messages of one captured trace frontier, causes before effects.
 * Clock order is presentation metadata, never the source of causal order.
 * Coverage distinguishes a complete read, an absent trace and a partial read;
 * a missing/hash-invalid record, foreign typed reference or invalid carrier
 * cannot disappear into a successful empty history. Unreadable heads and real
 * filesystem errors still throw. The frontier names this cut, not a snapshot
 * of later appends and not evidence that the reported events are true.
 */
export function readTrace(root, traceId, { limit = 4096 } = {}) {
  if (traceId !== UNTRACED && !TRACE_ID.test(traceId ?? "")) throw new StoreError("trace-id", "a trace id is thirty-two lowercase hexadecimal characters or untraced");
  if (!Number.isSafeInteger(limit) || limit < 1) throw new StoreError("walk", "walk limit is a positive integer");
  const head = readHead(root, MESSAGE_TYPE, traceId, { strict: true });
  const messages = [], issues = [], channels = new Map();
  let truncated = false;
  const result = (status) => Object.freeze({
    messages: Object.freeze(messages), truncated,
    coverage: Object.freeze({ status, frontier: Object.freeze((head?.frontier ?? []).map(entry => entry !== null && typeof entry === "object" ? Object.freeze({ ...entry }) : entry)), issues: Object.freeze(issues) }),
  });
  if (head === undefined) return result("absent");
  const issue = (code, type, address) => issues.push(Object.freeze({ code, ...(type === undefined ? {} : { type }), ...(address === undefined ? {} : { address }) }));
  try {
    for (const item of walk(root, MESSAGE_TYPE, head.frontier, { limit })) {
      if (item.truncated) { truncated = true; continue; }
      if (item.type !== MESSAGE_TYPE) { issue("foreign-record", item.type, item.address); continue; }
      // walk's permissive lookup means missing OR no content-address-valid
      // record at this coordinate. Do not assert which from this observation.
      if (item.missing) { issue("unavailable-record", item.type, item.address); continue; }
      let value;
      try { value = admittedMessage(item.record, item.address); }
      catch (error) { if (!(error instanceof StoreCorruption)) throw error; issue("invalid-message", item.type, item.address); continue; }
      if (value.body.traceId !== undefined && value.body.traceId !== traceId) {
        issue("trace-context-mismatch", item.type, item.address); continue;
      }
      if (!channels.has(value.channel)) {
        try {
          const channel = getChannel(root, value.channel);
          channels.set(value.channel, channel !== undefined);
          if (channel === undefined) issue("unavailable-channel", CHANNEL_TYPE, value.channel);
        } catch (error) {
          if (!(error instanceof StoreCorruption)) throw error;
          channels.set(value.channel, false); issue("invalid-channel", CHANNEL_TYPE, value.channel);
        }
      }
      if (channels.get(value.channel)) messages.push(value);
    }
  } catch (error) {
    // The common walk refuses malformed reference syntax before yielding its
    // cut. Keep that refusal visible; do not mask I/O or programming failures.
    if (!(error instanceof StoreError) || !["reference", "type-name"].includes(error.code)) throw error;
    issue("invalid-causal-reference");
  }
  // walk yields reverse DFS postorder (effects before causes). Reversing it
  // is topological for its original DAG, including shared ancestors/fan-in.
  messages.reverse();
  const positions = new Map(messages.map((message, index) => [message.id, index]));
  for (const [index, message] of messages.entries()) for (const cause of message.causes) {
    if (!positions.has(cause)) issue("unresolved-cause", MESSAGE_TYPE, cause);
    else if (positions.get(cause) >= index) issue("causal-order", MESSAGE_TYPE, message.id);
  }
  return result(!truncated && issues.length === 0 ? "complete" : "incomplete");
}

/**
 * The trace as OTLP: one `ExportLogsServiceRequest` per channel (a packet of that channel's messages). Returns the requests.
 */
export function exportTrace(root, traceId, options) {
  const { messages, truncated, coverage } = readTrace(root, traceId, options);
  if (coverage.status !== "complete") {
    const error = new StoreError("incomplete-trace", coverage.status === "absent"
      ? `store holds no trace ${traceId}` : `trace ${traceId} cannot be exported from incomplete source records`);
    error.coverage = coverage;
    error.truncated = truncated;
    throw error;
  }
  const byChannel = Map.groupBy(messages, (message) => message.channel);
  const requests = [];
  for (const [channelId, held] of [...byChannel].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const channel = getChannel(root, channelId);
    if (channel === undefined) throw new StoreCorruption(`trace ${traceId} names channel ${channelId}, which the store does not hold`);
    const carried = packet({ channel, messages: held });
    if (!admitPacket(carried).ok) throw new StoreCorruption(`trace ${traceId}: packet does not admit`);
    const request = packetToOtlpLogs(carried, { channel, scopeName: "seavt.telemetry" });
    // A packet's canonical set order is independent of causal order. Keep
    // its identity and all original records, ordering only the OTLP array by
    // this trace's admitted causes-before-effects reading.
    const positions = new Map(held.map((message, index) => [message.id, index]));
    const positionOf = record => positions.get(record.attributes.find(attribute => attribute.key === "semioverse.message.id").value.stringValue);
    for (const resource of request.resourceLogs) for (const scope of resource.scopeLogs)
      scope.logRecords.sort((left, right) => positionOf(left) - positionOf(right));
    requests.push(request);
  }
  return requests;
}

/** Every request of every trace the store holds (or of the traces whose thread head is at or after `since`, an ISO instant). */
export function* exportAll(root, { since } = {}) {
  for (const { traceId, at } of traces(root)) {
    if (since !== undefined && at < since) continue;
    yield* exportTrace(root, traceId);
  }
}
