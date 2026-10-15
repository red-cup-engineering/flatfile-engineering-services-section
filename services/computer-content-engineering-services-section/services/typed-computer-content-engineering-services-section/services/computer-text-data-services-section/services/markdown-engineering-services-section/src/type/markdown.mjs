import { admitMarkdownDatePath } from "../admit-markdown-date-path.mjs";
import { admitMarkdownLinkTarget } from "../admit-markdown-link-target.mjs";
import { applyMarkdownEdit } from "../apply-markdown-edit.mjs";
import { convertHtmlToMarkdown } from "../convert-html-to-markdown.mjs";
import { createMarkdownDocument } from "../create-markdown-document.mjs";
import { differentiateMarkdownFrontmatter } from "../differentiate-markdown-frontmatter.mjs";
import { differentiateMarkdownLines } from "../differentiate-markdown-lines.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";
import { deriveMarkdownVaultGraph } from "../derive-markdown-vault-graph.mjs";
import { matchMarkdownToken } from "../match-markdown-token.mjs";
import { measureMarkdownDateEvidence } from "../measure-markdown-date-evidence.mjs";
import { measureMarkdownDatePath } from "../measure-markdown-date-path.mjs";
import { mutateMarkdownFrontmatter } from "../mutate-markdown-frontmatter.mjs";
import { normalizeMarkdownDocument } from "../normalize-markdown-document.mjs";
import { observeMarkdownDocumentIndex } from "../observe-markdown-document-index.mjs";
import { projectMarkdownAssertions } from "../project-markdown-assertions.mjs";
import { projectMarkdownDatePath } from "../project-markdown-date-path.mjs";
import { readMarkdownDocument } from "../read-markdown-document.mjs";
import { readMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";
import { readMarkdownFile } from "../read-markdown-file.mjs";
import { readMarkdownStructure } from "@red-cup-engineering/read-markdown-structure-service";
import { readMarkdownTable } from "../read-markdown-table.mjs";
import { relocateMarkdownVaultDocumentPaths, planMarkdownTreeRelocation, relativeLinkPath } from "../relocate-markdown-tree.mjs";
import { renderMarkdownBlockHtml } from "../render-markdown-block-html.mjs";
import { renderMarkdownInlineHtmlNodes } from "../render-markdown-inline-html-nodes.mjs";
import { renderMarkdownInlineHtml } from "../render-markdown-inline-html.mjs";
import { replaceMarkdownLines } from "../replace-markdown-lines.mjs";
import { replaceMarkdownLinkTarget } from "../replace-markdown-link-target.mjs";
import { replaceMarkdownSection } from "../replace-markdown-section.mjs";
import { replaceMarkdownText } from "../replace-markdown-text.mjs";
import { resolveMarkdownLinkTarget } from "../resolve-markdown-link-target.mjs";
import { validateMarkdownDocument } from "../validate-markdown-document.mjs";

export {
  headingIds,
  headingLevels,
  parseBody,
  renderBody,
  safeHref,
  splitFrontMatter,
  tocOf,
} from "../relational-markdown.mjs";

export const markdownEngineType = Object.freeze({
  type: "MarkdownEngine",
  version: 1,
});

export const operations = Object.freeze({
  "admit-markdown-date-path": (request) => admitMarkdownDatePath(request),"admit-markdown-link-target": ({ value }) => admitMarkdownLinkTarget(value), "apply-markdown-edit": ({ text, request }) => applyMarkdownEdit(text, request), "convert-html-to-markdown": ({ html }) => convertHtmlToMarkdown(html), "create-markdown-document": ({ view, options }) => createMarkdownDocument(view, options), "differentiate-markdown-frontmatter": ({ before, after }) => differentiateMarkdownFrontmatter(before, after), "differentiate-markdown-lines": ({ before, after }) => differentiateMarkdownLines(before, after), "derive-markdown-vault-graph": (request) => deriveMarkdownVaultGraph(request), "match-markdown-token": (request) => matchMarkdownToken(request), "measure-markdown-date-evidence": (request) => measureMarkdownDateEvidence(request), "measure-markdown-date-path": ({ path }) => measureMarkdownDatePath(path), "mutate-markdown-frontmatter": ({ text, request }) => mutateMarkdownFrontmatter(text, request), "normalize-markdown-document": ({ text, options }) => normalizeMarkdownDocument(text, options), "observe-markdown-document-index": (request) => observeMarkdownDocumentIndex(request), "project-markdown-assertions": (request) => projectMarkdownAssertions(request), "project-markdown-date-path": (request) => projectMarkdownDatePath(request), "read-markdown-document": ({ text, options }) => readMarkdownDocument(text, options), "read-markdown-features": ({ text }) => readMarkdownFeatures(text), "read-markdown-file": (request) => readMarkdownFile(request), "read-markdown-structure": ({ text }) => readMarkdownStructure(text), "render-markdown-block-html": ({ markdown, options }) => renderMarkdownBlockHtml(markdown, options), "render-markdown-inline-html": ({ markdown }) => renderMarkdownInlineHtml(markdown), "render-markdown-inline-html-nodes": ({ text }) => renderMarkdownInlineHtmlNodes(text), "replace-markdown-lines": ({ text, request }) => replaceMarkdownLines(text, request), "replace-markdown-section": ({ text, request }) => replaceMarkdownSection(text, request), "replace-markdown-text": ({ text, request }) => replaceMarkdownText(text, request), "validate-markdown-document": ({ text, options }) => validateMarkdownDocument(text, options), "read-markdown-frontmatter": (request) => readMarkdownFrontmatter(request.text, request.options), "split-markdown-frontmatter-fence": (request) => splitMarkdownFrontmatterFence(request.text), "read-markdown-table": (request) => readMarkdownTable(request), "resolve-markdown-link-target": ({ target, carrierPath, root }) => resolveMarkdownLinkTarget(target, { carrierPath, root }), "replace-markdown-link-target": ({ text, request }) => replaceMarkdownLinkTarget(text, request), "relocate-markdown-vault-document-paths": (request) => relocateMarkdownVaultDocumentPaths(request), "plan-markdown-tree-relocation": (request) => planMarkdownTreeRelocation(request), "project-markdown-relative-link": ({ carrierPath, targetPath }) => relativeLinkPath(carrierPath, targetPath),
});

export const markdownOperationNames = Object.freeze(Object.keys(operations));

/**
 * Invoke one named command against a supplied operations table, honoring the
 * same JSON command boundary `invokeMarkdownService` uses. Kept separate so a
 * kernel module can extend `operations` with effectful entries (operations
 * whose implementation itself reads or writes) and dispatch through the same
 * validation without importing that effect into this hull module.
 */
export async function invokeOperation(operationTable, operation, request) {
  if (typeof operation !== "string" || !(operation in operationTable)) throw new TypeError(`unknown Markdown operation ${operation}`);
  if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request must be a JSON object");
  return operationTable[operation](request);
}

/**
 * Invoke one named Markdown language command with its JSON request. This is
 * JSON command boundary. Each operation retains its own source or I/O effects.
 */
export async function invokeMarkdownService(operation, request) {
  return invokeOperation(operations, operation, request);
}
