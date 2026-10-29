import { admitMarkdownLinkTarget } from "@red-cup-engineering/admit-markdown-link-target-service";
import { htmlElement, htmlText } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { readMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";

function bounded(text, delimiter, start) {
  const close = text.indexOf(delimiter, start + delimiter.length);
  return close < 0 ? null : { inner: text.slice(start + delimiter.length, close), next: close + delimiter.length };
}

function linkSpan(text, start) {
  const labelEnd = text.indexOf("]", start + 1);
  if (labelEnd < 0 || text[labelEnd + 1] !== "(") return null;
  const hrefEnd = text.indexOf(")", labelEnd + 2);
  return hrefEnd < 0 ? null : { label: text.slice(start + 1, labelEnd), href: text.slice(labelEnd + 2, hrefEnd), next: hrefEnd + 1 };
}

function inlineFeatures(text) {
  const result = [];
  let cursor = 0;
  const ordered = [...readMarkdownFeatures(text)].filter((feature) => feature.type !== "callout").sort((left, right) => left.span.start - right.span.start || right.span.end - left.span.end);
  for (const feature of ordered) {
    if (feature.span.start < cursor) continue;
    result.push(feature);
    cursor = feature.span.end;
  }
  return result;
}

function featureNodes(feature) {
  if (feature.type === "markdown-link") {
    const href = admitMarkdownLinkTarget(feature.target);
    if (href === null) return renderMarkdownInlineHtmlNodes(feature.label);
    if (feature.image) return [htmlElement("img", { src: href, alt: feature.label, ...(feature.title === null ? {} : { title: feature.title }) })];
    return [htmlElement("a", { href, ...(feature.title === null ? {} : { title: feature.title }) }, renderMarkdownInlineHtmlNodes(feature.label))];
  }
  if (feature.type === "inline-field") return [htmlElement("span", { class: "markdown-inline-field", "data-key": feature.key }, [htmlElement("span", { class: "markdown-inline-field-key" }, [feature.key]), htmlElement("span", { class: "markdown-inline-field-value" }, renderMarkdownInlineHtmlNodes(feature.value))])];
  if (feature.type === "citation-group") return [htmlElement("span", { class: "markdown-citation-group", role: "doc-biblioref", "data-citation-keys": feature.keys.join(" "), "data-citation-suppressed-keys": feature.suppressedKeys.join(" ") }, [feature.span.text])];
  const kind = feature.type === "wikilink" ? "markdown-wikilink" : "markdown-transclusion";
  return [htmlElement("span", { class: kind, "data-target": feature.target }, [feature.label ?? feature.target])];
}

/**
 * Render one inline Markdown text run into immutable HTML document nodes.
 *
 * The output is an ordered frozen `HtmlNode[]`, suitable for structural HTML
 * composition without reparsing an HTML string.
 */
export function renderMarkdownInlineHtmlNodes(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const features = inlineFeatures(text);
  const nodes = [];
  let plain = "";
  const flush = () => { if (plain !== "") { nodes.push(htmlText(plain)); plain = ""; } };
  for (let index = 0; index < text.length;) {
    const feature = features.find((candidate) => candidate.span.start === index);
    if (feature !== undefined) { flush(); nodes.push(...featureNodes(feature)); index = feature.span.end; continue; }
    const code = text[index] === "`" ? bounded(text, "`", index) : null;
    if (code !== null) { flush(); nodes.push(htmlElement("code", {}, [code.inner])); index = code.next; continue; }
    const link = text[index] === "[" ? linkSpan(text, index) : null;
    if (link !== null) { flush(); const href = admitMarkdownLinkTarget(link.href); nodes.push(...(href === null ? renderMarkdownInlineHtmlNodes(link.label) : [htmlElement("a", { href }, renderMarkdownInlineHtmlNodes(link.label))])); index = link.next; continue; }
    const emphasis = text.startsWith("***", index) ? ["***", "strong-em"] : text.startsWith("**", index) ? ["**", "strong"] : text.startsWith("__", index) ? ["__", "strong"] : text[index] === "*" ? ["*", "em"] : text[index] === "_" ? ["_", "em"] : null;
    if (emphasis !== null) { const part = bounded(text, emphasis[0], index); if (part !== null) { flush(); const children = renderMarkdownInlineHtmlNodes(part.inner); nodes.push(emphasis[1] === "strong-em" ? htmlElement("strong", {}, [htmlElement("em", {}, children)]) : htmlElement(emphasis[1], {}, children)); index = part.next; continue; } }
    plain += text[index]; index += 1;
  }
  flush();
  return Object.freeze(nodes);
}
