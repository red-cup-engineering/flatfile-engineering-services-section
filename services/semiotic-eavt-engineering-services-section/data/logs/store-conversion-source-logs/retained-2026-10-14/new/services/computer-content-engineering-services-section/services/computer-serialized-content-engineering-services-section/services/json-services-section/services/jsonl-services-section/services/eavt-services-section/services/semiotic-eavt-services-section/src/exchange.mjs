/**
 * Exchange between peers (store.md section 8): converge on a type of thread by heads and the
 * records the heads reach. No node lists what it holds.
 *
 * A remote is anything that answers `heads(object)` (an iterable of `{name, frontier}`) and
 * `get(type, address)` (a record or undefined), synchronously or by promise: another node over
 * HTTP or A2A, or a directory of files (`directoryRemote`). This module writes only through the
 * store's own operations.
 */
import { frontierEntries, get, has, heads, keyOf, put, readHead, referenceOf, walk, writeHead } from "./store-core.mjs";
import { checkRoot, checkTypeName } from "./layout.mjs";

/** A remote that is a settlement's directory of files. */
export function directoryRemote(root) {
  return {
    *heads(object) { for (const { name, head } of heads(root, object)) yield { name, frontier: head.frontier, closed: head.closed === true }; },
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
    if (local !== undefined && JSON.stringify(frontierEntries(local.frontier, object)) === JSON.stringify(remoteFrontier)) continue;
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

/** Walk the remote frontier, stopping at what is held locally; then put what was reached, causes first. */
async function reach(root, remote, object, frontier, walkLimit) {
  const seen = new Set();
  const order = [];
  const causeKeys = new Set();
  const unreached = new Set();
  let truncated = false;
  const stack = frontier.map((entry) => referenceOf(entry, object)).reverse();
  while (stack.length > 0) {
    const reference = stack.pop();
    const key = keyOf(reference);
    if (seen.has(key)) continue;
    if (has(root, reference.type, reference.id)) { seen.add(key); continue; }
    if (seen.size >= walkLimit) { truncated = true; unreached.add(key); continue; }
    seen.add(key);
    const record = await remote.get(reference.type, reference.id);
    if (record === undefined || record === null) continue;
    order.push(reference);
    const causes = Array.isArray(record.causes) ? record.causes.map((entry) => referenceOf(entry, reference.type)) : [];
    for (const cause of causes) { causeKeys.add(keyOf(cause)); stack.push(cause); }
  }
  let count = 0;
  const unsafe = unreached;
  for (let at = order.length - 1; at >= 0; at -= 1) {
    const reference = order[at];
    const record = await remote.get(reference.type, reference.id);
    if (record === undefined || record === null) continue;
    const causes = Array.isArray(record.causes) ? record.causes.map((entry) => referenceOf(entry, reference.type)) : [];
    if (causes.some((cause) => unsafe.has(keyOf(cause)))) { unsafe.add(keyOf(reference)); continue; }
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
