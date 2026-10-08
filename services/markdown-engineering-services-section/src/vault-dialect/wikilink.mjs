/**
 * `wikilink` — Obsidian-style `[[wikilink]]` graph resolution. Obsidian resolves a
 * bare `[[Note]]` by note title (basename) or declared alias, and when a vault holds two notes
 * with the same title/alias in different folders, real Obsidian requires "unique note names" or
 * disambiguates by the linking note's own folder proximity; this package uses the simpler,
 * documented **shortest-unique-path rule**: among every room whose basename or alias matches,
 * the one reachable by the fewest path segments (closest to the vault root) wins, but ONLY if
 * that minimum is achieved by exactly one candidate — a tie at the minimum is reported
 * ambiguous rather than guessed, same as a genuine duplicate title would be in Obsidian itself.
 * A link written with an explicit folder path (`[[projects/Note]]`) is resolved by exact
 * path-suffix match instead, matching how Obsidian treats a path-qualified wikilink.
 */

function stripExt(s) {
  return s.replace(/\.(md)$/i, '');
}

/** @param {readonly Room[]} rooms */
export function buildWikilinkIndex(rooms) {
  const byBasename = new Map();
  const byAlias = new Map();
  const allIds = rooms.map((r) => r.id);
  for (const r of rooms) {
    const base = stripExt(basenameOf(r.id)).toLowerCase();
    addTo(byBasename, base, r.id);
    for (const alias of r.aliases) addTo(byAlias, alias.toLowerCase(), r.id);
  }
  return { byBasename, byAlias, allIds };
}

function basenameOf(roomId) {
  const parts = roomId.split('/');
  return parts[parts.length - 1] ?? roomId;
}

function addTo(map, key, id) {
  const list = map.get(key) ?? [];
  list.push(id);
  map.set(key, list);
}

function segCount(roomId) {
  return roomId.split('/').length;
}

/** @param {string[]} candidates */
function pickShortestUnique(candidates) {
  if (candidates.length === 1) return { kind: 'resolved', roomId: candidates[0] };
  let minLen = Infinity;
  let winners = [];
  for (const id of candidates) {
    const len = segCount(id);
    if (len < minLen) {
      minLen = len;
      winners = [id];
    } else if (len === minLen) {
      winners.push(id);
    }
  }
  if (winners.length === 1) return { kind: 'resolved', roomId: winners[0] };
  return { kind: 'ambiguous', candidates: [...candidates].sort() };
}

/**
 * @param {string} raw the wikilink's inner text (no surrounding `[[` `]]`)
 * @param {string} sourceRoomId
 * @param {{byBasename: Map<string,string[]>, byAlias: Map<string,string[]>, allIds: string[]}} index
 */
export function resolveWikilink(raw, sourceRoomId, index) {
  let target = raw.trim();
  target = target.split('|')[0] ?? target; // strip [[Target|Display text]] alias part
  target = target.split('#')[0] ?? target; // strip [[Target#Heading]] block/heading ref
  target = target.trim();
  if (target.length === 0) return { kind: 'not-a-doc-link' };
  if (/^[a-z]+:\/\//i.test(target)) return { kind: 'external' };

  if (target.includes('/')) {
    const suffix = stripExt(target).toLowerCase();
    // A path-suffix match ends in the suffix's last segment, so only rooms of that basename can match.
    const named = index.byBasename.get(suffix.slice(suffix.lastIndexOf('/') + 1)) ?? [];
    const matches = named.filter((id) => {
      const idNoExt = stripExt(id).toLowerCase();
      return idNoExt === suffix || idNoExt.endsWith('/' + suffix);
    });
    if (matches.length === 0) return { kind: 'unresolved', raw: target };
    if (matches.length > 1) return { kind: 'ambiguous', raw: target, candidates: [...matches].sort() };
    const only = matches[0];
    if (only === sourceRoomId) return { kind: 'self' };
    return { kind: 'resolved', roomId: only };
  }

  const key = stripExt(target).toLowerCase();
  const candidates = [...new Set([...(index.byBasename.get(key) ?? []), ...(index.byAlias.get(key) ?? [])])];
  if (candidates.length === 0) return { kind: 'unresolved', raw: target };
  const picked = pickShortestUnique(candidates);
  if (picked.kind === 'ambiguous') return { kind: 'ambiguous', raw: target, candidates: picked.candidates };
  if (picked.roomId === sourceRoomId) return { kind: 'self' };
  return picked;
}
