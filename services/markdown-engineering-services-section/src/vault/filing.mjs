/**
 * Filing: where a note held in custody (an import or triage tree) lives in its section.
 *
 * A section's living layout is its `content/text` tree: glossary terms, concepts and topics under
 * `glossary/`, people under `documents/articles/biographies/`, works under
 * `documents/articles/bibliographies/`, and every other note under `documents/articles/notes/`
 * on the dated-path law (`YYYY/MM/DD/YYYY-MM-DD-<slug>.md`, or `undated/<slug>.md` when the note
 * states no creation date). A note's own `type` chooses among them; its file name, as a slug,
 * names it. A note filed out of the old Lenticule tree keeps what that tree said by position:
 * the node it was derived from becomes its `derives-from` relation.
 */
import { posix } from 'node:path';

/** Path segments that mark a tree as custody rather than a living home. */
export const CUSTODY_TREES = Object.freeze(['lenticule-import', 'triage']);

const GLOSSARY_TYPES = Object.freeze({ term: 'terms', definition: 'terms', 'glossary-term': 'terms', concept: 'concepts', topic: 'topics', 'glossary-topic': 'topics' });
const ARTICLE_TYPES = Object.freeze({ person: 'biographies', biography: 'biographies', reference: 'bibliographies', bibliography: 'bibliographies' });

function inCustody(path) {
  return path.split('/').some((segment) => CUSTODY_TREES.includes(segment));
}

/** The note's declared kind, read plainly: `[[act]]` and `[act](act.md)` both say act. */
function kindOf(frontmatter) {
  const raw = typeof frontmatter?.type === 'string' ? frontmatter.type : '';
  return raw.replace(/\[\[|\]\]/gu, '').replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1').trim().toLowerCase();
}

/** A note's name as its file carries it, without an export's numeric suffix. */
/** File names that do not name a subject. */
const GENERIC_NAMES = new Set(['index', 'readme', 'questions', 'terms', 'texts', 'skill', 'notes', 'overview', 'untitled', 'draft']);

/** Directory names that organize a tree without naming its subject. */
const STRUCTURAL_SEGMENTS = new Set(['content', 'scripts', 'archive', '_archive', 'texts', 'terms', 'library', 'docs', 'dev', 'lib', 'notes', 'triage', 'lenticule-import', 'references', 'concepts', 'topics', 'domains', 'theories', 'hacking', 'legacy', 'misc', 'import', 'root-import', 'research']);

/** The nearest directory above a note that names a subject: how the tree it came from told same-named notes apart. */
function subjectParentOf(path, depth = 1) {
  const stem = stemOf(path);
  const directories = path.split('/').slice(0, -1);
  const found = [];
  for (let at = directories.length - 1; at >= 0 && found.length < depth; at -= 1) {
    const name = directories[at];
    if (name === stem || STRUCTURAL_SEGMENTS.has(name) || /^\d{4}$|^\d{2}$|-section$/u.test(name)) continue;
    found.unshift(name);
  }
  return found.join('-');
}

function stemOf(path) {
  const name = posix.basename(path).replace(/\.(?:md|markdown)$/iu, '');
  // A date-and-time name keeps its time; only an export counter is dropped.
  return /^\d{4}-\d{2}-\d{2}[-_ ]\d{4}h?$/u.test(name) ? name : name.replace(/[-_]{1,2}\d{3,}$/u, '');
}

/**
 * The node a Lenticule-tree note was derived from: in `…/<parent>/<act>/content/<node>/<node>.md`
 * the parent is two directories above the `content` directory that holds the node, when the
 * parent is itself a node the tree carries.
 */
export function lenticuleParentOf(path, nodeStems) {
  const directories = path.split('/').slice(0, -1);
  const stem = stemOf(path);
  const at = directories.length - 1;
  if (directories[at] !== stem || directories[at - 1] !== 'content') return null;
  const parent = directories[at - 3];
  return parent && parent !== 'content' && nodeStems.has(parent) ? parent : null;
}

/**
 * Plan where each custody note is filed. Returns the moves (source path to destination path)
 * and, per moved note, the frontmatter it gains (`derives-from` when the tree states it).
 *
 * @param {object} options
 * @param {{ path: string, frontmatter: Record<string, unknown> }[]} options.documents
 * @param {(text: string) => string} options.slugify - the house identifier law.
 */
export function planVaultFiling({ documents, slugify, existing = new Set() }) {
  if (!Array.isArray(documents)) throw new TypeError('documents must be an array');
  if (typeof slugify !== 'function') throw new TypeError('slugify is required');
  const nodeStems = new Set(documents.map(({ path }) => stemOf(path)));
  const moves = new Map();
  const gains = new Map();
  for (const { path, frontmatter } of documents) {
    if (!inCustody(path)) continue;
    const contentAt = path.indexOf('/content/text/') >= 0 ? path.indexOf('/content/text/') : path.indexOf('/content/triage/');
    if (contentAt < 0) continue;
    const text = `${path.slice(0, contentAt)}/content/text`;
    const ownSlug = slugify(stemOf(path));
    const parentSlug = slugify(subjectParentOf(path, GENERIC_NAMES.has(ownSlug) ? 2 : 1));
    // A name that says nothing on its own (index, readme, terms) always carries its subject.
    const slug = GENERIC_NAMES.has(ownSlug) && parentSlug ? `${parentSlug}-${ownSlug}` : ownSlug;
    if (!slug) continue;
    const kind = kindOf(frontmatter);
    const created = typeof frontmatter?.['date-created'] === 'string' ? frontmatter['date-created'].match(/^(\d{4})-(\d{2})-(\d{2})/u) : null;
    const destination = GLOSSARY_TYPES[kind] ? `${text}/glossary/${GLOSSARY_TYPES[kind]}/${slug}.md`
      : ARTICLE_TYPES[kind] ? `${text}/documents/articles/${ARTICLE_TYPES[kind]}/${slug}.md`
      : created ? `${text}/documents/articles/notes/${created[1]}/${created[2]}/${created[3]}/${slug.startsWith(`${created[1]}-${created[2]}-${created[3]}`) ? slug : `${created[1]}-${created[2]}-${created[3]}-${slug}`}.md`
      : `${text}/documents/articles/notes/undated/${slug}.md`;
    const at = destination.lastIndexOf(`${slug}.md`);
    moves.set(path, { destination, alternate: parentSlug && parentSlug !== slug ? `${destination.slice(0, at)}${parentSlug}-${slug}.md` : null });
    const parent = lenticuleParentOf(path, nodeStems);
    const gained = {};
    if (parent && frontmatter?.['derives-from'] === undefined) gained['derives-from'] = slugify(parent);
    if (Object.keys(gained).length) gains.set(path, Object.freeze(gained));
  }
  // One note per name: the first claimant by path keeps a free name; the others, and any note
  // whose name a living note already has, take their parent directory's name as a prefix, which
  // is how the tree they came from told them apart. A note still without a free name stays.
  const resolved = new Map();
  const taken = new Set(existing);
  const refused = [];
  for (const [path, { destination }] of [...moves].sort(([left], [right]) => left.localeCompare(right))) {
    if (taken.has(destination)) continue;
    resolved.set(path, destination);
    taken.add(destination);
  }
  for (const [path, { destination, alternate }] of [...moves].sort(([left], [right]) => left.localeCompare(right))) {
    if (resolved.has(path)) continue;
    if (alternate && !taken.has(alternate)) { resolved.set(path, alternate); taken.add(alternate); continue; }
    refused.push(Object.freeze({ path, destination }));
  }
  for (const path of [...gains.keys()]) if (!resolved.has(path)) gains.delete(path);
  return Object.freeze({ type: 'VaultFilingPlan', moves: resolved, gains, refused: Object.freeze(refused) });
}
