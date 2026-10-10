const TITLE_KEYS = new Set(["title", "name"]);
const RANK = Object.freeze({ "frontmatter-title": 0, "frontmatter-field": 1, heading: 2 });
const SCORE = Object.freeze({ "frontmatter-title": 1, "frontmatter-field": 0.7, heading: 0.5 });

function folded(value, caseSensitive) { return caseSensitive ? value : value.toLowerCase(); }
function stringValues(value) {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  return [];
}

/**
 * Match one token against a serialized Markdown document index.
 *
 * The input index contains `{path, frontmatter, headings}` entries. Output
 * matches are immutable `{path, matchKind, matchedText, score}` records,
 * ranked title fields before other frontmatter before headings.
 */
export function matchMarkdownToken({ token, index, options = {} } = {}) {
  if (typeof token !== "string" || token.trim() === "") throw new TypeError("token is required");
  if (!Array.isArray(index)) throw new TypeError("index must be an array");
  const caseSensitive = options.caseSensitive === true;
  const needle = folded(token, caseSensitive);
  const matches = [];
  for (const entry of index) {
    if (typeof entry?.path !== "string") continue;
    const frontmatter = entry.frontmatter ?? {};
    const keys = Object.keys(frontmatter);
    const ordered = [...keys.filter((key) => TITLE_KEYS.has(key.toLowerCase())), ...keys.filter((key) => !TITLE_KEYS.has(key.toLowerCase()))];
    for (const key of ordered) for (const value of stringValues(frontmatter[key])) {
      if (!folded(value, caseSensitive).includes(needle)) continue;
      const matchKind = TITLE_KEYS.has(key.toLowerCase()) ? "frontmatter-title" : "frontmatter-field";
      matches.push({ path: entry.path, matchKind, matchedText: value, rank: RANK[matchKind], score: SCORE[matchKind] });
    }
    for (const heading of entry.headings ?? []) {
      if (typeof heading?.title !== "string" || !folded(heading.title, caseSensitive).includes(needle)) continue;
      matches.push({ path: entry.path, matchKind: "heading", matchedText: heading.title, rank: RANK.heading, score: SCORE.heading });
    }
  }
  matches.sort((left, right) => left.rank - right.rank || left.path.localeCompare(right.path));
  return Object.freeze(matches.map(({ path, matchKind, matchedText, score }) => Object.freeze({ path, matchKind, matchedText, score })));
}
