// JSON values read into L-Space relations, and rendered back out of them.
//
// Following the March 28 reading of `key: value`, an object's entries are relations from the object's holder to
// each value, the key typing the edge: [holder, key, value]. A non-empty array value is related item by item,
// with the item's position: [holder, key, item, position]. Nested objects and arrays are marks in their own right
// and are related the same way, so every value at every depth is reachable from what holds it.
import { mark, relating, role } from "./l-space.mjs";

/** The role a nested array uses as the key for its items. */
export const ITEM = role("json", "item");

/**
 * Yields every mark and relation reading `value` as held by `holder` (an address).
 * @param {string} holder The address of what holds the entries.
 * @param {Record<string, unknown>} value A JSON object.
 * @returns {Generator<{address: string, value: unknown}>}
 */
export function* relateEntries(holder, value) {
  for (const [key, entry] of Object.entries(value)) yield* relateEntry(holder, mark(key), entry);
}

function* relateEntry(holder, key, entry) {
  yield key;
  if (Array.isArray(entry) && entry.length > 0) {
    for (const [position, item] of entry.entries()) {
      const itemMark = mark(item), positionMark = mark(position);
      yield itemMark;
      yield positionMark;
      yield relating(holder, key.address, itemMark.address, positionMark.address);
      yield* relateNested(itemMark.address, item);
    }
    return;
  }
  const entryMark = mark(entry);
  yield entryMark;
  yield relating(holder, key.address, entryMark.address);
  yield* relateNested(entryMark.address, entry);
}

function* relateNested(holder, value) {
  if (Array.isArray(value)) for (const [position, item] of value.entries()) yield* relateArrayItem(holder, item, position);
  else if (value !== null && typeof value === "object") yield* relateEntries(holder, value);
}

function* relateArrayItem(holder, item, position) {
  const itemMark = mark(item), positionMark = mark(position);
  yield ITEM;
  yield itemMark;
  yield positionMark;
  yield relating(holder, ITEM.address, itemMark.address, positionMark.address);
  yield* relateNested(itemMark.address, item);
}

/**
 * The object of a holder's string-keyed entries, rendered from its relations; the projection out of
 * relateEntries. Relations whose key is not a string mark (a reading's roles) are not entries.
 * @param {Iterable<{relating: string[]}>} relations The relations whose first member is the holder.
 * @param {(address: string) => unknown} valueAt The value of a mark by its address.
 */
export function renderEntries(relations, valueAt) {
  const entries = new Map();
  for (const { relating: members } of relations) {
    const key = valueAt(members[1]);
    if (typeof key !== "string") continue;
    if (members.length === 3) entries.set(key, valueAt(members[2]));
    else if (members.length === 4) {
      const list = Array.isArray(entries.get(key)) ? entries.get(key) : [];
      list[valueAt(members[3])] = valueAt(members[2]);
      entries.set(key, list);
    }
  }
  return Object.fromEntries(entries);
}
