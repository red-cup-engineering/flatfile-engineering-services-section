import { readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";
import { admitMarkdownLinkTarget } from "./admit-markdown-link-target.mjs";
import { projectMarkdownFeatures } from "@red-cup-engineering/read-markdown-features-service";

function bounded(text, delimiter, start) {
  const close = text.indexOf(delimiter, start + delimiter.length);
  return close < 0 ? null : { inner: text.slice(start + delimiter.length, close), next: close + delimiter.length };
}

function inlineFeatures(source) {
  const result = [];
  let cursor = 0;
  const ordered = [...projectMarkdownFeatures(source)].filter((feature) => ["markdown-link", "wikilink", "transclusion", "inline-field", "citation-group"].includes(feature.type)).sort((left, right) => left.span.start - right.span.start || right.span.end - left.span.end);
  for (const feature of ordered) {
    if (feature.span.start < cursor) continue;
    result.push(feature);
    cursor = feature.span.end;
  }
  return result;
}

/** One inline Markdown transformation, projected into text/element output carriers. */
export function projectMarkdownInline(input, { text: htmlText, element: htmlElement, allowedFeatures }) {
  if (allowedFeatures !== undefined && (!Array.isArray(allowedFeatures) || allowedFeatures.some((kind) => typeof kind !== "string"))) throw new TypeError("allowedFeatures must be an array of feature names");
  const admitted = allowedFeatures === undefined ? null : new Set(allowedFeatures);
  const allows = (kind) => admitted === null || admitted.has(kind);
  function featureNodes(feature) {
    if (!allows(feature.image ? "image" : feature.type)) return [htmlText(feature.span.text)];
    if (feature.type === "markdown-link") {
      const href = admitMarkdownLinkTarget(feature.target);
      if (href === null) return project(feature.label);
      if (feature.image) return [htmlElement("img", { src: href, alt: feature.label, ...(feature.title === null ? {} : { title: feature.title }) })];
      return [htmlElement("a", { href, ...(feature.title === null ? {} : { title: feature.title }) }, project(feature.label))];
    }
    if (feature.type === "inline-field") return [htmlElement("span", { class: "markdown-inline-field", "data-key": feature.key }, [htmlElement("span", { class: "markdown-inline-field-key" }, [htmlText(feature.key)]), htmlElement("span", { class: "markdown-inline-field-value" }, project(feature.value))])];
    if (feature.type === "citation-group") return [htmlElement("span", { class: "markdown-citation-group", role: "doc-biblioref", "data-citation-keys": feature.keys.join(" "), "data-citation-suppressed-keys": feature.suppressedKeys.join(" ") }, [htmlText(feature.span.text)])];
    const kind = feature.type === "wikilink" ? "markdown-wikilink" : "markdown-transclusion";
    return [htmlElement("span", { class: kind, "data-target": feature.target }, [htmlText(feature.label ?? feature.target)])];
  }

  function project(input) {
    if (typeof input !== "string") throw new TypeError("text must be a string");
    const source = readMarkdownSource(input, { frontmatter: false });
    const { text, codeRanges } = source;
    const features = inlineFeatures(source);
    const nodes = [];
    let plain = "";
    const flush = () => { if (plain !== "") { nodes.push(htmlText(plain)); plain = ""; } };
    for (let index = 0; index < text.length;) {
      const feature = features.find((candidate) => candidate.span.start === index);
      if (feature !== undefined) { flush(); nodes.push(...featureNodes(feature)); index = feature.span.end; continue; }
      const code = codeRanges.find((range) => range.type === "inline-code" && range.start === index);
      if (code !== undefined) {
        if (!allows("inline-code")) { flush(); nodes.push(htmlText(text.slice(code.start, code.end))); index = code.end; continue; }
        let value = text.slice(code.contentStart, code.contentEnd).replace(/\n/gu, " ");
        if (value.startsWith(" ") && value.endsWith(" ") && value.trim() !== "") value = value.slice(1, -1);
        flush(); nodes.push(htmlElement("code", {}, [htmlText(value)])); index = code.end; continue;
      }
      const emphasis = text.startsWith("***", index) ? ["***", "strong-em"] : text.startsWith("**", index) ? ["**", "strong"] : text.startsWith("__", index) ? ["__", "strong"] : text[index] === "*" ? ["*", "em"] : text[index] === "_" ? ["_", "em"] : null;
      if (emphasis !== null) { const part = bounded(text, emphasis[0], index); if (part !== null) { flush(); if (!allows(emphasis[1])) { nodes.push(htmlText(text.slice(index, part.next))); index = part.next; continue; } const children = project(part.inner); nodes.push(emphasis[1] === "strong-em" ? htmlElement("strong", {}, [htmlElement("em", {}, children)]) : htmlElement(emphasis[1], {}, children)); index = part.next; continue; } }
      plain += text[index]; index += 1;
    }
    flush();
    return Object.freeze(nodes);
  }
  return project(input);
}
