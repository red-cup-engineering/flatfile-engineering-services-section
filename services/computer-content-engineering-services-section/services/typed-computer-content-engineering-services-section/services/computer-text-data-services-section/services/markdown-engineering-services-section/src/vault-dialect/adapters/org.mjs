/**
 * `adapters/org` — HONEST V1 SCOPE, disclosed rather than pretended-complete. org-mode is a much
 * richer format than this adapter parses. What v1 actually reads:
 *
 *  - `#+TITLE:` (else the filename) -> `Room.title`.
 *  - `#+FILETAGS:` (`:tag1:tag2:`) -> the `tags` attribute field, same shape FCA already expects.
 *  - `#+DATE:` (angle/bracket-stripped) -> `Room.dateCreated`, best-effort.
 *  - Every other `#+DIRECTIVE:` line is recognized-and-skipped (never mis-parsed into the body),
 *    but not otherwise interpreted — `#+PROPERTY`, `#+STARTUP`, `#+ROAM_ALIASES`, etc. are NOT
 *    read by v1.
 *  - `[[file:path.org][Description]]` / `[[path.org]]` links -> soft-door candidates, resolved
 *    by basename exactly like house's `.md` links (org's own file-link convention). `[[id:...]]`
 *    org-roam ID links are explicitly OUT OF SCOPE and silently ignored as not-a-doc-link — v1
 *    has no vault-wide ID index to resolve them against.
 *  - No hard-door convention at all (no org-mode equivalent of a frontmatter path-field is
 *    parsed) — doors come entirely from links, same "links only" degradation Obsidian gets, and
 *    for the same underlying reason: this format's structured-property surface is real but
 *    unparsed in v1, not absent.
 *  - No PROPERTY drawers, no TODO states, no priorities, no scheduling/deadline timestamps, no
 *    nested outline structure (headlines are left as literal `*` text in the body) are read.
 *
 * A vault that needs more than this should wait for a v2 org adapter, or pre-convert to the
 * house/Obsidian dialect — this module will not silently mis-parse what it doesn't understand;
 * anything past the header block is passed through as opaque body text untouched.
 */
import { readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { walkFiles } from '../walk.mjs';
import { buildDocIndex, resolveDocLink, basenameOf } from '../docindex.mjs';

function toRoomId(root, absPath) {
  const normalizedRoot = root.endsWith(sep) ? root : root + sep;
  const rel = absPath.startsWith(normalizedRoot) ? absPath.slice(normalizedRoot.length) : absPath;
  return rel.split(sep).filter((p) => p.length > 0).join('/');
}

const TITLE_RE = /^#\+TITLE:\s*(.*)$/i;
const FILETAGS_RE = /^#\+FILETAGS:\s*(.*)$/i;
const DATE_RE = /^#\+DATE:\s*(.*)$/i;
const DIRECTIVE_RE = /^#\+[A-Za-z_-]+:/;

function parseOrgHeader(raw) {
  const lines = raw.split('\n');
  let title;
  let tags = [];
  let date;
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const tm = TITLE_RE.exec(line);
    if (tm) {
      title = (tm[1] ?? '').trim();
      continue;
    }
    const fm = FILETAGS_RE.exec(line);
    if (fm) {
      tags = (fm[1] ?? '').split(':').map((t) => t.trim()).filter((t) => t.length > 0);
      continue;
    }
    const dm = DATE_RE.exec(line);
    if (dm) {
      date = (dm[1] ?? '').trim().replace(/[<>[\]]/g, '');
      continue;
    }
    if (DIRECTIVE_RE.test(line)) continue; // recognized-and-skipped, not interpreted (v1 scope)
    if (line.trim() === '') continue;
    break; // first non-header, non-blank line starts the body
  }
  const body = lines.slice(i).join('\n');
  return { title, tags, date, body };
}

export function discoverFiles(root, excludeGlobs) {
  return walkFiles(root, { excludeGlobs, extensions: ['.org'] });
}

const ORG_LINK_RE = /\[\[([^\]]+)\](?:\[([^\]]*)\])?\]/g;

/** `[[file:path.org][Description]]` / `[[path.org]]` -> soft-door candidates. `[[id:...]]`
 * (org-roam ID links) are silently skipped — out of v1 scope, no ID index exists to resolve
 * them against. */
function extractOrgLinks(body) {
  const lines = body.split('\n');
  const seen = new Map();
  for (const line of lines) {
    ORG_LINK_RE.lastIndex = 0;
    let m;
    while ((m = ORG_LINK_RE.exec(line))) {
      let url = (m[1] ?? '').replace(/^file:/i, '').trim();
      if (/^id:/i.test(m[1] ?? '')) continue; // org-roam ID link — out of v1 scope
      const key = url.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, { url, reason: line.trim() });
    }
  }
  return [...seen.values()];
}

export function parseRoom(root, absPath, wingId, config) {
  const raw = readFileSync(absPath, 'utf8');
  const { title: parsedTitle, tags, date, body } = parseOrgHeader(raw);
  const roomId = toRoomId(root, absPath);

  const title = parsedTitle && parsedTitle.length > 0 ? parsedTitle : basenameOf(roomId).replace(/\.org$/i, '');
  const dateCreated = config.dateField ? undefined : date; // config.dateField override not honored in v1 (no generic field map — org has no frontmatter block)

  const room = {
    id: roomId,
    wingId,
    title,
    aliases: [],
    kind: 'note',
    description: undefined,
    body,
    frontmatter: { tags },
    dateCreated: date,
  };

  // No hard-door convention parsed in v1 — every door comes from links (degrades via the same
  // generic zero-hard-doors-in promotion rule compile.mjs already applies).
  const hardCandidates = [];
  const softCandidates = extractOrgLinks(body);

  return { room, hardCandidates, softCandidates };
}

export function buildIndex(rooms) {
  return buildDocIndex(rooms);
}

const ORG_EXT_RE = /\.org(#.*)?$/i;

export function resolveLink(raw, sourceRoomId, index) {
  return resolveDocLink(raw, sourceRoomId, index, ORG_EXT_RE);
}
