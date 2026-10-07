import { posix } from "node:path";
import { createGraph } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";

const MARKDOWN_EXTENSION = /\.(?:md|markdown)$/iu;
const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;
export const DEFAULT_FRONTMATTER_REFERENCE_KEYS = Object.freeze(["related", "references", "dependsOn", "parent"]);

function normalizedPath(path) {
  const normalized = posix.normalize(path.replaceAll("\\", "/")).replace(/^\.\//u, "").replace(/^\/+|\/+$/gu, "");
  return normalized === "." ? "" : normalized;
}

function withoutExtension(path) {
  return path.replace(MARKDOWN_EXTENSION, "");
}

function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  return [];
}

function aliasesOf(document) {
  const path = normalizedPath(document.path);
  const aliases = new Set([path, withoutExtension(path), posix.basename(withoutExtension(path))]);
  for (const alias of strings(document.frontmatter?.aliases ?? document.frontmatter?.alias)) {
    if (alias.trim()) aliases.add(normalizedPath(alias.trim()));
  }
  return Object.freeze([...aliases].sort((left, right) => left.localeCompare(right)));
}

function addIndex(index, key, path) {
  const normalized = normalizedPath(key).toLowerCase();
  if (!normalized) return;
  const paths = index.get(normalized) ?? new Set();
  paths.add(path);
  index.set(normalized, paths);
}

function targetParts(raw) {
  const trimmed = raw.trim().replace(/^<|>$/gu, "");
  if (EXTERNAL_TARGET.test(trimmed)) return { external: trimmed };
  const hash = trimmed.indexOf("#");
  const path = hash < 0 ? trimmed : trimmed.slice(0, hash);
  return { path, fragment: hash < 0 ? null : trimmed.slice(hash + 1) || null };
}

function resolveTarget({ source, raw, index }) {
  const parts = targetParts(raw);
  if (parts.external) return { status: "external", externalUrl: parts.external, fragment: null, candidates: Object.freeze([]) };
  let target = parts.path;
  try { target = decodeURIComponent(target); } catch { /* Retain the literal malformed target. */ }
  const sourceDirectory = posix.dirname(source);
  const relativeTarget = target === "" ? source : normalizedPath(posix.join(sourceDirectory, target));
  // Nearest reading first: the path relative to the source, then the path from the root, then
  // the bare name. A link whose relative path names one document is that document even when the
  // name is also carried elsewhere; only a target no path reaches is read as a name.
  const tiers = [[relativeTarget, withoutExtension(relativeTarget)], [target, withoutExtension(target)], [posix.basename(withoutExtension(target))]];
  const candidates = new Set();
  for (const keys of tiers) {
    for (const key of keys) {
      const indexed = index.get(normalizedPath(key).toLowerCase());
      if (indexed) for (const path of indexed) candidates.add(path);
    }
    if (candidates.size > 0) break;
  }
  const sorted = [...candidates].sort((left, right) => left.localeCompare(right));
  const frozenCandidates = Object.freeze(sorted);
  if (sorted.length === 1) return { status: "resolved", targetPath: sorted[0], fragment: parts.fragment, candidates: frozenCandidates };
  if (sorted.length > 1) return { status: "ambiguous", targetPath: null, fragment: parts.fragment, candidates: frozenCandidates };
  return { status: "dangling", targetPath: null, fragment: parts.fragment, candidates: frozenCandidates };
}

function featureEdges(document) {
  const edges = [];
  for (const feature of document.features ?? []) {
    if (!["wikilink", "transclusion", "markdown-link"].includes(feature.type)) continue;
    edges.push({
      kind: feature.type === "markdown-link" && feature.image ? "markdown-image" : feature.type,
      target: feature.target,
      span: feature.span ?? null,
    });
  }
  return edges;
}

function frontmatterEdges(document, keys) {
  const edges = [];
  for (const key of keys) {
    for (const value of strings(document.frontmatter?.[key])) {
      const match = value.trim().match(/^\[\[([\s\S]+)\]\]$/u);
      if (value.trim()) edges.push({ kind: "frontmatter-reference", target: match?.[1] ?? value.trim(), key, span: null });
    }
  }
  return edges;
}

/** Derive vault semantics from already-indexed Markdown documents; performs no I/O. */
export function deriveMarkdownVaultGraph({ documents, frontmatterReferenceKeys = DEFAULT_FRONTMATTER_REFERENCE_KEYS } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  if (!Array.isArray(frontmatterReferenceKeys)) throw new TypeError("frontmatterReferenceKeys must be an array");
  const sourceDocuments = documents
    .filter((document) => typeof document?.path === "string" && document.path.length > 0)
    .map((document) => ({ ...document, path: normalizedPath(document.path) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const index = new Map();
  const nodes = sourceDocuments.map((document) => {
    const aliases = aliasesOf(document);
    for (const alias of aliases) addIndex(index, alias, document.path);
    return Object.freeze({ path: document.path, aliases, frontmatter: Object.freeze({ ...(document.frontmatter ?? {}) }) });
  });
  const edges = [];
  for (const document of sourceDocuments) {
    for (const edge of [...featureEdges(document), ...frontmatterEdges(document, frontmatterReferenceKeys)]) {
      const resolution = resolveTarget({ source: document.path, raw: edge.target, index });
      edges.push(Object.freeze({ sourcePath: document.path, kind: edge.kind, target: edge.target, key: edge.key ?? null, span: edge.span, ...resolution }));
    }
  }
  edges.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath) || left.kind.localeCompare(right.kind) || left.target.localeCompare(right.target));
  const navigation = createGraph({
    nodes: nodes.map((node) => ({ id: node.path, data: node })),
    edges: edges
      .filter((edge) => edge.status === "resolved")
      .map((edge) => ({
        from: edge.sourcePath,
        to: edge.targetPath,
        kind: edge.kind,
        data: edge,
      })),
  });
  const backlinks = {};
  for (const node of nodes) {
    const incoming = navigation.incoming(node.path);
    if (incoming.length === 0) continue;
    backlinks[node.path] = Object.freeze(incoming.map((edge) => Object.freeze({
      sourcePath: edge.data.sourcePath,
      kind: edge.data.kind,
      fragment: edge.data.fragment,
    })));
  }
  return Object.freeze({
    type: "MarkdownVaultGraph",
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    backlinks: Object.freeze(backlinks),
    externalUrls: Object.freeze([...new Set(edges.filter((edge) => edge.status === "external").map((edge) => edge.externalUrl))].sort()),
    diagnostics: Object.freeze({
      dangling: edges.filter((edge) => edge.status === "dangling").length,
      ambiguous: edges.filter((edge) => edge.status === "ambiguous").length,
    }),
  });
}
