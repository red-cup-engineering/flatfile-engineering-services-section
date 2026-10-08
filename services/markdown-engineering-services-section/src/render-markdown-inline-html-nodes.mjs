import { htmlElement, htmlText } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { projectMarkdownInline } from "./project-markdown-inline.mjs";

/** Render one inline Markdown run into immutable HTML document nodes. */
export function renderMarkdownInlineHtmlNodes(text, { allowedFeatures } = {}) {
  return projectMarkdownInline(text, { text: htmlText, element: htmlElement, allowedFeatures });
}
