/**
 * `docindex` — shared path-first link resolution for the two dialects that link by literal
 * file path/extension (house's `[text](path.md)` and org's `[[file:path.org]]`).
 *
 * A path-shaped link means what a file system means by it: `../terms/atari.md` written in
 * `notes/2026/alpha.md` names `notes/terms/atari.md`, and nothing else. Only when no room
 * stands at that path does the resolver fall back to the basename, and then only a unique
 * basename resolves; a duplicate is ambiguous, never guessed. Obsidian's title/alias +
 * shortest-unique-path resolution is a different enough algorithm to live in its own module —
 * see wikilink.mjs.
 */

import { posix } from 'node:path';

export function basenameOf(roomId) {
  const parts = roomId.split('/');
  return (parts[parts.length - 1] ?? roomId).toLowerCase();
}

/**
 * @param {readonly Room[]} rooms
 * @returns {DocIndex}
 */
export function buildDocIndex(rooms) {
  const byBasename = new Map();
  const byPath = new Map();
  for (const r of rooms) {
    const b = basenameOf(r.id);
    const list = byBasename.get(b) ?? [];
    list.push(r.id);
    byBasename.set(b, list);
    byPath.set(r.id.toLowerCase(), r.id);
  }
  return Object.freeze({ byBasename, byPath });
}

/** The room id a link names when read as a path from the linking room, or null when it leaves the vault. */
function pathTarget(cleaned, sourceRoomId) {
  const fromSource = posix.normalize(posix.join(posix.dirname(sourceRoomId), cleaned));
  return fromSource === '..' || fromSource.startsWith('../') ? null : fromSource;
}

/**
 * Resolve a raw path-shaped link (`"../terms/atari.md"`, `"path.org#heading"`, ...) against an
 * index built by `buildDocIndex`. `extRe` decides which extension this dialect's doc links must
 * end in (`.md` for house, `.org` for org) — a link that doesn't match is reported
 * `not-a-doc-link`, not `unresolved` (it was never a candidate to begin with).
 * @param {string} raw
 * @param {string} sourceRoomId
 * @param {DocIndex} index
 * @param {RegExp} extRe
 */
export function resolveDocLink(raw, sourceRoomId, index, extRe) {
  const cleaned = raw.split('#')[0]?.split('?')[0]?.trim() ?? '';
  if (!extRe.test(cleaned)) return { kind: 'not-a-doc-link' };
  if (/^[a-z]+:\/\//i.test(cleaned)) return { kind: 'external' };

  const finish = (target) => (target === sourceRoomId ? { kind: 'self' } : { kind: 'resolved', roomId: target });

  // First, the path as written, from the linking room; then the same path from the vault root.
  for (const candidate of [pathTarget(cleaned, sourceRoomId), posix.normalize(cleaned)]) {
    if (candidate === null) continue;
    const exact = index.byPath.get(candidate.toLowerCase());
    if (exact !== undefined) return finish(exact);
  }

  // Then the basename, for corpora whose links name a file wherever it lives.
  const segments = cleaned.split('/').filter((s) => s.length > 0 && s !== '.' && s !== '..');
  const base = (segments[segments.length - 1] ?? cleaned).toLowerCase();
  const matches = index.byBasename.get(base) ?? [];
  if (matches.length === 0) return { kind: 'unresolved', raw: cleaned };
  if (matches.length > 1) return { kind: 'ambiguous', raw: cleaned, candidates: [...matches].sort() };
  return finish(matches[0]);
}
