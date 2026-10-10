/**
 * vault-note-schema/src/vault-website-publish - request/receipt JSON Schema
 * contracts for publishing a vault (an Obsidian-style directory of markdown
 * notes) as a static website. Relocated verbatim (contracts only) from
 * metroplat's `src/integrations/knowledge-vaults/publish.mts`, per the
 * 2026-09-05 ruling that a capability living inside metroplat's
 * `src/integrations/*` belongs in its own topic section, with metroplat
 * reduced to a thin consumer. The effectful publish leg (walking the vault,
 * building the website, writing it out) stays in metroplat because it
 * composes metroplat's own static-website generator (`src/sites/`), which is
 * out of this package's scope; this module carries only the wire contract.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const nonemptyStringSchema = { type: "string", minLength: 1 };
const stringSequenceSchema = { type: "array", items: { type: "string" } };
const nonNegativeIntegerSchema = { type: "integer", minimum: 0 };

export const vaultWebsitePublishRequestSchema = {
  $id: "vault-note-schema/vault-website-publish/publish-request",
  title: "VaultWebsitePublishRequest",
  description: "A filesystem-bounded request to walk an Obsidian vault, project it as a static website, and write that website to a stable output directory.",
  type: "object",
  required: ["kind", "vaultRoot", "outputRoot", "websiteUrl", "title"],
  properties: {
    kind: { const: "metroplat.vault-website-publish.publish-request" },
    vaultRoot: nonemptyStringSchema,
    outputRoot: nonemptyStringSchema,
    websiteUrl: nonemptyStringSchema,
    title: nonemptyStringSchema,
    description: { type: "string" },
    language: { type: "string" },
    author: { type: "string" },
    websiteName: { type: "string" },
    basePath: { type: "string" },
    postsPath: { type: "string" },
    includeDrafts: { type: "boolean" },
    theme: { enum: ["living-web-indieweb", false] },
  },
  additionalProperties: false,
};

export const vaultWebsitePublishReceiptSchema = {
  $id: "vault-note-schema/vault-website-publish/publish-receipt",
  title: "VaultWebsitePublishReceipt",
  description: "The written-artifact receipt of one vault website publish operation: source vault, output directory, ingestion counts, and every output path written.",
  type: "object",
  required: ["kind", "vaultRoot", "outputRoot", "contentFiles", "articles", "pages", "outputFiles", "paths"],
  properties: {
    kind: { const: "metroplat.vault-website-publish.publish-receipt" },
    vaultRoot: nonemptyStringSchema,
    outputRoot: nonemptyStringSchema,
    contentFiles: nonNegativeIntegerSchema,
    articles: nonNegativeIntegerSchema,
    pages: nonNegativeIntegerSchema,
    outputFiles: nonNegativeIntegerSchema,
    paths: stringSequenceSchema,
  },
  additionalProperties: false,
};

export const vaultWebsitePublishRequestContract = schemaFrom(vaultWebsitePublishRequestSchema);
export const vaultWebsitePublishReceiptContract = schemaFrom(vaultWebsitePublishReceiptSchema);
