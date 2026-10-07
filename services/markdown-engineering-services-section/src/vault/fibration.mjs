// The predicate fibration of a vault's frontmatter.
//
// Each frontmatter key is a predicate; the values a locale's documents give it are that key's
// fiber. Read across a locale, the fibers show the practice the documents already share: which
// value a key mostly takes, which keys documents of one type mostly carry, which keys take the
// same values under different names. This is a reading of what the frontmatter says, not an
// admission of it: a divergence here is a question the practice raises, never a refusal.

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

/** The values one frontmatter entry gives its key: each scalar, or each scalar of a list. Maps say nothing flat. */
function valuesOf(value) {
  if (Array.isArray(value)) return value.flatMap(valuesOf);
  if (isPlainObject(value)) return [];
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? [] : [value.toISOString().slice(0, 10)];
  if (typeof value === "string") return value.trim() === "" ? [] : [value.trim()];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [];
}

/** A value shaped like a name, rather than a datum taken as given: no date, number, address, path or sentence. */
function isNameLike(value) {
  return value.length <= 60 && !/^(true|false|null|yes|no)$/iu.test(value) && !/^[\d\s:.+TZ/-]+$/u.test(value)
    && !/^[a-z][a-z0-9+.-]*:\/\//iu.test(value) && !value.includes("/") && !/[.!?]\s|[.!?]$/u.test(value)
    && value.split(/\s+/u).length <= 6;
}

/** Each document of the locale with its frontmatter entries: `[{path, entries: Map<key, values[]>}]`. */
function entriesOf(documents, locale) {
  return documents
    .filter(({ path }) => path.startsWith(locale))
    .map(({ path, properties }) => ({
      path,
      entries: new Map(Object.entries(properties ?? {}).map(([key, value]) => [key, valuesOf(value)]).filter(([, values]) => values.length > 0)),
    }));
}

/**
 * The fiber of one key within a locale (a path prefix): every value the locale's documents give
 * it, with how many documents give each, most given first.
 * @param {{ documents: {path: string, properties: object}[], key: string, locale?: string, limit?: number }} request
 */
export function readFiber({ documents, key, locale = "", limit = 50 }) {
  const counts = new Map();
  let carrying = 0;
  for (const { entries } of entriesOf(documents, locale)) {
    const values = entries.get(key);
    if (!values) continue;
    carrying += 1;
    for (const value of new Set(values)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const values = [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"));
  return Object.freeze({
    kind: "vault.fiber",
    key,
    locale,
    documents: carrying,
    distinctValues: values.length,
    values: Object.freeze(values.slice(0, limit).map(([value, count]) => Object.freeze({ value, documents: count }))),
  });
}

/**
 * Where a locale diverges from its own practice. A value divergence: a key most of the locale's
 * documents give one value (at least `dominance` of those giving a single value, over at least
 * `minimum` documents), which some document gives otherwise. An absence divergence: a key most
 * documents of one `type` in the locale carry, which some document of that type lacks. Each is a
 * question the practice raises (a typo, an exception, a convention changing), firmest first.
 * @param {{ documents: {path: string, properties: object}[], locale?: string, minimum?: number, dominance?: number, limit?: number, sample?: number }} request
 */
export function readDivergences({ documents, locale = "", minimum = 5, dominance = 0.8, limit = 50, sample = 10 }) {
  const located = entriesOf(documents, locale);
  const divergences = [];
  const singleByKey = new Map();
  for (const { path, entries } of located) {
    for (const [key, values] of entries) {
      if (values.length !== 1) continue;
      const counts = singleByKey.get(key) ?? new Map();
      counts.set(values[0], [...(counts.get(values[0]) ?? []), path]);
      singleByKey.set(key, counts);
    }
  }
  for (const [key, counts] of singleByKey) {
    const total = [...counts.values()].reduce((sum, holders) => sum + holders.length, 0);
    const [dominant, holders] = [...counts].sort((left, right) => right[1].length - left[1].length)[0];
    if (holders.length < minimum || holders.length / total < dominance || holders.length === total) continue;
    for (const [value, others] of counts) {
      if (value === dominant) continue;
      divergences.push(Object.freeze({ kind: "value", key, dominant, dominantDocuments: holders.length, of: total, value, documents: Object.freeze(others.slice(0, sample)), diverging: others.length }));
    }
  }
  const byType = new Map();
  for (const document of located) for (const type of document.entries.get("type") ?? []) byType.set(type, [...(byType.get(type) ?? []), document]);
  for (const [type, typed] of byType) {
    if (typed.length < minimum) continue;
    const carriers = new Map();
    for (const { entries } of typed) for (const key of entries.keys()) carriers.set(key, (carriers.get(key) ?? 0) + 1);
    for (const [key, count] of carriers) {
      if (count === typed.length || count / typed.length < dominance) continue;
      const lacking = typed.filter(({ entries }) => !entries.has(key)).map(({ path }) => path);
      divergences.push(Object.freeze({ kind: "absence", key, type, carrying: count, of: typed.length, documents: Object.freeze(lacking.slice(0, sample)), diverging: lacking.length }));
    }
  }
  divergences.sort((left, right) => (right.dominantDocuments ?? right.carrying) - (left.dominantDocuments ?? left.carrying) || left.key.localeCompare(right.key, "en"));
  return Object.freeze({ kind: "vault.divergences", locale, documents: located.length, total: divergences.length, truncated: divergences.length > limit, divergences: Object.freeze(divergences.slice(0, limit)) });
}

/**
 * The relations between keys the fibers show: pairs of keys whose fibers share values within a
 * locale, with how many values they share (and as a share of the smaller fiber) and how many
 * documents carry both. Keys that share much and rarely meet in one document are likely one
 * predicate under several names, a candidate for the term contract's predicate identification
 * ledger (where saying two predicates are equal is paid for); keys that often meet restate each
 * other. Only name-like values count, so shared dates and flags relate nothing.
 * @param {{ documents: {path: string, properties: object}[], locale?: string, minimum?: number, overlap?: number, limit?: number }} request
 */
export function readKeyAffinities({ documents, locale = "", minimum = 5, overlap = 0.3, limit = 50 }) {
  const valuesByKey = new Map();
  const documentsByKey = new Map();
  for (const { path, entries } of entriesOf(documents, locale)) {
    for (const [key, values] of entries) {
      const names = values.filter(isNameLike);
      if (names.length === 0) continue;
      const set = valuesByKey.get(key) ?? valuesByKey.set(key, new Set()).get(key);
      for (const value of names) set.add(value);
      (documentsByKey.get(key) ?? documentsByKey.set(key, new Set()).get(key)).add(path);
    }
  }
  const keysByValue = new Map();
  for (const [key, values] of valuesByKey) {
    if (values.size < minimum) continue;
    for (const value of values) (keysByValue.get(value) ?? keysByValue.set(value, []).get(value)).push(key);
  }
  const shared = new Map();
  for (const keys of keysByValue.values()) {
    if (keys.length < 2 || keys.length > 40) continue;
    for (let i = 0; i < keys.length; i += 1) for (let j = i + 1; j < keys.length; j += 1) {
      const pair = keys[i] < keys[j] ? `${keys[i]}\u0000${keys[j]}` : `${keys[j]}\u0000${keys[i]}`;
      shared.set(pair, (shared.get(pair) ?? 0) + 1);
    }
  }
  const affinities = [];
  for (const [pair, count] of shared) {
    const [left, right] = pair.split("\u0000");
    const share = count / Math.min(valuesByKey.get(left).size, valuesByKey.get(right).size);
    if (share < overlap) continue;
    const [fewer, more] = documentsByKey.get(left).size <= documentsByKey.get(right).size ? [left, right] : [right, left];
    let together = 0;
    for (const path of documentsByKey.get(fewer)) if (documentsByKey.get(more).has(path)) together += 1;
    affinities.push(Object.freeze({ keys: Object.freeze([left, right]), sharedValues: count, share: Math.round(share * 100) / 100, documents: Object.freeze([documentsByKey.get(left).size, documentsByKey.get(right).size]), together }));
  }
  affinities.sort((a, b) => b.sharedValues * b.share - a.sharedValues * a.share);
  return Object.freeze({ kind: "vault.key-affinities", locale, total: affinities.length, truncated: affinities.length > limit, affinities: Object.freeze(affinities.slice(0, limit)) });
}
