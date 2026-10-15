/**
 * House Markdown projects frontmatter path fields into hard-door candidates
 * and parsed body links into soft-door candidates. Configured field names
 * control room metadata and archival admission.
 */
import { readFileSync } from 'node:fs';
import { readMarkdownFeatures } from '@red-cup-engineering/read-markdown-features-service';
import { sep } from 'node:path';
import { walkFiles } from '../walk.mjs';
import { parseFrontmatter, asList } from '../frontmatter.mjs';
import { buildDocIndex, resolveDocLink, basenameOf } from '../docindex.mjs';

function toRoomId(root, absPath) {
  const normalizedRoot = root.endsWith(sep) ? root : root + sep;
  const rel = absPath.startsWith(normalizedRoot) ? absPath.slice(normalizedRoot.length) : absPath;
  return rel.split(sep).filter((p) => p.length > 0).join('/');
}

function looksLikeMdPath(value) {
  return /\.md(#.*)?$/i.test(value.trim());
}

export function discoverFiles(root, excludeGlobs) {
  return walkFiles(root, { excludeGlobs, extensions: ['.md'] });
}

/** Project parsed links into door candidates. A standalone bullet's rationale
 * takes precedence over an earlier prose mention of the same target. */
function extractBodyLinkCandidates(body) {
  const text = body.replace(/\r\n?/gu, '\n');
  const links = readMarkdownFeatures(text).filter((feature) => feature.type === 'markdown-link');
  const seen = new Map();
  const candidates = links.map((link) => {
    const start = text.lastIndexOf('\n', link.span.start - 1) + 1;
    const next = text.indexOf('\n', link.span.end);
    const end = next < 0 ? text.length : next;
    const prefix = text.slice(start, link.span.start);
    const suffix = text.slice(link.span.end, end);
    const bullet = /^\s*[-*]\s+$/u.test(prefix) && /^\s*(?:[-–—]\s*.+)?$/u.test(suffix);
    const rationale = bullet ? suffix.replace(/^\s*[-–—]\s*/u, '').trim() : '';
    return { url: link.target, reason: rationale || text.slice(start, end).trim(), bullet };
  });
  for (const { url, reason } of [...candidates.filter((candidate) => candidate.bullet), ...candidates]) {
    const key = url.toLowerCase();
    if (!seen.has(key)) seen.set(key, { url, reason });
  }
  return [...seen.values()];
}

/** Files carrying a non-empty `provenance:` (or configured `archivalField`) frontmatter value
 * are skipped — not compiled into a room — per this convention's documented archival policy. A
 * generic *shape* rule (field presence, not a hard-coded directory name). */
function isArchival(data, archivalField) {
  return asList(data[archivalField]).some((value) => value.trim().length > 0);
}

export function parseRoom(root, absPath, wingId, config) {
  const raw = readFileSync(absPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);

  const archivalField = config.archivalField ?? 'provenance';
  if (isArchival(data, archivalField)) return null;

  const roomId = toRoomId(root, absPath);

  const titleField = config.titleField ?? 'title';
  const titleRaw = data[titleField];
  const title = typeof titleRaw === 'string' && titleRaw.length > 0 ? titleRaw : basenameOf(roomId).replace(/\.md$/i, '');

  const aliasFields = config.aliasFields ?? ['aliases', 'defines', 'teaches'];
  const aliases = [...new Set(aliasFields.flatMap((f) => asList(data[f])))];

  const kindField = config.kindField ?? 'type';
  const kind = typeof data[kindField] === 'string' && data[kindField].length > 0 ? data[kindField] : 'unknown';

  const descriptionField = config.descriptionField ?? 'description';
  const description = typeof data[descriptionField] === 'string' && data[descriptionField].length > 0 ? data[descriptionField] : undefined;

  const dateField = config.dateField ?? 'date-created';
  const dateCreated = typeof data[dateField] === 'string' ? data[dateField] : undefined;

  const room = { id: roomId, wingId, title, aliases, kind, description, body, frontmatter: data, dateCreated };

  const excludeFields = config.excludeFields ?? ['cites', 'references', 'defines', 'aliases', 'teaches'];
  const hardCandidates = [];
  for (const [key, value] of Object.entries(data)) {
    if (excludeFields.includes(key)) continue;
    for (const v of asList(value)) {
      if (looksLikeMdPath(v)) hardCandidates.push({ field: key, value: v });
    }
  }

  const softCandidates = extractBodyLinkCandidates(body);

  return { room, hardCandidates, softCandidates };
}

export function buildIndex(rooms) {
  return buildDocIndex(rooms);
}

const MD_EXT_RE = /\.md(#.*)?$/i;

export function resolveLink(raw, sourceRoomId, index) {
  return resolveDocLink(raw, sourceRoomId, index, MD_EXT_RE);
}
