/**
 * The telemetry store: SignCell's channels, messages and blobs kept in the SEAVT store (telemetry.md).
 *
 *   blobs     data/blobs/telemetry/<ni-path-v1 bucket of the address>   whole bytes, named by their RFC 6920 digest
 *   channels  records of type `telemetry-channel`                         the content of a channel, so its address is the store's
 *   messages  records of type `telemetry-log` on the thread named by the trace id, causes = the thread's frontier
 *
 * A message record is `{kind, channel, observedAt, body, causes}`, so the store's address of it is SignCell's message address.
 * Every function is synchronous and durable before it returns: a producer that is killed one line later has already kept
 * its record, which an in-memory batch exporter would have lost.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, fstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeFileBytesSync } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { niBucketPath } from "@red-cup-engineering/computer-content-address-engineering-services-section/ni-path";
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { admitChannel, admitMessage, admitPacket, packet, packetToOtlpLogs } from "@red-cup-engineering/signcell/signal";
import { extend, get, heads, put, readHead, walk } from "./store-core.mjs";
import { NI_PATH_VERSION, StoreCorruption, StoreError, checkRoot } from "./layout.mjs";

export const MESSAGE_TYPE = "telemetry-log";
export const CHANNEL_TYPE = "telemetry-channel";
export const UNTRACED = "untraced";
const TRACE_ID = /^[0-9a-f]{32}$/u;

export const blobFile = (root, address) => {
  if (!isNiUri(address)) throw new StoreError("address", `not a canonical sha-256 NI address: ${String(address)}`);
  return join(checkRoot(root), "data", "blobs", "telemetry", niBucketPath(address, NI_PATH_VERSION));
};

/** Keeps `bytes` whole under their RFC 6920 address and returns it. The same bytes are kept once. */
export function putBlob(root, bytes) {
  if (!(bytes instanceof Uint8Array)) throw new StoreError("blob", "a blob is bytes");
  const address = makeNiUri(bytes);
  const file = blobFile(root, address);
  if (existsSync(file)) return address;
  mkdirSync(dirname(file), { recursive: true });
  try { writeFileBytesSync(file, bytes, { flag: "wx", mode: 0o644 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
  return address;
}

/** The bytes the address names, or undefined when not held. Bytes that do not hash to the address are refused. */
export function getBlob(root, address) {
  const file = blobFile(root, address);
  let bytes;
  try { bytes = new Uint8Array(readFileSync(file)); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  if (!verifyNiUri(bytes, address)) throw new StoreCorruption(`${file} does not hash to ${address}`);
  return bytes;
}

export const hasBlob = (root, address) => existsSync(blobFile(root, address));

/** A blob's size without reading it, or undefined. */
export function blobSize(root, address) {
  let descriptor;
  try { descriptor = openSync(blobFile(root, address), "r"); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
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
  return record === undefined ? undefined : Object.freeze({ ...record, id: address });
}

/**
 * Appends a message on the thread of `traceId` (`untraced` when none), caused by the thread's whole frontier, and returns the
 * message with its address. The channel must have been put. A trace id that is not thirty-two lowercase hexadecimal characters is refused.
 */
export function appendMessage(root, { channel, traceId, observedAt, body }) {
  if (traceId !== undefined && !TRACE_ID.test(traceId)) throw new StoreError("trace-id", "a trace id is thirty-two lowercase hexadecimal characters");
  if (get(root, CHANNEL_TYPE, channel) === undefined) throw new StoreError("channel", `channel ${channel} was not put`);
  const address = extend(root, MESSAGE_TYPE, traceId ?? UNTRACED, { kind: "signcell.message", channel, observedAt, body });
  return readMessage(root, address);
}

export function readMessage(root, address) {
  const record = get(root, MESSAGE_TYPE, address);
  if (record === undefined) return undefined;
  const value = Object.freeze({ ...record, id: address });
  const checked = admitMessage(value);
  if (!checked.ok) throw new StoreCorruption(`message ${address}: ${checked.refusal.message}`);
  return value;
}

/** The trace ids the store holds threads for. */
export function* traces(root) {
  for (const { name, head } of heads(root, MESSAGE_TYPE)) yield { traceId: name, frontier: head.frontier, at: head.at };
}

/** Every message of one trace, from the thread's frontier along causes, oldest first. */
export function readTrace(root, traceId, { limit = 4096 } = {}) {
  const head = readHead(root, MESSAGE_TYPE, traceId);
  if (head === undefined) return Object.freeze({ messages: Object.freeze([]), truncated: false });
  const messages = [];
  let truncated = false;
  for (const item of walk(root, MESSAGE_TYPE, head.frontier, { limit })) {
    if (item.truncated) { truncated = true; continue; }
    if (item.missing) continue;
    messages.push(Object.freeze({ ...item.record, id: item.address }));
  }
  messages.sort((a, b) => (a.observedAt === b.observedAt ? (a.id < b.id ? -1 : 1) : a.observedAt < b.observedAt ? -1 : 1));
  return Object.freeze({ messages: Object.freeze(messages), truncated });
}

/**
 * The trace as OTLP: one `ExportLogsServiceRequest` per channel (a packet of that channel's messages). Returns the requests.
 */
export function exportTrace(root, traceId, options) {
  const { messages } = readTrace(root, traceId, options);
  const byChannel = Map.groupBy(messages, (message) => message.channel);
  const requests = [];
  for (const [channelId, held] of [...byChannel].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const channel = getChannel(root, channelId);
    if (channel === undefined) throw new StoreCorruption(`trace ${traceId} names channel ${channelId}, which the store does not hold`);
    const carried = packet({ channel, messages: held });
    if (!admitPacket(carried).ok) throw new StoreCorruption(`trace ${traceId}: packet does not admit`);
    requests.push(packetToOtlpLogs(carried, { channel, scopeName: "seavt.telemetry" }));
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
