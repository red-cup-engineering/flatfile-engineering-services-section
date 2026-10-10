/**
 * page-metadata — a page's head metadata: Open Graph and Twitter Card tags, the
 * web app manifest and its link, and, for an admitted Article, the whole head
 * block (canonical URL, description, social tags and schema.org JSON-LD, the
 * JSON-LD from the RDF section's schema-org). Every page renderer that writes
 * `og:` or `twitter:` tags writes them through `socialMetaTags`.
 */
import { ArticleSchema } from "@red-cup-engineering/computer-article-engineering-services-section/article";
import { escapeAttr } from "@red-cup-engineering/html-structural-projection-service";
import {
  articleToArticleJsonLd,
  articleToNewsArticleJsonLd,
  breadcrumbJsonLd,
  entityGraphJsonLd,
  renderJsonLdScript,
  websiteContextToWebSiteJsonLd,

} from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/schema-org";

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}

/** One `<meta>` element keyed by `name` or `property`; empty when the content is. */
export function metaTag(kind, key, content) {
  if (content === undefined || content === null || content === "") return "";
  return `<meta ${kind}="${escapeAttr(key)}" content="${escapeAttr(String(content))}">`;
}

const each = (value) => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const imagesOf = (props) => [...each(props.images), ...each(props.image)].map((image) => typeof image === "string" ? { url: image } : image).filter((image) => image?.url);

/**
 * The Open Graph tags of a page. `props`: type ("website" by default), title, description, url, siteName,
 * locale, images (`{ url, alt, width, height, type }` or URLs) or image, and for an article publishedTime,
 * modifiedTime, section, authors and tags.
 */
export function openGraphTags(props = {}) {
  const type = props.type ?? "website";
  return Object.freeze([
    metaTag("property", "og:site_name", props.siteName),
    metaTag("property", "og:type", type),
    metaTag("property", "og:title", props.title),
    metaTag("property", "og:description", props.description),
    metaTag("property", "og:url", props.url),
    metaTag("property", "og:locale", props.locale),
    ...imagesOf(props).flatMap((image) => [
      metaTag("property", "og:image", image.url),
      metaTag("property", "og:image:alt", image.alt),
      metaTag("property", "og:image:width", image.width),
      metaTag("property", "og:image:height", image.height),
      metaTag("property", "og:image:type", image.type),
    ]),
    ...(type === "article" ? [
      metaTag("property", "article:published_time", props.publishedTime),
      metaTag("property", "article:modified_time", props.modifiedTime),
      metaTag("property", "article:section", props.section),
      ...each(props.authors).map((author) => metaTag("property", "article:author", author)),
      ...each(props.tags).map((tag) => metaTag("property", "article:tag", tag)),
    ] : []),
  ].filter(Boolean));
}

/** The Twitter Card tags of a page: a large-image card when it has an image. */
export function twitterCardTags(props = {}) {
  const image = imagesOf(props)[0];
  return Object.freeze([
    metaTag("name", "twitter:card", props.card ?? (image ? "summary_large_image" : "summary")),
    metaTag("name", "twitter:title", props.title),
    metaTag("name", "twitter:description", props.description),
    metaTag("name", "twitter:image", image?.url),
    metaTag("name", "twitter:image:alt", image?.alt),
    metaTag("name", "twitter:site", props.twitterSite),
    metaTag("name", "twitter:creator", props.twitterCreator),
  ].filter(Boolean));
}

/** Open Graph then Twitter Card tags, one per line. */
export function socialMetaTags(props = {}) {
  return [...openGraphTags(props), ...twitterCardTags(props)].join("\n");
}

/** Which social-metadata property a claim's predicate fills (for `foldClaims`). */
export const META_PREDICATE_MAP = Object.freeze({
  title: { field: "title" }, headline: { field: "title" }, name: { field: "title" },
  description: { field: "description" }, summary: { field: "description" }, excerpt: { field: "description" },
  url: { field: "url" }, permalink: { field: "url" },
  image: { field: "images", repeatable: true }, photo: { field: "images", repeatable: true },
  published: { field: "publishedTime" }, datePublished: { field: "publishedTime" }, date: { field: "publishedTime" },
  modified: { field: "modifiedTime" }, dateModified: { field: "modifiedTime" }, updated: { field: "modifiedTime" },
  author: { field: "authors", repeatable: true },
  tag: { field: "tags", repeatable: true }, tags: { field: "tags", repeatable: true }, category: { field: "tags", repeatable: true },
  keyword: { field: "tags", repeatable: true }, keywords: { field: "tags", repeatable: true },
  siteName: { field: "siteName" }, site: { field: "twitterSite" }, creator: { field: "twitterCreator" },
});

const prune = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)));

/** A W3C web app manifest from `{ name, shortName, description, id, startUrl, scope, display, orientation, themeColor,
 *  backgroundColor, lang, dir, categories, icons, screenshots }` (name required). */
export function webAppManifest(manifest) {
  if (!manifest?.name) throw new TypeError("manifest.name is required");
  for (const [index, icon] of (manifest.icons ?? []).entries()) if (!icon.src) throw new TypeError(`manifest.icons[${index}].src is required`);
  for (const [index, shot] of (manifest.screenshots ?? []).entries()) if (!shot.src) throw new TypeError(`manifest.screenshots[${index}].src is required`);
  return prune({
    name: manifest.name, short_name: manifest.shortName, description: manifest.description, id: manifest.id,
    start_url: manifest.startUrl ?? "/", scope: manifest.scope, display: manifest.display ?? "standalone", orientation: manifest.orientation,
    theme_color: manifest.themeColor, background_color: manifest.backgroundColor, lang: manifest.lang, dir: manifest.dir, categories: manifest.categories,
    icons: manifest.icons?.map((icon) => prune({ src: icon.src, sizes: icon.sizes, type: icon.type, purpose: icon.purpose })),
    screenshots: manifest.screenshots?.map((shot) => prune({ src: shot.src, sizes: shot.sizes, type: shot.type, form_factor: shot.formFactor, label: shot.label })),
  });
}

/** The `<link rel="manifest">` element. */
export function webAppManifestLink(path = "/site.webmanifest") {
  return `<link rel="manifest" href="${escapeAttr(path)}">`;
}

function asJsonLdNode(value) {
  return value;
}

/** The one canonical-URL derivation for an Article: explicit option, then Article properties, then baseUrl+slug. */
export function articleUrl(article, options = {}) {
  return firstNonEmpty(
    options.url,
    article.url,
    article.canonicalUrl,
    article.koios?.original_permalink,
    options.baseUrl === undefined ? undefined : `${options.baseUrl.replace(/\/+$/, "")}/${article.slug.replace(/^\/+/, "")}`,
  );
}

/** The one canonical description derivation for an Article. */
export function articleDescription(article) {
  return firstNonEmpty(article.metaDescription, article.description, article.excerpt, article.summary, article.koios?.tweet);
}

const ARTICLE_SCHEMA_KEYS = new Set(Object.keys(ArticleSchema.properties));

/**
 * Callers (e.g. digital-garden/professional-blog) hold article content records that
 * extend Article with extra website-build properties (`permalink`, `outputPath`, ...)
 * the strict `ArticleSchema` (`additionalProperties: false`) rejects. Narrow
 * to exactly the schema's own keys before handing the value to the
 * schema-org codec, rather than requiring every caller to know and strip
 * its own extra properties.
 */
function narrowToArticleSchema(article) {
  const narrowed = {};
  for (const [key, value] of Object.entries(article)) {
    if (ARTICLE_SCHEMA_KEYS.has(key)) narrowed[key] = value;
  }
  return narrowed;
}

/** Derive the full head-block metadata algebra for one admitted Article. */
export function articleHeadMetadata(article, options = {}) {
  const description = articleDescription(article);
  const url = articleUrl(article, options);

  const social = { type: "article", title: article.title, description, url, siteName: options.websiteName, image: options.image,
    publishedTime: article.date, modifiedTime: article.updated, authors: article.author, tags: article.tags,
    twitterSite: options.twitterAccount, twitterCreator: options.twitterCreator };

  const schemaArticle = narrowToArticleSchema(article);
  const articleNode = asJsonLdNode(
    options.newsArticle ? articleToNewsArticleJsonLd(schemaArticle) : articleToArticleJsonLd(schemaArticle, url === undefined ? {} : { url }),
  );
  const websiteUrl = options.websiteUrl ?? url;
  const websiteNode = options.websiteName === undefined || websiteUrl === undefined ? undefined : asJsonLdNode(websiteContextToWebSiteJsonLd({
    websiteUrl,
    title: options.websiteName,
    websiteName: options.websiteName,
  }));
  const crumbsNode = options.routePath === undefined ? undefined : asJsonLdNode(
    breadcrumbJsonLd(options.routePath, { websiteUrl: websiteUrl ?? "/", rootName: options.websiteName ?? "Home" }),
  );

  const nodes = [articleNode, websiteNode, crumbsNode].filter((node) => node !== undefined);
  const jsonLd = nodes.length === 0 ? undefined : nodes.length === 1 ? nodes[0] : asJsonLdNode(entityGraphJsonLd(nodes));

  return Object.freeze({
    description,
    url,
    canonicalTag: url === undefined ? undefined : `<link rel="canonical" href="${escapeAttr(url)}">`,
    openGraphTags: openGraphTags(social),
    twitterTags: twitterCardTags(social),
    jsonLd,
    jsonLdScript: jsonLd === undefined ? "" : renderJsonLdScript(jsonLd),
  });
}

/** Join the head-block metadata algebra's faces into head-ready markup, one tag per line. */
export function renderArticleHeadMetadata(metadata) {
  return [
    metadata.canonicalTag,
    ...metadata.openGraphTags,
    ...metadata.twitterTags,
    metadata.jsonLdScript === "" ? undefined : metadata.jsonLdScript,
  ].filter((tag) => tag !== undefined).join("\n");
}
