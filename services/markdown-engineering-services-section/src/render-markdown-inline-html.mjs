import { projectMarkdownInline } from "./project-markdown-inline.mjs";

const escape = (value) => value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
const htmlStrings = Object.freeze({
  text: escape,
  element(name, attributes = {}, children = []) {
    const attrs = Object.entries(attributes).map(([key, value]) => ` ${key}="${escape(String(value))}"`).join("");
    return `<${name}${attrs}>${name === "img" ? "" : `${children.join("")}</${name}>`}`;
  },
});

/** Render one inline Markdown run as escaped HTML. */
export function renderMarkdownInlineHtml(markdown, { allowedFeatures } = {}) {
  return projectMarkdownInline(markdown, { ...htmlStrings, allowedFeatures }).join("");
}
