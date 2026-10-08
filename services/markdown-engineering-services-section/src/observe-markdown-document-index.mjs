import { readMarkdownFile } from "./read-markdown-file.mjs";
import { readMarkdownDocument } from "./read-markdown-document.mjs";

/** Project readable paths into compact document records. Invalid metadata is
 * retained as a diagnostic; it neither removes the carrier nor creates links.
 */
export async function observeMarkdownDocumentIndex({ paths, root } = {}) {
  if (!Array.isArray(paths)) throw new TypeError("paths must be an array");
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  const entries = [];
  for (const path of paths) {
    if (typeof path !== "string" || path === "") continue;
    let text;
    try { text = await readMarkdownFile({ root, path }); } catch { continue; }
    const document = readMarkdownDocument(text, { coordinate: path, onInvalidFrontmatter: "diagnose" });
    entries.push(Object.freeze({ path, frontmatter: document.format === null ? null : document.frontmatter,
      headings: document.structure.headings, features: document.features, diagnostics: document.diagnostics }));
  }
  return Object.freeze(entries);
}
