/**
 * Frontmatter parsing for every dialect adapter that reads YAML frontmatter (house, obsidian).
 * Delegates to the real YAML codec in `@red-cup-engineering/read-markdown-frontmatter-service`
 * rather than hand-rolling a regex-based subset parser — a prior version of this module vendored
 * one verbatim from lantern-service, which meant a second YAML-subset implementation to keep
 * correct. `yamlProjection: "flat-string-lists"` reproduces the exact contract that hand-rolled
 * parser already approximated (scalars and flat string lists only; a null scalar becomes `""`;
 * nested maps and non-string-list sequences are omitted rather than mis-parsed) — verified against
 * this package's own house-corpus fixtures, including unquoted date scalars (`date-created:
 * 2020-01-02` decodes to the string `"2020-01-02"`, not a Date, under this codec's YAML 1.2 core
 * schema) and both list styles (`teaches: [ko fighting]` and block `- item` sequences).
 * Nested maps (`references`, `relations`) are then carried through whole beside that projection.
 */
import { readMarkdownFrontmatter } from '@red-cup-engineering/read-markdown-frontmatter-service';

/**
 * Parse a markdown file's leading `---`-delimited frontmatter block plus the remaining body.
 * If the file has no frontmatter block, `data` is empty and `body` is the whole input.
 * @param {string} raw
 * @returns {{ data: Record<string, string | string[] | object>, body: string }}
 */
export function parseFrontmatter(raw) {
  const { frontmatter, body } = readMarkdownFrontmatter(raw, {
    frontmatterFormats: ['yaml'],
    absentFrontmatter: 'empty',
    yamlProjection: 'flat-string-lists',
  });
  return { data: { ...frontmatter, ...nestedRecords(raw, frontmatter) }, body };
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * The frontmatter's nested maps the flat projection omits — a carrier's citekey-keyed
 * `references`, a term's `relations` — decoded in full, so what a note cites and asserts
 * reaches the room. A block the full codec cannot decode contributes nothing more.
 */
function nestedRecords(raw, flat) {
  let full;
  try {
    full = readMarkdownFrontmatter(raw, { frontmatterFormats: ['yaml'], absentFrontmatter: 'empty' }).frontmatter;
  } catch {
    return {};
  }
  return Object.fromEntries(Object.entries(full ?? {}).filter(([key, value]) => !(key in flat) && isRecord(value)));
}

/** Coerce a frontmatter value (scalar, list, or absent) into a flat string array.
 * @param {string | string[] | undefined} value
 * @returns {string[]}
 */
export function asList(value) {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((v) => v.length > 0);
  return value.length > 0 ? [value] : [];
}
