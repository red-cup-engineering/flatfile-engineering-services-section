/**
 * Exchange between peers (store.md section 8): converge on a type of thread by heads and the
 * records the heads reach. No node lists what it holds.
 *
 * A remote is anything that answers `heads(object)` (an iterable of `{name, frontier}`) and
 * `get(type, address)` (a record or undefined), synchronously or by promise: another node over
 * HTTP or A2A, or a directory of files (`directoryRemote`). This module writes only through the
 * store's own operations.
 */
import { frontierEntries, get, has, heads, keyOf, put, readHead, recordAddressMatches, referenceOf, walk, writeHead } from "./store-core.mjs";
import { checkRoot, checkTypeName } from "./layout.mjs";

/** A remote that is a settlement's directory of files. */
export function directoryRemote(root) {
  return {
    *heads(object) { for (const { name, head } of heads(root, object, {strict:true})) yield { name, frontier: head.frontier, closed: head.closed === true }; },
    get: (type, address) => get(root, type, address),
  };
}

/**
 * Pull up to `limit` heads of `object` from `remote`. For each head whose frontier differs from the
 * local one, walk the remote frontier along causes, stopping at every address the local store has,
 * put what was reached (causes before effects), and write the local head with the maximal
 * addresses of the old frontier and the remote's. A walk longer than `walkLimit` records puts what
 * it can prove reachable and leaves that head for the next pull. Returns
 * `{heads, converged, records, truncated}`.
 */
export async function pull(root, remote, object, { limit = 256, walkLimit = 4096 } = {}) {
  checkRoot(root); checkTypeName(object);
  const summary = { heads: 0, converged: 0, records: 0, truncated: false };
  for await (const { name, frontier, closed } of remote.heads(object)) {
    if (summary.heads >= limit) { summary.truncated = true; break; }
    summary.heads += 1;
    const local = readHead(root, object, name);
    const remoteFrontier = frontierEntries(frontier, object);
    if (local !== undefined && JSON.stringify(frontierEntries(local.frontier, object)) === JSON.stringify(remoteFrontier)) {
      // A channel may close without emitting another record. Retain that terminal
      // head transition, but never let an unchanged peer reopen an already closed head.
      if (closed === true && local.closed !== true) {
        writeHead(root, object, name, { frontier: remoteFrontier, closed: true }, { expect: remoteFrontier });
        summary.converged += 1;
      }
      continue;
    }
    const reached = await reach(root, remote, object, remoteFrontier, walkLimit);
    summary.records += reached.put;
    if (reached.truncated) { summary.truncated = true; continue; }
    const localFrontier = local === undefined ? [] : frontierEntries(local.frontier, object);
    const next = maximal(root, object, localFrontier, remoteFrontier, reached.causeKeys, walkLimit);
    writeHead(root, object, name, { frontier: next, closed: closed === true && next.length === remoteFrontier.length }, { expect: local === undefined ? null : localFrontier });
    summary.converged += 1;
  }
  return summary;
}

/** Walk a peer's frontier without retaining record payloads. A missing, malformed, or
 * mismatched content address cannot establish a head, even when its parent arrived.
 * Leaf records can be put immediately; records with causes are fetched again only
 * after their dependencies are present. This preserves the store's one-record memory
 * bound while avoiding a second remote read for terminal messages and ledger events. */
async function reach(root, remote, object, frontier, walkLimit) {
  const seen = new Set();
  const order = [];
  const causeKeys = new Set();
  const unsafe = new Set();
  let truncated = false;
  let count = 0;
  const stack = frontier.map((entry) => referenceOf(entry, object)).reverse();
  const valid = (record, reference) =>
    recordAddressMatches(record, reference.id) &&
    (record.causes === undefined || Array.isArray(record.causes));
  while (stack.length > 0) {
    const reference = stack.pop();
    const key = keyOf(reference);
    if (seen.has(key)) continue;
    if (has(root, reference.type, reference.id)) { seen.add(key); continue; }
    if (seen.size >= walkLimit) { truncated = true; unsafe.add(key); continue; }
    seen.add(key);
    const record = await remote.get(reference.type, reference.id);
    if (!valid(record, reference)) { truncated = true; unsafe.add(key); continue; }
    const causes = (record.causes ?? []).map((entry) => referenceOf(entry, reference.type));
    for (const cause of causes) { causeKeys.add(keyOf(cause)); stack.push(cause); }
    if (causes.length === 0) {
      put(root, reference.type, record);
      count += 1;
    } else {
      order.push(reference);
    }
  }
  for (let at = order.length - 1; at >= 0; at -= 1) {
    const reference = order[at];
    const key = keyOf(reference);
    const record = await remote.get(reference.type, reference.id);
    if (!valid(record, reference)) { truncated = true; unsafe.add(key); continue; }
    const causes = (record.causes ?? []).map((entry) => referenceOf(entry, reference.type));
    if (causes.some((cause) => unsafe.has(keyOf(cause)) || !has(root, cause.type, cause.id))) {
      truncated = true;
      unsafe.add(key);
      continue;
    }
    put(root, reference.type, record);
    count += 1;
  }
  return { put: count, truncated, causeKeys };
}

/** The maximal addresses of two frontiers: one that is a cause of another in the records between is dropped. */
function maximal(root, object, localFrontier, remoteFrontier, walkedCauseKeys, walkLimit) {
  const union = frontierEntries([...localFrontier, ...remoteFrontier], object);
  const dropped = new Set();
  for (const entry of union) if (walkedCauseKeys.has(keyOf(referenceOf(entry, object)))) dropped.add(keyOf(referenceOf(entry, object)));
  // A remote entry the local store already held may be an ancestor of the local frontier: read the local records back to meet it.
  const held = union.filter((entry) => !dropped.has(keyOf(referenceOf(entry, object))));
  if (held.length > 1 && localFrontier.length > 0) {
    const wanted = new Set(held.map((entry) => keyOf(referenceOf(entry, object))));
    const own = new Set(localFrontier.map((entry) => keyOf(referenceOf(entry, object))));
    for (const step of walk(root, object, localFrontier, { limit: walkLimit })) {
      if (step.address === undefined) continue;
      const key = `${step.type} ${step.address}`;
      if (wanted.has(key) && !own.has(key)) dropped.add(key);
    }
  }
  return union.filter((entry) => !dropped.has(keyOf(referenceOf(entry, object))));
}
