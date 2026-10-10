/**
 * codecs/text/json/schema-org - schema.org JSON-LD projections.
 *
 * This codec reads package content records into schema.org boundary material without
 * fetching, writing, or enriching from outside those records.
 *
 * @packageDocumentation
 */
import { articleContract } from "@red-cup-engineering/computer-article-engineering-services-section/article";
import { pageContract } from "@red-cup-engineering/computer-article-engineering-services-section/page";

export const SCHEMA_ORG_CONTEXT = "https://schema.org";
export const ARTICLE_TYPE = "Article";
export const BLOG_POSTING_TYPE = "BlogPosting";
export const NEWS_ARTICLE_TYPE = "NewsArticle";
export const WEB_PAGE_TYPE = "WebPage";
export const WEB_SITE_TYPE = "WebSite";
export const ORGANIZATION_TYPE = "Organization";
export const COLLECTION_PAGE_TYPE = "CollectionPage";
export const BREADCRUMB_LIST_TYPE = "BreadcrumbList";

function clean(value) {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function firstText(values, fallback) {
  return values.map(clean).find((value) => value !== undefined) ?? fallback;
}

function uniqueText(values) {
  return Object.freeze([...new Set(values.map(clean).filter((value) => value !== undefined))]);
}

function articleUrl(article) {
  return clean(article.url) ?? clean(article.canonicalUrl) ?? clean(article.koios?.original_permalink);
}

function citations(article) {
  return uniqueText([
    ...(article.references ?? []).map((reference) => reference.URL),
    ...(article.citations ?? []).map((reference) => reference.URL),
    ...(article.sources ?? []).map((source) => source.url),
  ]);
}

function articleSection(article) {
  return clean(firstText([
    article.section,
    article.beat,
    article.koios?.beat,
    article.categories?.[0],
  ], ""));
}

function articleJsonLdBase(article, opts) {
  const admitted = articleContract.assert(article, "article");
  const headline = firstText([admitted.koios?.headline, admitted.title], admitted.title);
  const url = clean(opts.url) ?? articleUrl(admitted);
  const citation = citations(admitted);
  const id = clean(opts.id);
  const authorId = clean(opts.authorId);
  const keywords = uniqueText([
    ...(admitted.keywords ?? []),
    ...(admitted.tags ?? []),
    ...(admitted.categories ?? []),
    admitted.seoTerm,
    admitted.koios?.seo_term,
  ]);
  const section = articleSection(admitted);

  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    ...(id === undefined ? {} : { "@id": id }),
    ...(url === undefined ? {} : { url, mainEntityOfPage: url }),
    headline,
    name: headline,
    datePublished: admitted.date,
    dateModified: admitted.updated ?? admitted.date,
    author: Object.freeze({
      ...(authorId === undefined ? {} : { "@id": authorId }),
      "@type": "Person",
      name: admitted.author,
    }),
    ...(section === undefined ? {} : { articleSection: section }),
    keywords: keywords.length === 0 ? Object.freeze([headline]) : keywords,
    description: firstText([
      admitted.metaDescription,
      admitted.description,
      admitted.excerpt,
      admitted.summary,
      admitted.koios?.tweet,
    ], headline),
    articleBody: admitted.body,
    ...(opts.termRefs === undefined || opts.termRefs.length === 0 ? {} : { about: Object.freeze([...opts.termRefs]) }),
    ...(citation.length === 0 ? {} : { citation }),
    ...(admitted.license_url === undefined ? {} : { license: admitted.license_url }),
    isAccessibleForFree: true,
  });
}

/** Project an Article content record to generic schema.org Article or BlogPosting JSON-LD. */
export function articleToArticleJsonLd(article, opts = {}) {
  return Object.freeze({
    ...articleJsonLdBase(article, opts),
    "@type": opts.type ?? ARTICLE_TYPE,
  });
}

/** Project an Article content record to schema.org NewsArticle JSON-LD. */
export function articleToNewsArticleJsonLd(article) {
  const admitted = articleContract.assert(article, "article");
  const news = articleJsonLdBase(admitted, {});
  return Object.freeze({
    ...news,
    "@type": NEWS_ARTICLE_TYPE,
    articleSection: news.articleSection ?? "News",
  });
}

/** Project a Page content record to schema.org WebPage JSON-LD. */
export function pageToWebPageJsonLd(page, opts = {}) {
  const admitted = pageContract.assert(page, "page");
  const id = clean(opts.id);
  const url = clean(opts.url) ?? clean(admitted.url);
  const authorId = clean(opts.authorId);
  const authorName = clean(opts.authorName);
  const description = clean(opts.description);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": WEB_PAGE_TYPE,
    ...(id === undefined ? {} : { "@id": id }),
    ...(url === undefined ? {} : { url }),
    name: admitted.title,
    headline: admitted.title,
    ...(admitted.date === undefined ? {} : { datePublished: admitted.date }),
    ...(authorName === undefined ? {} : {
      author: Object.freeze({
        ...(authorId === undefined ? {} : { "@id": authorId }),
        "@type": "Person",
        name: authorName,
      }),
    }),
    ...(description === undefined ? {} : { description }),
  });
}

/** Project website/publication context to a schema.org Organization node. */
export function websiteContextToOrganizationJsonLd(websiteContext) {
  const root = canonicalRoot(websiteContext.websiteUrl);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": ORGANIZATION_TYPE,
    "@id": clean(websiteContext.organizationId) ?? `${root}#organization`,
    name: firstText([websiteContext.author, websiteContext.websiteName, websiteContext.title], websiteContext.title),
    url: root,
  });
}

/** Project website/publication context to a schema.org WebSite node with an Organization publisher. */
export function websiteContextToWebSiteJsonLd(websiteContext) {
  const root = canonicalRoot(websiteContext.websiteUrl);
  return webSite({
    id: clean(websiteContext.websiteId) ?? `${root}#website`,
    url: root,
    name: websiteContext.websiteName ?? websiteContext.title,
    description: clean(websiteContext.description),
    inLanguage: clean(websiteContext.language),
    publisher: websiteContextToOrganizationJsonLd(websiteContext),
  });
}

/** Project a taxonomy term route to schema.org CollectionPage JSON-LD. */
export function termToCollectionPageJsonLd(term) {
  const url = canonicalUrl(term.url);
  const termId = clean(term.termId) ?? `${url}#term`;
  const pageId = clean(term.id) ?? `${url}#collection`;
  const title = clean(term.title) ?? `${term.term} (${term.dimension ?? "term"})`;
  const description = clean(term.description);
  const websiteId = clean(term.websiteId);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": COLLECTION_PAGE_TYPE,
    "@id": pageId,
    url,
    name: title,
    ...(description === undefined ? {} : { description }),
    about: Object.freeze({
      "@id": termId,
      "@type": "Thing",
      name: term.term,
    }),
    ...(websiteId === undefined ? {} : { isPartOf: Object.freeze({ "@id": websiteId }) }),
    ...(term.itemUrls === undefined ? {} : {
      mainEntity: Object.freeze({
        "@type": "ItemList",
        itemListElement: Object.freeze(term.itemUrls.map((itemUrl, index) => Object.freeze({
          "@type": "ListItem",
          position: index + 1,
          url: itemUrl,
        }))),
      }),
    }),
  });
}

/** Project a taxonomy term to the graph node linked by articles and its CollectionPage. */
export function termToThingJsonLd(term) {
  const page = termToCollectionPageJsonLd(term);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@id": page.about["@id"],
    "@type": "Thing",
    name: term.term,
    subjectOf: Object.freeze({ "@id": page["@id"] }),
  });
}

/** Project a route path to a schema.org BreadcrumbList JSON-LD node. */
export function breadcrumbJsonLd(routePath, opts = {}) {
  const id = clean(opts.id);
  const cleanPath = routePath.replace(/\\/gu, "/").replace(/^\/+|\/+$/gu, "").replace(/\/index\.html$/u, "");
  const segments = cleanPath === "" ? [] : cleanPath.split("/").filter(Boolean);
  const rootName = clean(opts.rootName) ?? "Home";
  const crumbs = [{ label: rootName, path: "" }, ...segments.map((segment, index) => ({
    label: opts.names?.[segment] ?? labelForSegment(segment),
    path: segments.slice(0, index + 1).join("/"),
  }))];
  const root = opts.websiteUrl === undefined ? undefined : canonicalRoot(opts.websiteUrl);
  return breadcrumbList(crumbs.map((crumb) => ({ name: crumb.label, ...(root === undefined ? {} : { url: crumb.path === "" ? root : `${root}${crumb.path}/` }) })), { ...(id === undefined ? {} : { id }) });
}

/** A schema.org BreadcrumbList from named crumbs (`{ name, url? }`), in order; unnamed crumbs are skipped. */
export function breadcrumbList(crumbs = [], opts = {}) {
  const named = crumbs.filter((crumb) => crumb?.name);
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": BREADCRUMB_LIST_TYPE,
    ...(opts.id === undefined ? {} : { "@id": opts.id }),
    itemListElement: Object.freeze(named.map((crumb, index) => prune({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.url }))),
  });
}

/** Wrap schema.org nodes in a single JSON-LD @graph document. */
export function entityGraphJsonLd(nodes) {
  return Object.freeze({
    "@context": SCHEMA_ORG_CONTEXT,
    "@graph": Object.freeze(nodes.map(withoutContext)),
  });
}

/** JSON text made safe inside a script element: no `<`, `>` or `&`, and no line or paragraph separators. */
export function escapeScriptJson(text) {
  return text.replace(/</gu, "\\u003c").replace(/>/gu, "\\u003e").replace(/&/gu, "\\u0026").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
}

/** Render JSON-LD (one node or an array of them) as a head-safe script element; `indent` defaults to 2. */
export function renderJsonLdScript(jsonLd, indent = 2) {
  if (jsonLd === undefined || jsonLd === null) return "";
  return `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(jsonLd, null, indent))}</script>`;
}

// — generic nodes —

function prune(object) {
  return Object.freeze(Object.fromEntries(Object.entries(object).filter(([, value]) =>
    value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0))));
}

function oneOrList(value) {
  if (value === undefined || value === null) return undefined;
  const values = (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== "");
  return values.length === 0 ? undefined : values.length === 1 ? values[0] : Object.freeze(values);
}

function imageObject(value) {
  return typeof value === "string" ? Object.freeze({ "@type": "ImageObject", url: value }) : value;
}

/** A schema.org Person from a name or `{ name, url, image, email, sameAs }`. */
export function person(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return prune({ "@type": "Person", name: value });
  return prune({ "@type": "Person", name: value.name, url: value.url, image: value.image, email: value.email, sameAs: oneOrList(value.sameAs) });
}

/** A schema.org Organization (or `type`, such as NewsMediaOrganization) from a name or `{ name, url, logo, sameAs }`. */
export function organization(value, opts = {}) {
  if (value === undefined || value === null) return undefined;
  const type = opts.type ?? ORGANIZATION_TYPE;
  if (typeof value === "string") return prune({ "@type": type, name: value });
  return prune({ ...(opts.context ? { "@context": SCHEMA_ORG_CONTEXT } : {}), "@type": type, "@id": value.id, name: value.name, url: value.url,
    logo: value.logo === undefined ? undefined : imageObject(value.logo), sameAs: oneOrList(value.sameAs) });
}

function authorEntity(value) {
  return value?.type === "Organization" ? organization(value) : person(value);
}

/** A schema.org CreativeWork of `type` (Article by default: BlogPosting, NewsArticle, ScholarlyArticle, ...) from plain properties. */
export function creativeWork(props = {}) {
  const page = props.mainEntityOfPage ?? props.url;
  return prune({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": props.type ?? ARTICLE_TYPE,
    "@id": props.id ?? props.url,
    url: props.url,
    headline: props.headline,
    name: props.headline,
    description: props.description,
    mainEntityOfPage: page ? { "@type": WEB_PAGE_TYPE, "@id": page } : undefined,
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    inLanguage: props.inLanguage,
    author: props.author === undefined ? undefined : Array.isArray(props.author) ? props.author.map(authorEntity) : authorEntity(props.author),
    publisher: props.publisher === undefined ? undefined : organization(props.publisher),
    image: oneOrList(props.image),
    articleSection: props.articleSection,
    keywords: oneOrList(props.keywords),
    isPartOf: props.isPartOf,
  });
}

/** A schema.org WebSite, with a SearchAction when `searchUrl` (a URL template over search_term_string) is given. */
export function webSite(props = {}) {
  return prune({
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": WEB_SITE_TYPE,
    "@id": props.id,
    name: props.name,
    url: props.url,
    description: props.description,
    inLanguage: props.inLanguage,
    publisher: props.publisher,
    potentialAction: props.searchUrl ? {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: props.searchUrl },
      "query-input": "required name=search_term_string",
    } : undefined,
  });
}

// — notes as schema.org —

const NOTE_SCHEMA_TYPES = Object.freeze({
  article: "Article", note: "Article", text: "Article", letter: "Message", babble: "BlogPosting",
  term: "DefinedTerm", definition: "DefinedTerm", concept: "DefinedTerm", "glossary-term": "DefinedTerm", "glossary-topic": "DefinedTermSet",
  lesson: "LearningResource", skill: "HowTo", question: "Question",
  theorem: "ScholarlyArticle", proof: "ScholarlyArticle", lemma: "ScholarlyArticle", corollary: "ScholarlyArticle", axiom: "ScholarlyArticle",
  conjecture: "ScholarlyArticle", proposition: "ScholarlyArticle", claim: "ScholarlyArticle", argument: "ScholarlyArticle",
  objection: "ScholarlyArticle", position: "ScholarlyArticle", response: "ScholarlyArticle", paper: "ScholarlyArticle",
  chapter: "Chapter", record: "CreativeWork", index: "CollectionPage", topic: "CollectionPage", page: "WebPage",
});

/** The schema.org type a note of this house `type` is, CreativeWork when the type is unknown. */
export function schemaTypeOfNote(type) {
  return NOTE_SCHEMA_TYPES[String(type ?? "").toLowerCase()] ?? "CreativeWork";
}

/** The SKOS core namespace. */
export const SKOS_NAMESPACE = "http://www.w3.org/2004/02/skos/core#";

function iriNodes(value) {
  return oneOrList((Array.isArray(value) ? value : [value]).filter((iri) => typeof iri === "string" && iri !== "").map((iri) => Object.freeze({ "@id": iri })));
}

/** A term as a schema.org DefinedTerm that is also a SKOS concept: preferred and alternate labels, its definition and
 *  (when it has one apart from the definition) a short description, its codes as `termCode` and `skos:notation`, the
 *  set it is in as `inDefinedTermSet` and `skos:inScheme`, and broader, narrower and related concepts. `id` names the
 *  concept and defaults to `url`, the page that presents it; every concept reference is an `@id` node, so it expands
 *  to an IRI rather than a string literal. */
export function definedTermJsonLd(term) {
  return prune({
    "@context": [SCHEMA_ORG_CONTEXT, { skos: SKOS_NAMESPACE }],
    "@id": term.id ?? term.url,
    "@type": ["DefinedTerm", "skos:Concept"],
    url: term.url,
    name: term.name,
    "skos:prefLabel": term.name,
    "skos:altLabel": oneOrList(term.aliases),
    description: term.description ?? term.definition,
    "skos:definition": term.definition,
    termCode: oneOrList(term.codes),
    "skos:notation": oneOrList(term.codes),
    inDefinedTermSet: iriNodes(term.set),
    "skos:inScheme": iriNodes(term.set),
    "skos:broader": iriNodes(term.broader),
    "skos:narrower": iriNodes(term.narrower),
    "skos:related": iriNodes(term.related),
  });
}

/** A concept scheme as a schema.org DefinedTermSet that is also a SKOS concept scheme. */
export function definedTermSetJsonLd(set) {
  return prune({
    "@context": [SCHEMA_ORG_CONTEXT, { skos: SKOS_NAMESPACE }],
    "@id": set.id ?? set.url,
    "@type": ["DefinedTermSet", "skos:ConceptScheme"],
    url: set.url,
    name: set.name,
    "skos:prefLabel": set.name,
    description: set.description,
    "skos:notation": oneOrList(set.codes),
  });
}

// — claims as properties —

/** Which schema.org property a claim's predicate fills, and whether it repeats. */
export const SCHEMA_PREDICATE_MAP = Object.freeze({
  headline: { field: "headline" }, title: { field: "headline" }, name: { field: "headline" },
  description: { field: "description" }, summary: { field: "description" }, excerpt: { field: "description" },
  url: { field: "url" }, permalink: { field: "url" },
  datePublished: { field: "datePublished" }, published: { field: "datePublished" }, date: { field: "datePublished" },
  dateModified: { field: "dateModified" }, updated: { field: "dateModified" }, modified: { field: "dateModified" },
  author: { field: "author" }, publisher: { field: "publisher" },
  image: { field: "image", repeatable: true }, photo: { field: "image", repeatable: true },
  keywords: { field: "keywords", repeatable: true }, keyword: { field: "keywords", repeatable: true },
  tag: { field: "keywords", repeatable: true }, tags: { field: "keywords", repeatable: true }, category: { field: "keywords", repeatable: true },
});

/** Fold (predicate, object) claims into properties by a predicate map (the first value of a single field wins last). */
export function foldClaims(claims, map = SCHEMA_PREDICATE_MAP) {
  const props = {};
  for (const { predicate, object } of claims) {
    const rule = map[predicate];
    if (!rule || object === undefined || object === null || object === "") continue;
    if (rule.repeatable) {
      const prior = props[rule.field];
      props[rule.field] = [...(Array.isArray(prior) ? prior : prior === undefined ? [] : [prior]), object];
    } else props[rule.field] = object;
  }
  return props;
}

function withoutContext(node) {
  const { "@context": _context, ...rest } = node;
  return Object.freeze(rest);
}

function canonicalRoot(value) {
  return canonicalUrl(value).replace(/\/?$/u, "/");
}

function canonicalUrl(value) {
  return new URL(value).toString();
}

function labelForSegment(segment) {
  return decodeURIComponent(segment)
    .replace(/\.[^.]+$/u, "")
    .replace(/[-_]+/gu, " ")
    .replace(/\b[a-z]/gu, (letter) => letter.toUpperCase());
}
