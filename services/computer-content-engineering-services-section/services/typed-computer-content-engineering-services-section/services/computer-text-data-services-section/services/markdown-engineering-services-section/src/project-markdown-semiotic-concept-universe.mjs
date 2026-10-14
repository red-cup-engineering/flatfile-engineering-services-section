import { createSemioticConceptUniverse } from "@red-cup-engineering/signcell/semiotic-concept-universe";
import { readMarkdownDocument } from "./read-markdown-document.mjs";
import { sha256Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256";
import { utf8Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-bytes";

const freeze = (value) => Object.freeze(value);

function slugify(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\\/]+/gu, "-")
    .replace(/[^a-z0-9_-]+/gu, "-").replace(/-+/gu, "-").replace(/^-|-$/gu, "");
  return normalized || "item";
}

function strings(value) {
  if (value === undefined || value === null) return [];
  return (Array.isArray(value) ? value : [value]).filter((item) => item !== "" && item !== null && item !== undefined).map(String);
}

function values(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function derivedId(path) {
  const parts = path.replace(/\\/gu, "/").split("/");
  const content = parts.lastIndexOf("content");
  return (content === -1 ? parts : parts.slice(content + 1)).join("/").replace(/\.md$/iu, "");
}

function annotation(value) {
  if (typeof value === "string") {
    const reference = /^ref:\[\[(.*)\]\]$/u.exec(value);
    return reference === null
      ? freeze({ kind: "atom", value, provenance: { declared: value } })
      : freeze({ kind: "reference", target: reference[1], provenance: { declared: value } });
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("ref" in value) return freeze({ kind: "reference", target: String(value.ref), provenance: { declared: value } });
    if ("key" in value && "value" in value) return freeze({ kind: "attribute", key: String(value.key), value: value.value, provenance: { declared: value } });
  }
  return freeze({ kind: "failure", reason: "unparseable annotation declaration", provenance: { declared: value } });
}

/**
 * Decode Markdown source into the concept declaration that its frontmatter
 * expresses. Reading Markdown and YAML remains the responsibility of the
 * shared Markdown service; this function supplies only the semiotic mapping.
 */
export function projectMarkdownSemioticConceptDeclaration({ path, text } = {}) {
  if (typeof path !== "string" || path.trim() === "") throw new TypeError("path must be non-empty text");
  if (typeof text !== "string") throw new TypeError("source text must be original UTF-8 Markdown text");
  const revision = "sha256:" + sha256Bytes(utf8Bytes(text));
  const document = readMarkdownDocument(text, { coordinate: path, onInvalidFrontmatter: "diagnose" });
  const frontmatter = document.frontmatter ?? {};
  const title = typeof frontmatter.title === "string" && frontmatter.title.trim() !== ""
    ? frontmatter.title
    : document.structure.headings.find(({ level }) => level === 1)?.title ?? path.split("/").at(-1).replace(/\.md$/iu, "");
  const publish = frontmatter.publish;
  const channels = [...strings(frontmatter.publish_to), ...(Array.isArray(publish) ? strings(publish) : [])];
  return freeze({
    id: slugify(frontmatter.id ?? derivedId(path)),
    title,
    body: document.body,
    tags: strings(frontmatter.tags),
    sameAs: strings(frontmatter.same_as),
    // Match the native L-Space reader: public is an explicit source opt-in, not a channel hint.
    // Final publication authority remains with the receiving owner; this is eligibility only.
    publication: freeze({ enabled: frontmatter.visibility === "public" && !Object.hasOwn(frontmatter, "consent-status") && publish !== false, channels, status: typeof frontmatter.status === "string" ? frontmatter.status : null }),
    annotations: freeze(values(frontmatter.ann).map(annotation)),
    attributes: freeze({ frontmatter, assertions: document.assertions }),
    source: freeze({ path, revision, format: document.format, diagnostics: document.diagnostics }),
  });
}

/** Admit several Markdown declarations as one immutable, content-addressed SignCell. */
export function projectMarkdownSemioticConceptUniverse({ documents } = {}) {
  if (!Array.isArray(documents)) throw new TypeError("documents must be an array");
  return createSemioticConceptUniverse({ concepts: documents.map(projectMarkdownSemioticConceptDeclaration) });
}
