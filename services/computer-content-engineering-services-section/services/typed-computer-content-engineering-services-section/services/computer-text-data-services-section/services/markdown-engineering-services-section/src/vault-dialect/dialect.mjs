/**
 * `dialect` — detect which vault convention a directory speaks, per the seam digest's
 * three-signal plan: a `.obsidian` directory anywhere under root (authoritative for
 * `'obsidian'`), a majority of `.org` files over `.md` files (authoritative for `'org'`), or
 * house frontmatter markers / structural default (`'house'`) — always overridable by an explicit
 * caller-supplied dialect id.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isExcludedSegment } from './walk.mjs';
import { parseFrontmatter } from './frontmatter.mjs';

const HOUSE_MARKER_FIELDS = ['type', 'cites', 'date-created'];
const SAMPLE_LIMIT = 20;
const SCAN_FILE_LIMIT = 4000;

function shallowScan(root, excludeGlobs) {
  const files = [];
  let hasObsidianDir = false;
  const stack = [root];
  while (stack.length > 0 && files.length < SCAN_FILE_LIMIT) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === '.obsidian') hasObsidianDir = true;
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
      } else if (st.isFile()) {
        const lower = name.toLowerCase();
        if (lower.endsWith('.md') || lower.endsWith('.org')) files.push(full);
      }
    }
  }
  return { files, hasObsidianDir };
}

function sniffHouseMarkers(mdFiles) {
  const sample = mdFiles.slice(0, SAMPLE_LIMIT);
  let hits = 0;
  for (const f of sample) {
    let raw;
    try {
      raw = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    let data;
    try {
      ({ data } = parseFrontmatter(raw));
    } catch {
      continue; // an undecodable sample file is not evidence for or against any dialect
    }
    if (HOUSE_MARKER_FIELDS.some((k) => k in data)) hits++;
  }
  return { hits, sampled: sample.length };
}

/**
 * @param {string} root
 * @param {{ override?: DialectId, excludeGlobs?: readonly string[] }} [options]
 * @returns {{ dialect: DialectId, reason: string }}
 */
export function detectDialect(root, options = {}) {
  if (options.override) {
    return { dialect: options.override, reason: 'explicit override' };
  }

  const excludeGlobs = options.excludeGlobs ?? [];
  const { files, hasObsidianDir } = shallowScan(root, excludeGlobs);

  if (hasObsidianDir) {
    return { dialect: 'obsidian', reason: '.obsidian directory found under root' };
  }

  const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));
  const orgFiles = files.filter((f) => f.toLowerCase().endsWith('.org'));

  if (orgFiles.length > 0 && orgFiles.length >= mdFiles.length) {
    return {
      dialect: 'org',
      reason: `${orgFiles.length} .org file(s) >= ${mdFiles.length} .md file(s)`,
    };
  }

  const { hits, sampled } = sniffHouseMarkers(mdFiles);
  if (hits > 0) {
    return {
      dialect: 'house',
      reason: `${hits}/${sampled} sampled markdown file(s) carry a house frontmatter marker field (${HOUSE_MARKER_FIELDS.join('/')})`,
    };
  }

  return {
    dialect: 'house',
    reason: 'default: plain markdown corpus, no .obsidian directory, no .org majority, no house marker fields sampled — house adapter also reads plain markdown with optional frontmatter conventions',
  };
}
