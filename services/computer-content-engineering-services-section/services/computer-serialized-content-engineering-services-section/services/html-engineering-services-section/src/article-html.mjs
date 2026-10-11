/**
 * article-html projections - semantic HTML pages for Article content records.
 *
 * The projection is pure: callers provide the admitted Article value and receive
 * a complete HTML document or an h-feed fragment. Markdown body handling goes
 * through the markdown projection boundary before being rendered into HTML.
 */

import { escapeAttr, escapeText } from "@red-cup-engineering/html-structural-projection-service";
import { htmlElement, htmlFragment } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { renderMarkdownBlockHtml } from "@red-cup-engineering/markdown-engineering-services-section/render-markdown-block-html";
import { articleDescription, articleHeadMetadata, articleUrl, renderArticleHeadMetadata } from "./page-metadata.mjs";
import { renderStaticWebsiteHtmlPresentation, staticWebsiteBodyAttributes } from "./static-page.mjs";

/** Project one Article content record to a full h-entry HTML document. */
export function articleToHtmlPage(article, options = {}) {
  const lang = options.lang ?? "en";
  const title = article.title;
  const description = articleDescription(article);
  const bodyHtml = renderMarkdownBody(article.body);
  return renderStaticWebsiteHtmlPresentation({
    title,
    lang,
    head: renderHead(article, options, description),
    token: `article:${article.slug}`,
    bodyAttributes: options.bodyAttributes ?? staticWebsiteBodyAttributes(),
    roots: Object.freeze(["main"]),
    nodes: articlePresentationNodes(article, bodyHtml),
  });
}

/** Project an Article sequence to an h-feed fragment of h-entry summaries. */
export function articlesToHFeed(articles, options = {}) {
  const title = options.title ?? "Articles";
  const entries = articles.map((article) => {
    const url = articleUrl(article, options);
    const description = articleDescription(article);
    return `  <article class="h-entry" data-slug="${escapeAttr(article.slug)}">
    <h2 class="p-name">${linkOrText(article.title, url)}</h2>
    <p class="byline">By <span class="p-author h-card">${escapeText(article.author)}</span></p>
    <time class="dt-published" datetime="${escapeAttr(article.date)}">${escapeText(article.date)}</time>${description === undefined ? "" : `
    <p class="p-summary">${escapeText(description)}</p>`}
  </article>`;
  }).join("\n");

  return `<section class="h-feed">
  <h1 class="p-name">${escapeText(title)}</h1>
${entries}
</section>
`;
}

function renderHead(article, options, description) {
  const metadata = articleHeadMetadata(article, options);
  return [
    description === undefined ? null : metaName("description", description),
    metaName("author", article.author),
    joinedMetaName("keywords", article.keywords),
    article.license_url === undefined ? null : htmlElement("link", { rel: "license", href: article.license_url }),
    htmlFragment(renderArticleHeadMetadata(metadata)),
  ];
}

function renderMarkdownBody(markdown) {
  return renderMarkdownBlockHtml(markdown);
}

function articlePresentationNodes(article, bodyHtml) {
  const children = [
    "header",
    "content",
    ...(article.license !== undefined || article.license_url !== undefined ? ["license"] : []),
    ...((article.sources ?? []).length > 0 || [...(article.references ?? []), ...(article.citations ?? [])].length > 0 ? ["sources"] : []),
  ];
  return Object.freeze([
    { nodeId: "main", element: "main", attributes: { "data-metroplat-locus": "main" }, children: ["article"] },
    { nodeId: "article", element: "article", attributes: { class: "h-entry", "data-slug": article.slug, "data-metroplat-locus": "entry" }, children },
    { nodeId: "header", element: "header", attributes: { "data-metroplat-locus": "header" }, children: ["title", "byline", "published", ...(article.updated === undefined ? [] : ["updated"])] },
    { nodeId: "title", element: "h1", attributes: { class: "p-name", "data-metroplat-locus": "title" }, text: article.title },
    { nodeId: "byline", element: "p", attributes: { class: "byline", "data-metroplat-locus": "byline" }, children: ["byline-prefix", "author"] },
    { nodeId: "byline-prefix", element: "span", text: "By " },
    { nodeId: "author", element: "span", attributes: { class: "p-author h-card" }, text: article.author },
    { nodeId: "published", element: "time", attributes: { class: "dt-published", datetime: article.date, "data-metroplat-locus": "published" }, text: article.date },
    ...(article.updated === undefined ? [] : [
      { nodeId: "updated", element: "time", attributes: { class: "dt-updated", datetime: article.updated }, text: article.updated },
    ]),
    { nodeId: "content", element: "div", attributes: { class: "e-content", "data-metroplat-locus": "content" }, html: bodyHtml },
    ...articleEvidencePresentationNodes(article),
  ]);
}

function articleEvidencePresentationNodes(article) {
  const nodes = [];
  if (article.license !== undefined || article.license_url !== undefined) {
    nodes.push(article.license_url === undefined
      ? { nodeId: "license", element: "p", attributes: { class: "article-license", "data-metroplat-locus": "license" }, text: article.license ?? "License" }
      : { nodeId: "license", element: "p", attributes: { class: "article-license", "data-metroplat-locus": "license" }, children: ["license-link"] });
    if (article.license_url !== undefined) {
      nodes.push({
        nodeId: "license-link",
        element: "a",
        attributes: { rel: "license", href: article.license_url },
        text: article.license ?? article.license_url,
      });
    }
  }
  const sources = article.sources ?? [];
  const references = [...(article.references ?? []), ...(article.citations ?? [])];
  if (sources.length > 0 || references.length > 0) {
    const itemIds = [
      ...sources.map((_source, index) => `source-${index}`),
      ...references.map((_reference, index) => `reference-${index}`),
    ];
    nodes.push(
      { nodeId: "sources", element: "section", attributes: { class: "article-sources", "data-metroplat-locus": "sources" }, children: ["sources-title", "sources-list"] },
      { nodeId: "sources-title", element: "h2", text: "Sources" },
      { nodeId: "sources-list", element: "ul", children: itemIds },
    );
    sources.forEach((source, index) => {
      const itemId = `source-${index}`;
      nodes.push(
        { nodeId: itemId, element: "li", children: [`${itemId}-link`] },
        { nodeId: `${itemId}-link`, element: "a", attributes: { rel: "via", href: source.url }, text: source.title ?? source.source ?? source.url },
      );
    });
    references.forEach((reference, index) => {
      const itemId = `reference-${index}`;
      nodes.push(
        { nodeId: itemId, element: "li", children: [`${itemId}-link`] },
        { nodeId: `${itemId}-link`, element: "a", attributes: { rel: "cite", href: reference.URL }, text: reference.title },
      );
    });
  }
  return Object.freeze(nodes);
}

function metaName(name, content) {
  return htmlElement("meta", { name, content });
}

function joinedMetaName(name, values) {
  return values === undefined || values.length === 0 ? null : metaName(name, values.join(", "));
}

function linkOrText(label, href) {
  return href === undefined
    ? escapeText(label)
    : `<a class="u-url" href="${escapeAttr(href)}">${escapeText(label)}</a>`;
}
