/**
 * html-document-render-service — the carrier/document-render engine: admits
 * HTML as a carrier covering the caller's document spine, selects the
 * valid document plan of carrier/CSS-system pairs for a render profile, and
 * serializes the result to a complete HTML document string.
 *
 * Extracted from @red-cup-engineering/html-structural-projection-service (src/html/index.mts),
 * which now re-exports this surface unchanged. Depends on
 * @red-cup-engineering/css-services-section by package name for the CSS system
 * and valuation it renders.
 */
import {
  checkStyleResolutionSettled,
  checkClassMapsValid,
  completionRegimeOf,
  classByNodeId,
  cssTextFromResolvedStyles,
  firstDuplicate,
  nodeIdSet,
} from "@red-cup-engineering/css-services-section/css-style-resolution";
import { canonical } from "@red-cup-engineering/json-services-section";

import { escapeHtmlTextValue as escapeXmlText, escapeHtmlAttributeValue as escapeXmlAttr } from "@red-cup-engineering/html-structural-projection-service/lexical";

const REF_PREFIX = "shp-ref:";

function isRef(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && "ref" in value;
}

function unmark(value) {
  if (isRef(value)) return value;
  return value !== null && typeof value === "object" && "const" in value
    ? value.const
    : value;
}

function htmlText(value) {
  if (isRef(value)) return `${REF_PREFIX}${value.ref}`;
  const unmarked = unmark(value);
  return unmarked !== null && typeof unmarked === "object" ? canonical(unmarked) : String(unmarked);
}

/** Escape a value for HTML text content (`&`, `<`, `>`). */
function escapeText(value) { return escapeXmlText(htmlText(value)); }
function escapeAttr(value) { return escapeXmlAttr(htmlText(value)); }

/* ── carrier ────────────────────────────────────────────────────────────── */

const addressSet = (nodes) => new Set(nodes.map((node) => node.semanticAddress));

const carrierObstruction = (reason, key) =>
  Object.freeze({ kind: "rendering.htmlCarrier-obstruction", reason, key });

/** Verify carrier coverage of the caller's document addresses, edges, and valuation sites. */
export function htmlCarrierOf(
  document,
  nodes,
) {
  const duplicate = firstDuplicate(nodes.map((node) => node.nodeId));
  if (duplicate !== undefined) return carrierObstruction("duplicate-node", duplicate);
  const addresses = addressSet(nodes);
  for (const address of document.addresses) {
    if (!addresses.has(address.key)) return carrierObstruction("missing-address", address.key);
  }
  for (const edge of document.order) {
    if (!addresses.has(edge.before) || !addresses.has(edge.after)) {
      return carrierObstruction("missing-order", `${edge.before}->${edge.after}`);
    }
  }
  for (const reference of document.references) {
    if (!addresses.has(reference.from) || !addresses.has(reference.to)) {
      return carrierObstruction("missing-reference", `${reference.from}->${reference.to}`);
    }
  }
  const valuationSites = new Set(nodes.map((node) => node.valuationSite ?? node.semanticAddress));
  for (const site of document.valuationSites) {
    if (!valuationSites.has(site.address)) return carrierObstruction("missing-valuation-site", site.address);
  }
  return Object.freeze({
    kind: "rendering.htmlCarrier",
    document,
    nodes: Object.freeze([...nodes]),
    carriedAddresses: document.addresses,
    carriedOrder: document.order,
    carriedReferences: document.references,
    carriedValuationSites: document.valuationSites,
    carrierNotDocument: Object.freeze({
      kind: "settledDocument.html_is_carrier_not_document:witness",
      documentKind: document.kind,
      carrierKind: "rendering.htmlCarrier",
      distinct: true,
    }),
  });
}

/* ── render profile / document plan ──────────────────────────────────────── */

const requiredLaws = Object.freeze([
  "preserve-addresses",
  "preserve-order",
  "preserve-references",
  "preserve-valuation-sites",
  "carrier-not-document",
  "css-settles",
]);

const renderFiberObstruction = (
  reason,
  key,
) => Object.freeze({ kind: "rendering.profile_forms_render_fiber-obstruction", reason, key });

/** A profile selects the valid document plan of carrier/CSS-system pairs for a use regime. */
export function buildHtmlDocumentPlan(
  profile,
  carrier,
  system,
  styleBehavior,
) {
  if (system.carrier !== carrier) return renderFiberObstruction("carrier-system-mismatch", system.carrier.kind);
  const allowedElements = new Set(profile.allowedElements);
  for (const node of carrier.nodes) {
    if (!allowedElements.has(node.element)) return renderFiberObstruction("element-not-allowed", node.element);
  }
  if (!profile.allowedStyleBehavior.includes(styleBehavior)) {
    return renderFiberObstruction("style-behavior-not-allowed", styleBehavior);
  }
  const completionRegime = completionRegimeOf(system);
  if (!profile.allowedCompletionRegimes.includes(completionRegime)) {
    return renderFiberObstruction("completion-regime-not-allowed", completionRegime);
  }
  for (const law of requiredLaws) {
    if (!profile.preservationLaws.includes(law)) return renderFiberObstruction("missing-preservation-law", law);
  }
  if (system.classFactorMap !== undefined) {
    const carrierNodes = nodeIdSet(carrier.nodes);
    for (const nodeId of system.classFactorMap.nodeIds) {
      if (!carrierNodes.has(nodeId)) return renderFiberObstruction("class-factor-map-carrier-mismatch", nodeId);
    }
    const factor = checkClassMapsValid(system.classFactorMap);
    if (factor.kind !== "rendering.css_classes_are_factor_maps:witness") {
      return renderFiberObstruction("class-factor-map-obstructed", factor.reason);
    }
  }
  const cssSettled = checkStyleResolutionSettled(system);
  return Object.freeze({
    kind: "rendering.profile_forms_render_fiber:witness",
    fiber: Object.freeze({
      kind: "rendering.profile.fiber",
      profile,
      carrier,
      system,
      valuation: cssSettled.valuation,
      styleBehavior,
    }),
    cssSettled,
    carrierPreservesDocument: true,
    profileConstrainsFiber: true,
  });
}

/* ── projector ──────────────────────────────────────────────────────────── */

const renderHtmlAttr = ([key, value]) =>
  value === "" ? ` ${key}` : ` ${key}="${escapeAttr(value)}"`;

function renderCarrierNode(
  node,
  byId,
  classNames,
  seen,
) {
  if (seen.has(node.nodeId)) throw new TypeError(`renderHtmlDocument: cyclic carrier node ${node.nodeId}`);
  const nextSeen = new Set(seen);
  nextSeen.add(node.nodeId);
  const className = classNames.get(node.nodeId);
  const ownClass = node.attributes?.class;
  const attributes = {
    ...(node.attributes ?? {}),
    "data-render-node": node.nodeId,
    ...(className === undefined
      ? {}
      : { class: ownClass === undefined || ownClass === "" ? className : `${ownClass} ${className}` }),
  };
  const body = `${node.text === undefined ? "" : escapeText(node.text)}${node.html ?? ""}${(node.children ?? []).map((childId) => {
    const child = byId.get(childId);
    if (child === undefined) throw new TypeError(`renderHtmlDocument: missing child carrier node ${childId}`);
    return renderCarrierNode(child, byId, classNames, nextSeen);
  }).join("")}`;
  return `<${node.element}${Object.entries(attributes).map(renderHtmlAttr).join("")}>${body}</${node.element}>`;
}

function rootNodeIds(nodes, requested) {
  if (requested !== undefined) return requested;
  const childIds = new Set(nodes.flatMap((node) => node.children ?? []));
  return Object.freeze(nodes.filter((node) => !childIds.has(node.nodeId)).map((node) => node.nodeId));
}

/** Serialize the single admitted render codomain: a document plan over an HTML carrier and settled CSS valuation. */
export function renderHtmlDocument(
  fiber,
  options = {},
) {
  const byId = new Map(fiber.fiber.carrier.nodes.map((node) => [node.nodeId, node]));
  const roots = rootNodeIds(fiber.fiber.carrier.nodes, options.roots);
  const classes = fiber.fiber.system.classFactorMap;
  const classNames = classByNodeId(classes);
  const body = roots.map((rootId) => {
    const root = byId.get(rootId);
    if (root === undefined) throw new TypeError(`renderHtmlDocument: missing root carrier node ${rootId}`);
    return renderCarrierNode(root, byId, classNames, new Set());
  }).join("\n");
  const metadata = Object.entries(options.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");
  const head = (options.head ?? []).map((fragment) => `    ${fragment}`).join("\n");
  const css = cssTextFromResolvedStyles(fiber.fiber.valuation, classes);
  const title = options.title ?? fiber.fiber.profile.name;
  const bodyAttributes = Object.entries(options.bodyAttributes ?? {}).map(renderHtmlAttr).join("");
  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(options.lang ?? "en")}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="render-profile" content="${escapeAttr(fiber.fiber.profile.name)}">${metadata ? "\n" + metadata : ""}
    <title>${escapeText(title)}</title>${head ? "\n" + head : ""}
    <style>${css}</style>
</head>
<body${bodyAttributes}>
${body}
</body>
</html>
`;
  return Object.freeze({
    kind: "rendering.htmlFiber.document",
    fiber,
    html,
  });
}
