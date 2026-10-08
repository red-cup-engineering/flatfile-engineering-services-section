/**
 * `walk` — shared, dialect-neutral directory discovery for every adapter. Small and composable
 * on purpose: this is the one place path exclusion is decided.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALWAYS_EXCLUDED_NAMES = new Set(['node_modules', '.git']);


function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Minimal glob matching against one path segment: `*` is the only wildcard. */
function matchesGlob(name, glob) {
  const pattern = glob.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${pattern}$`, 'i').test(name);
}

/**
 * Whether a directory or file segment name should be skipped during vault discovery: the
 * `node_modules`/`.git` (always), any hidden
 * (dot-prefixed) directory such as Obsidian's own `.obsidian`/`.trash` (always — a vault tool's
 * own bookkeeping directories are never content), plus whatever `excludeGlobs` the caller adds.
 */
export function isExcludedSegment(name, excludeGlobs = []) {
  if (ALWAYS_EXCLUDED_NAMES.has(name)) return true;
  if (name.startsWith('.') && name !== '.' && name !== '..') return true;
  for (const g of excludeGlobs) {
    if (matchesGlob(name, g)) return true;
  }
  return false;
}

/**
 * Walk `root` for files whose lowercased name ends with one of `extensions`, honoring
 * `isExcludedSegment` at every directory AND file segment encountered (so an excluded glob can
 * also match a file's own name, not only its parent directory).
 * @param {string} root
 * @param {{ excludeGlobs?: readonly string[], extensions: readonly string[] }} opts
 * @returns {string[]} absolute paths
 */
export function walkFiles(root, opts) {
  const excludeGlobs = opts.excludeGlobs ?? [];
  const extensions = opts.extensions;
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (isExcludedSegment(name, excludeGlobs)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (st.isFile() && extensions.some((ext) => name.toLowerCase().endsWith(ext))) {
        out.push(full);
      }
    }
  }
  return out;
}
