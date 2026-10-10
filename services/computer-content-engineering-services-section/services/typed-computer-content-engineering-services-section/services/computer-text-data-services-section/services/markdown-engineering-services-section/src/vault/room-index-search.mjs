const FIELD_WEIGHTS = Object.freeze({ title: 64, token: 32, path: 16, summary: 8 });
const EXACT_TITLE_WEIGHT = 4096;
const MATCHED_TOKEN_WEIGHT = 128;

/** A stable comparison form for human text, paths, and catalogue facets. */
export function normalizeRoomIndexText(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKD")
    .replaceAll(/\p{Mark}+/gu, "")
    .toLocaleLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replaceAll(/\s+/gu, " ");
}

function strings(values) {
  return values.flat(Infinity).filter((value) => typeof value === "string" && value.trim() !== "");
}

function roomFields(room) {
  const position = room?.space?.semanticPosition ?? {};
  return Object.freeze({
    title: strings([room?.title]),
    token: strings([
      room?.tokens, room?.aliases, room?.keywords,
      (room?.headings ?? []).map((heading) => typeof heading === "string"
        ? heading
        : [heading?.text, heading?.title, heading?.value].find((value) => typeof value === "string")),
      position.tags, position.tokens, position.scienceOwner,
      room?.collection, room?.kind,
    ]),
    path: strings([room?.id, room?.path, room?.sourcePath, position.sourcePath]),
    summary: strings([room?.summary, room?.description]),
  });
}

function normalizedPrefix(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
  return value.normalize("NFKD").replaceAll(/\p{Mark}+/gu, "").toLocaleLowerCase().replaceAll("\\", "/").trim();
}

function selectedKinds(kind, kinds) {
  if (kind !== undefined && kinds !== undefined) throw new TypeError("choose either kind or kinds, not both");
  const offered = kind === undefined ? kinds : [kind];
  if (offered === undefined) return undefined;
  if (!Array.isArray(offered) || offered.some((value) => typeof value !== "string" || normalizeRoomIndexText(value) === "")) {
    throw new TypeError("kind filters must be non-empty strings");
  }
  return new Set(offered.map(normalizeRoomIndexText));
}

function beginsWithFacet(value, prefix) {
  if (prefix === undefined) return true;
  return typeof value === "string"
    && value.normalize("NFKD").replaceAll(/\p{Mark}+/gu, "").toLocaleLowerCase().replaceAll("\\", "/").startsWith(prefix);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function evidenceFor(room, queryTokens, match) {
  const fields = roomFields(room);
  const evidence = [];
  for (const token of queryTokens) {
    const tokenEvidence = [];
    for (const field of ["title", "token", "path", "summary"]) {
      for (const value of fields[field]) {
        if (normalizeRoomIndexText(value).includes(token)) {
          tokenEvidence.push(Object.freeze({ field, value, weight: FIELD_WEIGHTS[field] }));
        }
      }
    }
    if (tokenEvidence.length > 0) evidence.push(Object.freeze({ token, matches: Object.freeze(tokenEvidence) }));
  }
  if (evidence.length === 0 || (match === "all" && evidence.length !== queryTokens.length)) return null;
  return Object.freeze(evidence);
}

function compareResults(left, right) {
  return Number(right.exactTitle) - Number(left.exactTitle)
    || right.score - left.score
    || compareText(normalizeRoomIndexText(left.room.title), normalizeRoomIndexText(right.room.title))
    || compareText(String(left.room.id ?? left.room.path ?? left.room.sourcePath ?? ""), String(right.room.id ?? right.room.path ?? right.room.sourcePath ?? ""))
    || compareText(String(left.room.key ?? ""), String(right.room.key ?? ""));
}

/**
 * Search an already-admitted immutable room index.
 * The result explains its deterministic rank without reading room bodies.
 */
export function searchImmutableRoomIndex(rooms, {
  query = "", match = "all", collectionPrefix, pathPrefix, kind, kinds, limit,
} = {}) {
  if (!Array.isArray(rooms)) throw new TypeError("rooms must be an array");
  if (typeof query !== "string") throw new TypeError("query must be a string");
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new RangeError("limit must be a positive safe integer");
  }
  if (match !== "all" && match !== "any") throw new RangeError("match must be all or any");
  const normalizedQuery = normalizeRoomIndexText(query);
  const queryTokens = Object.freeze([...new Set(normalizedQuery.split(" ").filter(Boolean))]);
  const collection = normalizedPrefix(collectionPrefix, "collectionPrefix");
  const path = normalizedPrefix(pathPrefix, "pathPrefix");
  const admittedKinds = selectedKinds(kind, kinds);
  const results = [];

  if (queryTokens.length > 0) {
    for (const room of rooms) {
      if (room === null || typeof room !== "object") continue;
      if (!beginsWithFacet(room.collection, collection)) continue;
      const roomPath = room.id ?? room.path ?? room.sourcePath ?? room.space?.semanticPosition?.sourcePath;
      if (!beginsWithFacet(roomPath, path)) continue;
      if (admittedKinds && !admittedKinds.has(normalizeRoomIndexText(room.kind))) continue;
      const evidence = evidenceFor(room, queryTokens, match);
      if (evidence === null) continue;
      const exactTitle = normalizeRoomIndexText(room.title) === normalizedQuery;
      const score = (exactTitle ? EXACT_TITLE_WEIGHT : 0)
        + (evidence.length * MATCHED_TOKEN_WEIGHT)
        + evidence.reduce((sum, tokenEvidence) => sum + [...new Set(tokenEvidence.matches.map(({ field }) => field))]
          .reduce((subtotal, field) => subtotal + FIELD_WEIGHTS[field], 0), 0);
      const fields = [...new Set(evidence.flatMap(({ matches }) => matches.map(({ field }) => field)))];
      const reasons = Object.freeze([
        ...(exactTitle ? ["exact-normalized-title"] : []),
        ...fields.map((field) => `query-token-in-${field}`),
      ]);
      results.push(Object.freeze({ room, exactTitle, score, reasons, evidence }));
    }
  }

  results.sort(compareResults);
  const total = results.length;
  const selected = limit === undefined ? results : results.slice(0, limit);
  return Object.freeze({
    query: query.trim(), normalizedQuery, queryTokens,
    filters: Object.freeze({ match, collectionPrefix: collection, pathPrefix: path, kinds: admittedKinds ? Object.freeze([...admittedKinds].sort()) : undefined }),
    total, returned: selected.length, results: Object.freeze(selected),
  });
}

export { FIELD_WEIGHTS as ROOM_INDEX_SEARCH_FIELD_WEIGHTS };
