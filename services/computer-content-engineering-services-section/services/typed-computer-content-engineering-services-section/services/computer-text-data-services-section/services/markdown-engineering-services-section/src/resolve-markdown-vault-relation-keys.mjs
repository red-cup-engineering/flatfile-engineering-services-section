import { readFileSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { confineExistingPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";

/** @deprecated Relation authority now comes only from scoped glossary-term filenames. */
export const DEFAULT_MARKDOWN_VAULT_RELATION_KEYS = Object.freeze({});

const GLOSSARY_MARKERS = Object.freeze(["/content/text/glossary/terms/", "/content/glossary/terms/"]);
const RELATION_KEY = /^[a-z][a-z0-9_/-]{0,80}$/u;

function normalizedPath(path) {
  if (typeof path !== "string") return "";
  return path.replaceAll("\\\\", "/").replace(/^\.\//u, "").replace(/^\/+|\/+$/gu, "");
}

function basenameRelation(path) {
  const normalized = normalizedPath(path);
  const basename = normalized.slice(normalized.lastIndexOf("/") + 1).replace(/\.md$/iu, "");
  if (!RELATION_KEY.test(basename)) return null;
  return basename;
}

/** The service scope which owns an admitted glossary-term carrier. */
export function markdownVaultGlossaryScopeOf(path) {
  const normalized = `/${normalizedPath(path)}`;
  for (const marker of GLOSSARY_MARKERS) {
    const index = normalized.indexOf(marker);
    if (index !== -1 && /\.md$/iu.test(normalized)) return normalized.slice(1, index);
  }
  return null;
}

function isInScope(path, scope) {
  const normalized = normalizedPath(path);
  return scope === "" || normalized === scope || normalized.startsWith(`${scope}/`);
}

function keywordValues(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.flatMap((entry) => typeof entry === "string" ? entry.split(",") : [])
    .map((entry) => entry.trim())
    .filter((entry) => RELATION_KEY.test(entry)))];
}

function nearestKeywordEntry(path, keyword, entries) {
  return entries
    .filter((entry) => entry.relation === keyword && isInScope(path, entry.scope))
    .sort((left, right) => right.scope.length - left.scope.length || left.path.localeCompare(right.path))[0] ?? null;
}

/**
 * Read the relation-key glossary carried by a vault's supplied Markdown paths.
 *
 * A term's filename basename is its identity. Frontmatter is still parsed through
 * read-markdown-frontmatter-service, and therefore the shared YAML codec, so malformed carriers
 * are reported rather than admitted through a second parser.
 */
export async function readMarkdownVaultRelationGlossary({ root, paths, batch = 64 } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  if (!Array.isArray(paths)) throw new TypeError("paths must be an array");
  if (!Number.isInteger(batch) || batch < 1) throw new TypeError("batch must be a positive integer");
  const carriers = paths
    .map((path) => Object.freeze({ path, scope: markdownVaultGlossaryScopeOf(path), relation: basenameRelation(path) }))
    .filter(({ scope, relation }) => scope !== null && relation !== null);
  const entries = [];
  const defects = [];
  for (let index = 0; index < carriers.length; index += batch) {
    const readings = await Promise.all(carriers.slice(index, index + batch).map(async ({ path, scope, relation }) => {
      try {
        const address = await confineExistingPath({ root, path });
        const markdown = await readFile(address.path, "utf8");
        readMarkdownFrontmatter(markdown);
        return Object.freeze({ path, scope, relation });
      } catch (error) {
        return Object.freeze({ path, defect: Object.freeze({ path, reason: error.message }) });
      }
    }));
    for (const reading of readings) {
      if (reading.defect) defects.push(reading.defect);
      else entries.push(reading);
    }
  }
  return Object.freeze({ entries: Object.freeze(entries), defects: Object.freeze(defects) });
}

/** Resolve filename-defined relations in the carrier's service scope and its ancestors. */
export function resolveMarkdownVaultRelationKeysForPath({ path, entries = [] } = {}) {
  if (typeof path !== "string" || path === "") throw new TypeError("path is required");
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const resolved = {};
  const applicable = entries
    .filter(({ scope }) => isInScope(path, scope))
    .sort((left, right) => left.scope.length - right.scope.length || left.path.localeCompare(right.path));
  for (const { relation, polarity } of applicable) {
    resolved[relation] = polarity ?? "positive";
  }
  return Object.freeze(resolved);
}

/** Locate current and ancestor glossary-term directories without applying domain policy. */
export function markdownVaultGlossaryTermDirectoriesFrom(startDirectory) {
  if (typeof startDirectory !== "string" || startDirectory === "") throw new TypeError("startDirectory is required");
  const found = [];
  let cursor = resolve(startDirectory);
  for (;;) {
    const candidates = basename(cursor) === "terms"
      ? [cursor]
      : [join(cursor, "content", "text", "glossary", "terms"), join(cursor, "content", "glossary", "terms")];
    for (const candidate of candidates) {
      try { if (statSync(candidate).isDirectory() && !found.includes(candidate)) found.push(candidate); } catch {}
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return Object.freeze(found);
}

/** Read current and ancestor glossary carriers for a domain facade. */
export function readMarkdownVaultGlossaryScopeReadings(startDirectory) {
  return Object.freeze(markdownVaultGlossaryTermDirectoriesFrom(startDirectory).map((directory) => Object.freeze({
    directory,
    documents: Object.freeze(readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".md")
      .sort((left, right) => left.name.localeCompare(right.name, "en"))
      .map((entry) => Object.freeze({ filename: entry.name, text: readFileSync(join(directory, entry.name), "utf8") }))),
  })));
}

function keywordIndexFromReadings({ paths, entries, readings, defects = [] }) {
  const keywordsByPath = Object.fromEntries(paths.map((path) => [path, []]));
  const carriersByKeywordPath = Object.fromEntries(entries.map(({ path }) => [path, []]));
  const allDefects = [...defects];
  for (const reading of readings) {
    if (reading.defect) {
      allDefects.push(reading.defect);
      continue;
    }
    for (const keyword of keywordValues(reading.frontmatter?.keywords)) {
      const target = nearestKeywordEntry(reading.path, keyword, entries);
      if (!target) {
        allDefects.push(Object.freeze({ path: reading.path, keyword, reason: "keyword has no glossary term in the carrier's current or ancestor scope" }));
        continue;
      }
      keywordsByPath[reading.path].push(Object.freeze({ keyword, path: target.path }));
      carriersByKeywordPath[target.path].push(reading.path);
    }
  }
  return Object.freeze({
    entries: Object.freeze(entries),
    keywordsByPath: Object.freeze(Object.fromEntries(Object.entries(keywordsByPath).map(([path, targets]) => [path, Object.freeze(targets)]))),
    carriersByKeywordPath: Object.freeze(Object.fromEntries(Object.entries(carriersByKeywordPath).map(([path, carriers]) => [path, Object.freeze(carriers)]))),
    defects: Object.freeze(allDefects),
  });
}

/** Resolve a supplied in-memory carrier set; domain packages may decorate this generic result. */
export function resolveMarkdownVaultKeywordIndexFromReadings({ readings } = {}) {
  if (!Array.isArray(readings)) throw new TypeError("readings must be an array");
  const paths = readings.map(({ path }) => path);
  const entries = paths.map((path) => Object.freeze({ path, scope: markdownVaultGlossaryScopeOf(path), relation: basenameRelation(path) }))
    .filter(({ scope, relation }) => scope !== null && relation !== null);
  return keywordIndexFromReadings({ paths, entries, readings });
}

/** Discover and resolve all relation keys for the supplied vault paths. */
export async function resolveMarkdownVaultRelationKeys({ root, paths, batch = 64 } = {}) {
  if (!Array.isArray(paths)) throw new TypeError("paths must be an array");
  const glossary = await readMarkdownVaultRelationGlossary({ root, paths, batch });
  const relationsByPath = Object.fromEntries(paths.map((path) => [
    path,
    resolveMarkdownVaultRelationKeysForPath({ path, entries: glossary.entries }),
  ]));
  return Object.freeze({
    entries: glossary.entries,
    defects: glossary.defects,
    relationsByPath: Object.freeze(relationsByPath),
  });
}

/**
 * Resolve carrier keywords to visible glossary terms and derive reverse index edges.
 *
 * Only the compound carrier materializes `keywords`. Primitive term carriers remain ignorant of
 * their users; `carriersByKeywordPath` is derived from the forward declarations.
 */
export async function resolveMarkdownVaultKeywordIndex({ root, paths, batch = 64 } = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  if (!Array.isArray(paths)) throw new TypeError("paths must be an array");
  if (!Number.isInteger(batch) || batch < 1) throw new TypeError("batch must be a positive integer");
  const glossary = await readMarkdownVaultRelationGlossary({ root, paths, batch });
  const readings = [];
  for (let index = 0; index < paths.length; index += batch) {
    const batchReadings = await Promise.all(paths.slice(index, index + batch).map(async (path) => {
      try {
        const address = await confineExistingPath({ root, path });
        const markdown = await readFile(address.path, "utf8");
        const reading = readMarkdownFrontmatter(markdown);
        return Object.freeze({ path, frontmatter: reading.frontmatter });
      } catch (error) {
        return Object.freeze({ path, defect: Object.freeze({ path, reason: error.message }) });
      }
    }));
    readings.push(...batchReadings);
  }
  return keywordIndexFromReadings({ paths, entries: glossary.entries, readings, defects: glossary.defects });
}
