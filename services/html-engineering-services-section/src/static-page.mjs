/**
 * static-page - profile-fiber HTML for a static page.
 *
 * Page renderers provide body presentation nodes and head fragments; this module
 * admits them through the HTML document render's carrier and profile fiber.
 */
import { htmlCarrierOf, buildHtmlDocumentPlan, renderHtmlDocument } from "./html-document-render.mjs";
import { escapeAttr, escapeText } from "@red-cup-engineering/html-structural-projection-service";
import { renderHtmlNode } from "@red-cup-engineering/html-structural-projection-service/document-nodes";

/** A static page completes by a cascade that settles at a finite stage: the strict regime. */
const STATIC_HTML_COMPLETION = "strict";

const staticWebsiteHtmlProfile = Object.freeze({
  kind: "rendering.profile",
  name: "metroplat-static-site-html",
  allowedElements: Object.freeze([
    "a",
    "article",
    "div",
    "h1",
    "h2",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "span",
    "time",
    "ul",
  ]),
  allowedStyleBehavior: Object.freeze(["static"]),
  allowedCompletionRegimes: Object.freeze([STATIC_HTML_COMPLETION]),
  obligations: Object.freeze(["same-content-record", "markdown-html-boundary", "no-sidecar-renderer"]),
  preservationLaws: Object.freeze([
    "preserve-addresses",
    "preserve-order",
    "preserve-references",
    "preserve-valuation-sites",
    "carrier-not-document",
    "css-settles",
  ]),
});

export function staticWebsiteBodyAttributes(
  options = {},
) {
  return Object.freeze({
    class: "metroplat-themed-page",
    "data-metroplat-lens": options.lens ?? "static-site",
    "data-metroplat-locus": options.locus ?? "page",
    "data-metroplat-profile": options.profile ?? staticWebsiteHtmlProfile.name,
  });
}

/** A static page's document: one address, which is its own valuation site. */
function staticDocument(address) {
  return Object.freeze({
    kind: "static-page.document",
    addresses: Object.freeze([Object.freeze({ key: address })]),
    order: Object.freeze([]),
    references: Object.freeze([]),
    valuationSites: Object.freeze([Object.freeze({ address })]),
  });
}

function headFragment(child) {
  if (child === null || child === undefined || child === false) return null;
  return typeof child === "string" ? escapeText(child) : renderHtmlNode(child);
}

function headFragments(children) {
  return Object.freeze((children ?? []).flatMap((child) => {
    const rendered = headFragment(child);
    return rendered === null ? [] : [rendered];
  }));
}

function completeStaticDocument(
  html,
  head,
  bodyAttributes,
) {
  const withHead = head.length === 0
    ? html
    : html.replace("</head>", `${head.join("\n")}\n</head>`);
  if (bodyAttributes === undefined || Object.keys(bodyAttributes).length === 0) return withHead;
  const attributes = Object.entries(bodyAttributes)
    .map(([name, value]) => ` ${escapeAttr(name)}="${escapeAttr(value)}"`)
    .join("");
  return withHead.replace("<body>", `<body${attributes}>`);
}

/** Render a static site page through the shared HTML presentation/profile fiber. */
export function renderStaticWebsiteHtmlPresentation(input) {
  if (typeof input.token !== "string" || input.token === "") {
    throw new TypeError("renderStaticWebsiteHtmlPresentation: a page needs a token to address it");
  }
  const address = input.token;
  const document = staticDocument(address);
  const valuationSite = address;
  const nodes = Object.freeze(input.nodes.map((node) => Object.freeze({
    ...node,
    kind: "rendering.htmlCarrier.node",
    semanticAddress: address,
    valuationSite,
  })));
  const carrier = htmlCarrierOf(document, nodes);
  if (carrier.kind !== "rendering.htmlCarrier") {
    throw new TypeError(`renderStaticWebsiteHtmlPresentation: carrier obstructed: ${carrier.reason}:${carrier.key}`);
  }
  const system = Object.freeze({
    kind: "rendering.css.system",
    carrier,
    declarations: Object.freeze([]),
  });
  const fiber = buildHtmlDocumentPlan(staticWebsiteHtmlProfile, carrier, system, "static");
  if (fiber.kind !== "rendering.profile_forms_render_fiber:witness") {
    throw new TypeError(`renderStaticWebsiteHtmlPresentation: profile obstructed: ${fiber.reason}:${fiber.key}`);
  }
  const rendered = renderHtmlDocument(fiber, {
    title: input.title,
    roots: input.roots,
    metadata: Object.freeze({ "render-domain": "metroplat.static-website" }),
    ...(input.lang === undefined ? {} : { lang: input.lang }),
  }).html;
  return completeStaticDocument(rendered, headFragments(input.head), input.bodyAttributes);
}
