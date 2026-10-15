/**
 * `adapters/obsidian-md` — a foreign vault convention this compiler was NEVER given design
 * authority over, so it degrades honestly rather than pretending Obsidian notes carry house
 * fields they don't:
 *
 *  - **Doors**: most Obsidian vaults declare no frontmatter path-field convention at all, so
 *    hard-door candidates are usually empty and every door comes from `[[wikilink]]`s in the
 *    body (soft), then the SAME zero-hard-doors-in promotion rule `compile.mjs` already applies
 *    for house promotes them to hard — "doors from links only" is not a special case, it falls
 *    out of the existing generic rule for free. A frontmatter field whose value is ITSELF
 *    wikilink-shaped (`parent: "[[Note]]"`, an idiom some Obsidian vaults do use, e.g. via the
 *    Breadcrumbs/Dataview community plugins) is still honored as a hard-door candidate.
 *  - **Halls**: FCA attributes come from `tags` — merging frontmatter `tags:` with inline
 *    `#hashtag`s (Obsidian treats both as the same tag namespace), since Obsidian vaults have no
 *    house `cites`/`type` convention to draw on.
 *  - **Kind**: defaults to `'note'` (not house's `'unknown'`) when no `type`/configured
 *    `kindField` is present — an honest Obsidian-shaped default, not a borrowed house term.
 *  - **`dateCreated`**: absent unless a `date-created`/configured field is present in
 *    frontmatter (most Obsidian notes have no such field) — `kata.mjs`'s own doc comment
 *    already covers what happens then: auto-kata DFS start ordering falls back to room-id order.
 *  - **Aliases**: Obsidian's own `aliases:` frontmatter convention feeds both `Room.aliases`
 *    AND wikilink resolution (a wikilink can name a note by alias, not just by title).
 */
import { readFileSync } from 'node:fs';
import { readMarkdownFeatures } from '@red-cup-engineering/read-markdown-features-service';
import { sep } from 'node:path';
import { walkFiles } from '../walk.mjs';
import { parseFrontmatter, asList } from '../frontmatter.mjs';
import { buildWikilinkIndex, resolveWikilink } from '../wikilink.mjs';

function toRoomId(root, absPath) {
  const normalizedRoot = root.endsWith(sep) ? root : root + sep;
  const rel = absPath.startsWith(normalizedRoot) ? absPath.slice(normalizedRoot.length) : absPath;
  return rel.split(sep).filter((p) => p.length > 0).join('/');
}

function basenameOf(roomId) {
  const parts = roomId.split('/');
  return (parts[parts.length - 1] ?? roomId).toLowerCase();
}

export function discoverFiles(root, excludeGlobs) {
  // walkFiles already excludes every hidden directory (so .obsidian/.trash never enter the
  // vault as content) plus node_modules/.git — see walk.mjs.
  return walkFiles(root, { excludeGlobs, extensions: ['.md'] });
}

function wikilinkShaped(value) {
  return /^\[\[.+\]\]$/.test(value.trim());
}

function stripWikilinkBrackets(value) {
  return value.trim().replace(/^\[\[/, '').replace(/\]\]$/, '');
}

export function parseRoom(root, absPath, wingId, config) {
  const raw = readFileSync(absPath, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const text = body.replace(/\r\n?/gu, '\n');
  const features = readMarkdownFeatures(text);
  const roomId = toRoomId(root, absPath);

  const titleField = config.titleField ?? 'title';
  const titleRaw = data[titleField];
  const title = typeof titleRaw === 'string' && titleRaw.length > 0 ? titleRaw : basenameOf(roomId).replace(/\.md$/i, '');

  const aliasFields = config.aliasFields ?? ['aliases'];
  const aliases = [...new Set(aliasFields.flatMap((f) => asList(data[f])))];

  const kindField = config.kindField ?? 'type';
  const kind = typeof data[kindField] === 'string' && data[kindField].length > 0 ? data[kindField] : 'note';

  const descriptionField = config.descriptionField ?? 'description';
  const description = typeof data[descriptionField] === 'string' && data[descriptionField].length > 0 ? data[descriptionField] : undefined;

  const dateField = config.dateField ?? 'date-created';
  const dateCreated = typeof data[dateField] === 'string' ? data[dateField] : undefined;

  // Obsidian itself recognizes `tags`; many established vaults use the equally flat
  // `keywords` convention. Both are frontmatter tags at this adapter boundary.
  const fmTags = [...asList(data['tags']), ...asList(data['keywords'])];
  const inlineTags = features.filter((feature) => feature.type === 'hashtag').map((feature) => feature.tag);
  const frontmatter = { ...data, tags: [...new Set([...fmTags, ...inlineTags])] };

  const room = { id: roomId, wingId, title, aliases, kind, description, body, frontmatter, dateCreated };

  const excludeFields = config.excludeFields ?? ['aliases', 'tags'];
  const hardCandidates = [];
  for (const [key, value] of Object.entries(data)) {
    if (excludeFields.includes(key)) continue;
    for (const v of asList(value)) {
      if (wikilinkShaped(v)) hardCandidates.push({ field: key, value: stripWikilinkBrackets(v) });
    }
  }

  const links = new Map();
  for (const feature of features) {
    if (feature.type !== 'wikilink' && feature.type !== 'transclusion') continue;
    const key = feature.target.split('#')[0].trim().toLowerCase();
    if (links.has(key)) continue;
    const start = text.lastIndexOf('\n', feature.span.start - 1) + 1;
    const next = text.indexOf('\n', feature.span.end);
    const end = next < 0 ? text.length : next;
    links.set(key, { url: feature.targetRaw, reason: text.slice(start, end).trim() });
  }
  const softCandidates = [...links.values()];

  return { room, hardCandidates, softCandidates };
}

export function buildIndex(rooms) {
  return buildWikilinkIndex(rooms);
}

export function resolveLink(raw, sourceRoomId, index) {
  return resolveWikilink(raw, sourceRoomId, index);
}
