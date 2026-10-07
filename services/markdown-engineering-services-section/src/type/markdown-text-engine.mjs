import { namespaceTextOperations } from "@red-cup-engineering/computer-text-content-engineering-services-section/computer-text-engine";
import { operations } from "./markdown.mjs";

/**
 * Markdown's own operations, registered under the `markdown` namespace so
 * they compose through computer-text-engine's namespacing. Dispatch of typed
 * requests over this table lives in javascript-node
 * (`./invoke-markdown-typed-operation`).
 */
export const markdownTextOperations = namespaceTextOperations("markdown", operations);
