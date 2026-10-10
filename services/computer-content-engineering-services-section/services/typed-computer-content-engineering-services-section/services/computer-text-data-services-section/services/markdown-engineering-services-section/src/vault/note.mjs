/**
 * vault-note-schema/src/vault-note - request/reading JSON Schema contracts
 * for treating any directory as a vault of markdown notes: read, write, and
 * query. No special data root: the vault is named per request. Relocated
 * verbatim (contracts only, no filesystem legs) from metroplat's
 * `src/integrations/knowledge-vaults/notes.mts`, per the 2026-09-05 ruling
 * that a capability living inside metroplat's `src/integrations/*` belongs
 * in its own topic section, with metroplat reduced to a thin consumer.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const nonemptyStringSchema = { type: "string", minLength: 1 };
const nonNegativeIntegerSchema = { type: "integer", minimum: 0 };
const openRecordSchema = { type: "object", additionalProperties: {} };
const stringSequenceSchema = { type: "array", items: { type: "string" } };
const referenceDialectSchema = { anyOf: [{ const: "csl" }, { const: "citekey-map" }, { const: "empty" }, { const: "none" }, { const: "mixed" }] };

const internalTargetSchema = {
  type: "object",
  required: ["field", "kind", "value"],
  properties: {
    field: nonemptyStringSchema,
    kind: { anyOf: [{ const: "citation" }, { const: "relation" }] },
    value: nonemptyStringSchema,
  },
  additionalProperties: false,
};

export const vaultNoteReadRequestSchema = {
  $id: "vault-note-schema/note-read-request",
  title: "VaultNoteReadRequest",
  description: "A request to read one markdown note from a vault directory: the vault root plus the note's vault-relative path.",
  type: "object",
  required: ["kind", "vaultRoot", "notePath"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.note-read-request" },
    vaultRoot: nonemptyStringSchema,
    notePath: nonemptyStringSchema,
  },
  additionalProperties: false,
};

export const vaultNoteProjectionSchema = {
  $id: "vault-note-schema/note-projection",
  title: "VaultNoteProjection",
  description: "One note projected from a vault: frontmatter and body, the EAVT assertion count and conformance verdict of its dataform, its references normalized to CSL-JSON with the detected dialect, its internal citation/relation targets, and the reference ids its body cites.",
  type: "object",
  required: ["kind", "vaultRoot", "notePath", "title", "format", "conformant", "frontmatter", "body", "assertionCount", "referenceDialect", "references", "internalTargets", "citedReferenceIds"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.note-projection" },
    vaultRoot: nonemptyStringSchema,
    notePath: nonemptyStringSchema,
    title: { type: "string" },
    format: { anyOf: [{ const: "yaml" }, { const: "toml" }, { const: "none" }] },
    conformant: { type: "boolean" },
    frontmatter: openRecordSchema,
    body: { type: "string" },
    assertionCount: nonNegativeIntegerSchema,
    referenceDialect: referenceDialectSchema,
    references: { type: "array", items: openRecordSchema },
    internalTargets: { type: "array", items: internalTargetSchema },
    citedReferenceIds: stringSequenceSchema,
  },
  additionalProperties: false,
};

export const vaultNoteWriteRequestSchema = {
  $id: "vault-note-schema/note-write-request",
  title: "VaultNoteWriteRequest",
  description: "A request to write one markdown note into a vault directory: frontmatter record plus body, with references normalized to canonical CSL-in-YAML on the way in unless normalizeReferences is false.",
  type: "object",
  required: ["kind", "vaultRoot", "notePath", "frontmatter", "body"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.note-write-request" },
    vaultRoot: nonemptyStringSchema,
    notePath: nonemptyStringSchema,
    frontmatter: openRecordSchema,
    body: { type: "string" },
    normalizeReferences: { type: "boolean" },
  },
  additionalProperties: false,
};

export const vaultNoteWriteReceiptSchema = {
  $id: "vault-note-schema/note-write-receipt",
  title: "VaultNoteWriteReceipt",
  description: "The written-artifact receipt of one vault note write: absolute and vault-relative paths, bytes written, and the reference count and dialect the written frontmatter carries.",
  type: "object",
  required: ["kind", "vaultRoot", "notePath", "bytes", "referenceCount", "referenceDialect"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.note-write-receipt" },
    vaultRoot: nonemptyStringSchema,
    notePath: nonemptyStringSchema,
    bytes: nonNegativeIntegerSchema,
    referenceCount: nonNegativeIntegerSchema,
    referenceDialect: referenceDialectSchema,
  },
  additionalProperties: false,
};

export const vaultReadRequestSchema = {
  $id: "vault-note-schema/read-request",
  title: "VaultReadRequest",
  description: "A request to read a whole vault directory (optionally a subdirectory of it) as one ingested note collection.",
  type: "object",
  required: ["kind", "vaultRoot"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.read-request" },
    vaultRoot: nonemptyStringSchema,
    contentPath: { type: "string" },
  },
  additionalProperties: false,
};

export const vaultIngestionProfileSchema = {
  $id: "vault-note-schema/ingestion-profile",
  title: "VaultIngestionProfile",
  description: "A vault ingested as one note collection: ingestion counts, the resolved/unresolved wikilink totals, the vault's bibliographic layer (CSL reference items and how many notes carry them), the matter-topology receipt of the undirected note-link nerve, a per-note index, and the non-conforming files held as data (path plus parse error) rather than as explosion.",
  type: "object",
  required: ["kind", "vaultRoot", "files", "notes", "articles", "pages", "links", "unresolvedLinks", "referenceItems", "referencingNotes", "matter", "notesIndex", "nonConforming"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.ingestion-profile" },
    vaultRoot: nonemptyStringSchema,
    contentPath: { type: "string" },
    files: nonNegativeIntegerSchema,
    notes: nonNegativeIntegerSchema,
    articles: nonNegativeIntegerSchema,
    pages: nonNegativeIntegerSchema,
    links: nonNegativeIntegerSchema,
    unresolvedLinks: nonNegativeIntegerSchema,
    referenceItems: nonNegativeIntegerSchema,
    referencingNotes: nonNegativeIntegerSchema,
    matter: openRecordSchema,
    notesIndex: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "title", "url", "kind", "linkCount", "unresolvedLinkCount", "referenceCount", "referenceDialect"],
        properties: {
          path: nonemptyStringSchema,
          title: { type: "string" },
          url: { type: "string" },
          kind: { anyOf: [{ const: "article" }, { const: "page" }] },
          linkCount: nonNegativeIntegerSchema,
          unresolvedLinkCount: nonNegativeIntegerSchema,
          referenceCount: nonNegativeIntegerSchema,
          referenceDialect: referenceDialectSchema,
        },
        additionalProperties: false,
      },
    },
    nonConforming: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "error"],
        properties: {
          path: nonemptyStringSchema,
          error: nonemptyStringSchema,
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const vaultQueryRequestSchema = {
  $id: "vault-note-schema/query-request",
  title: "VaultQueryRequest",
  description: "A request to query a vault directory as one merged EAVT relation: optional exact entity/attribute selectors, an optional case-insensitive text needle matched over rows and note bodies, and a returned-row cap.",
  type: "object",
  required: ["kind", "vaultRoot"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.query-request" },
    vaultRoot: nonemptyStringSchema,
    contentPath: { type: "string" },
    entity: nonemptyStringSchema,
    attribute: nonemptyStringSchema,
    text: nonemptyStringSchema,
    limit: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
};

const eavtRowSchema = {
  type: "object",
  required: ["e", "a", "v", "t"],
  properties: { e: {}, a: {}, v: {}, t: {} },
  additionalProperties: false,
};

const nonConformingEntrySchema = {
  type: "object",
  required: ["path", "error"],
  properties: {
    path: nonemptyStringSchema,
    error: nonemptyStringSchema,
  },
  additionalProperties: false,
};

export const vaultQueryResultSchema = {
  $id: "vault-note-schema/query-result",
  title: "VaultQueryResult",
  description: "A vault query result over one merged EAVT relation: every note's frontmatter assertions glued through the content-identity EAVT merge and filtered by the request's selectors. Carries the matched rows (capped by the request limit), per-attribute tallies over all matches, note paths whose bodies contain the text needle, and the non-conforming files held as data (path plus parse error).",
  type: "object",
  required: ["kind", "vaultRoot", "notes", "rows", "matchedRows", "returnedRows", "attributes", "results", "bodyMatches", "nonConforming"],
  properties: {
    kind: { const: "metroplat.knowledge-vault.query-result" },
    vaultRoot: nonemptyStringSchema,
    contentPath: { type: "string" },
    notes: nonNegativeIntegerSchema,
    rows: nonNegativeIntegerSchema,
    matchedRows: nonNegativeIntegerSchema,
    returnedRows: nonNegativeIntegerSchema,
    attributes: { type: "object", additionalProperties: nonNegativeIntegerSchema },
    results: { type: "array", items: eavtRowSchema },
    bodyMatches: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "count"],
        properties: {
          path: nonemptyStringSchema,
          count: nonNegativeIntegerSchema,
        },
        additionalProperties: false,
      },
    },
    nonConforming: { type: "array", items: nonConformingEntrySchema },
  },
  additionalProperties: false,
};

export const vaultNoteReadRequestContract = schemaFrom(vaultNoteReadRequestSchema);
export const vaultNoteProjectionContract = schemaFrom(vaultNoteProjectionSchema);
export const vaultNoteWriteRequestContract = schemaFrom(vaultNoteWriteRequestSchema);
export const vaultNoteWriteReceiptContract = schemaFrom(vaultNoteWriteReceiptSchema);
export const vaultReadRequestContract = schemaFrom(vaultReadRequestSchema);
export const vaultIngestionProfileContract = schemaFrom(vaultIngestionProfileSchema);
export const vaultQueryRequestContract = schemaFrom(vaultQueryRequestSchema);
export const vaultQueryResultContract = schemaFrom(vaultQueryResultSchema);
