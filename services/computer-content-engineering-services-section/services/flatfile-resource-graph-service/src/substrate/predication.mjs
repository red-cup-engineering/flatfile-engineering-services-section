export function makePredication({ src, dst, kind, source, line = null }) {
  return Object.freeze({ src, dst, kind, source, line });
}

// Strips "#anchor", "?query", the ".md" suffix, and any directory prefix,
// leaving a bare slug. Used for both markdown link targets and frontmatter
// relation values (some notes write the latter as path-y references like
// "../foo/bar.md" rather than bare slugs).
//
// Pass requireMd: true when the caller only cares about ".md" targets (body
// markdown links); returns null for non-.md targets in that mode.
export function slugOf(target, { requireMd = false } = {}) {
  const s = target.split("#")[0].split("?")[0].trim();
  if (!s) return null;
  const hasMd = s.endsWith(".md");
  const isDirLink = !hasMd && s.endsWith("/");
  // requireMd callers want only .md body links — but a bare directory link
  // like "skills/" is also a body link to a note (its section index), so
  // admit it here.
  if (requireMd && !(hasMd || isDirLink)) return null;
  const parts = s.split("/").filter((p) => p && p !== "." && p !== "..");
  if (parts.length === 0) return null;
  // Directory link -> that section's index, same slug as "<dir>/_index.md".
  if (isDirLink) return `${parts.at(-1)}-index`;
  // Bare slug (no slash, no ".md") is a frontmatter-style reference and
  // passes through unchanged.
  if (!hasMd) return parts.at(-1) || null;
  const last = parts.at(-1);
  const stem = last.endsWith(".md") ? last.slice(0, -3) : last;
  // Sentinel filenames whose stem is the same in every directory get a
  // "<parent>-<sentinel>" slug, mirroring substrate/store.mjs's note loader.
  if (stem === "_index") return parts.length >= 2 ? `${parts.at(-2)}-index` : null;
  if (stem === "SKILL") return parts.length >= 2 ? `${parts.at(-2)}-skill` : null;
  // "README.md" is never loaded as a note, so links to it are intentionally
  // out-of-corpus and not broken-link material.
  if (stem === "README") return null;
  return stem || null;
}


