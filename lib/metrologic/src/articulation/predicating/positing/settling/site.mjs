/**
 * site - local-to-global schema incidence law.
 *
 * A package operation surface can be read as a finite schema site: legs consume and
 * produce schema addresses, extrema are schemas at the boundary, and local
 * edges are exactly produced-schema/consumed-schema matches. This module owns
 * that incidence law without knowing actions, HTTP, MCP, registries, or routes.
 */

import { canonicalizeJson, canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { parseJsonPointer, resolveJsonPointerParts } from "@red-cup-engineering/json-services-section/resolve-json-pointer";

/** One schema object as a node in the package namespace site. */

export const siteBulkBoundarySchema = {
  $id: "metroplat/site/site-bulk-boundary",
  type: "object",
  required: ["id", "kind"],
  properties: {
    id: { type: "string" },
    kind: { enum: ["schema", "codec", "file", "protocol", "route", "evidence"] },
    address: { type: "string" },
    codec: { type: "string" },
    protocol: { type: "string" },
    method: { type: "string" },
    href: { type: "string" },
    description: { type: "string" },
  },
  additionalProperties: false,
  title: "SiteBulkBoundary",
  description: "One boundary of a site bulk: its kind and the address material it carries.",
};

export function schemaSiteLeg(spec) {
  return Object.freeze({
    id: spec.id,
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
  });
}

/** Read the schema address carried by a direct `$ref` or inline `$id` operation slot.
 * Richer schema structure remains schema data and does not become an
 * incidence edge merely because it contains nested references. */
export function schemaSlotRef(schema) {
  const ref = schema?.["$ref"];
  if (typeof ref === "string") return ref;
  const id = schema?.["$id"];
  return typeof id === "string" ? id : undefined;
}

const schemaMapKeywords = ["definitions", "properties", "patternProperties"];
const schemaSingleKeywords = ["additionalProperties", "propertyNames", "contains", "not", "if", "then", "else"];
const schemaArrayKeywords = ["allOf", "anyOf", "oneOf"];
const isSchema = (value) => typeof value === "boolean" || (value !== null && typeof value === "object" && !Array.isArray(value));
const pointerToken = (value) => value.replaceAll("~", "~0").replaceAll("/", "~1");
const compareCodeUnits = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const documentAddress = (value) => value.split("#", 1)[0];

/** Absolute URI bases follow URL resolution. Existing bare house identifiers
 * retain exact-name composition; they do not pretend to be absolute URIs. */
function schemaAddress(reference, base) {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(reference)) return reference;
  if (reference === "" || reference.startsWith("#")) return documentAddress(base) + reference;
  try { return new URL(reference, base).href; }
  catch { return reference; }
}

function schemaDialect(schema, inherited = "2020-12") {
  const declared = schema.$schema;
  if (declared === undefined) return inherited;
  if (declared === "https://json-schema.org/draft/2020-12/schema") return "2020-12";
  if (declared === "http://json-schema.org/draft-07/schema#" || declared === "https://json-schema.org/draft-07/schema#") return "draft-07";
  throw new TypeError(`schema reference incidence: unsupported JSON Schema dialect ${String(declared)}`);
}

function contractField(contract, key) {
  if (contract === null || typeof contract !== "object") throw new TypeError("schema reference incidence: expected a contract object");
  const descriptor = Object.getOwnPropertyDescriptor(contract, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new TypeError(`schema reference incidence: contract ${key} must be an own data property, not an accessor`);
  }
  return descriptor.value;
}

/** Register only equivalent declarations at an address. A collision cannot be
 * turned into lineage by choosing whichever schema happened to arrive last. */
function addSchemaAddress(index, address, entry) {
  const prior = index.get(address);
  if (prior === undefined) index.set(address, entry);
  else if (prior.dialect !== entry.dialect || (prior.schema !== entry.schema && canonicalJson(prior.schema) !== canonicalJson(entry.schema))) {
    throw new TypeError(`schema reference incidence: different schemas share address ${address}`);
  }
}

/** Index schema positions, resources and static anchors without entering
 * instance data such as const, enum, default, examples or unknown extensions. */
function schemaContractIndex(contract) {
  const id = contractField(contract, "id");
  if (typeof id !== "string" || id.length === 0) throw new TypeError("schema reference incidence: expected a nonempty contract id");
  const schema = canonicalizeJson(contractField(contract, "schema")).value;
  if (!isSchema(schema)) throw new TypeError(`schema reference incidence: ${id} is not an object or boolean schema`);
  const carried = contractField(contract, "references");
  if (!Array.isArray(carried)) throw new TypeError(`schema reference incidence: ${id} references must be an array`);
  const resources = new Map(), anchors = new Map(), positions = new Set(), references = [];
  const rootAddress = documentAddress(schemaAddress(id, ""));
  const rootDialect = typeof schema === "boolean" ? "2020-12" : schemaDialect(schema);
  addSchemaAddress(resources, rootAddress, { schema, location: "", positions, dialect: rootDialect });
  const pending = [{ schema, location: "", base: rootAddress, dialect: rootDialect, inspect: true }];
  while (pending.length > 0) {
    const current = pending.pop();
    const node = current.schema, location = current.location;
    positions.add(location);
    if (typeof node === "boolean") continue;
    let base = current.base, dialect = current.dialect;
    const ignoredDraft7Siblings = current.dialect === "draft-07" && typeof node.$ref === "string" && location !== "";
    if (current.inspect && !ignoredDraft7Siblings && node.$schema !== undefined) {
      const idFragment = typeof node.$id === "string" ? node.$id.indexOf("#") : -1;
      const resourceRoot = location === "" || (typeof node.$id === "string" && (idFragment < 0 || idFragment === node.$id.length - 1));
      if (!resourceRoot) throw new TypeError(`schema reference incidence: dialect declaration must occur at a resource root (${location})`);
      dialect = schemaDialect(node, dialect);
    }
    const referenceOnly = dialect === "draft-07" && typeof node.$ref === "string";
    if (current.inspect && !referenceOnly) {
      if (typeof node.$id === "string") {
        const address = schemaAddress(node.$id, base), hash = address.indexOf("#");
        if (hash >= 0 && hash < address.length - 1) {
          if (dialect !== "draft-07") throw new TypeError("schema reference incidence: 2020-12 $id must not contain a nonempty fragment");
          if (!/^#[A-Za-z][-A-Za-z0-9_:.]*$/u.test(node.$id)) {
            throw new TypeError(`schema reference incidence: unsupported Draft 7 $id fragment ${node.$id}`);
          }
          addSchemaAddress(anchors, address, { schema: node, location, positions, dialect });
        } else {
          base = documentAddress(address);
          addSchemaAddress(resources, base, { schema: node, location, positions, dialect });
        }
      }
      if (dialect === "2020-12") for (const keyword of ["$anchor", "$dynamicAnchor"]) {
        const anchor = node[keyword];
        if (typeof anchor === "string" && /^[A-Za-z_][-A-Za-z0-9._]*$/u.test(anchor)) {
          addSchemaAddress(anchors, `${base}#${anchor}`, { schema: node, location, positions, dialect });
        }
      }
    }
    if (current.inspect && typeof node.$ref === "string") references.push({ ref: node.$ref, location, base });
    // Ignored Draft 7 siblings cannot contribute operational edges, but their
    // schema positions remain explicitly addressable (e.g. #/definitions/X).
    const enqueue = (child, path) => {
      if (isSchema(child)) pending.push({ schema: child, location: path, base, dialect, inspect: current.inspect && !referenceOnly });
    };
    const mapKeywords = [...schemaMapKeywords, ...(dialect === "draft-07" ? ["dependencies"] : ["$defs", "dependentSchemas"])];
    for (const key of mapKeywords) {
      const map = node[key];
      if (map !== null && typeof map === "object" && !Array.isArray(map)) {
        for (const [name, child] of Object.entries(map)) enqueue(child, `${location}/${key}/${pointerToken(name)}`);
      }
    }
    const singleKeywords = [...schemaSingleKeywords, ...(dialect === "draft-07" ? ["additionalItems"] : ["unevaluatedProperties", "unevaluatedItems", "contentSchema"])];
    for (const key of singleKeywords) enqueue(node[key], `${location}/${key}`);
    const arrayKeywords = [...schemaArrayKeywords, ...(dialect === "2020-12" ? ["prefixItems"] : []), "items"];
    for (const key of arrayKeywords) {
      const value = node[key];
      if (Array.isArray(value) && (key !== "items" || dialect === "draft-07")) value.forEach((child, index) => enqueue(child, `${location}/${key}/${index}`));
      else if (key === "items") enqueue(value, `${location}/${key}`);
    }
  }
  return { id, resources, anchors, references, carried };
}

function resolvesSchemaReference(address, resources, anchors) {
  const hash = address.indexOf("#");
  const target = hash < 0 ? address : address.slice(0, hash);
  const resource = resources.get(target);
  if (resource === undefined) return false;
  const fragment = hash < 0 ? "#" : address.slice(hash);
  let decoded;
  try { decoded = decodeURIComponent(fragment.slice(1)); }
  catch { return false; }
  if (decoded !== "" && !decoded.startsWith("/")) return anchors.has(`${target}#${decoded}`);
  let parts;
  try { parts = parseJsonPointer(fragment); }
  catch { return false; }
  const path = resource.location + parts.map((part) => `/${pointerToken(part)}`).join("");
  return resource.positions.has(path) && resolveJsonPointerParts(resource.schema, parts) !== undefined;
}

/** Read source-bound `$ref` incidence in the supported schema positions. A
 * target must exist in the declaring resource or its explicitly carried
 * contracts, including actual fragments and embedded resource scopes. This is
 * finite static incidence, not instance validation, dynamic-reference
 * evaluation, a network resolver, or composition by ambient registry presence. */
export function schemaReferenceIncidence(contracts) {
  if (!Array.isArray(contracts)) throw new TypeError("schema reference incidence: expected an array of contracts");
  const indexes = new WeakMap();
  const indexOf = (contract) => {
    let index = indexes.get(contract);
    if (index === undefined) { index = schemaContractIndex(contract); indexes.set(contract, index); }
    return index;
  };
  const byId = new Map();
  for (const contract of contracts) {
    const index = indexOf(contract);
    if (byId.has(index.id)) throw new TypeError(`schema reference incidence: duplicate contract id ${index.id}`);
    byId.set(index.id, index);
  }
  const references = [];
  for (const contract of byId.values()) {
    const resources = new Map(contract.resources), anchors = new Map(contract.anchors);
    for (const carried of contract.carried) {
      const target = indexOf(carried);
      for (const [address, entry] of target.resources) addSchemaAddress(resources, address, entry);
      for (const [address, entry] of target.anchors) addSchemaAddress(anchors, address, entry);
    }
    for (const { ref, location, base } of contract.references) {
      const address = schemaAddress(ref, base);
      references.push(Object.freeze({
        from: contract.id,
        ref,
        target: documentAddress(address),
        location: location === "" ? "/" : location,
        scope: ref === "" || ref.startsWith("#") ? "local" : "external",
        resolved: resolvesSchemaReference(address, resources, anchors),
      }));
    }
  }
  const ordered = Object.freeze(references.sort((left, right) =>
    compareCodeUnits(left.from, right.from) || compareCodeUnits(left.location, right.location) || compareCodeUnits(left.ref, right.ref)));
  return Object.freeze({
    schemas: Object.freeze([...byId.keys()].sort(compareCodeUnits)),
    references: ordered,
    unresolved: Object.freeze(ordered.filter((reference) => !reference.resolved)),
  });
}

export function siteBulkBoundary(spec) {
  const id = nonempty(spec.id, "siteBulkBoundary id");
  const kind = spec.kind;
  return Object.freeze({
    id,
    kind,
    ...(spec.address === undefined ? {} : { address: nonempty(spec.address, `${id} address`) }),
    ...(spec.codec === undefined ? {} : { codec: nonempty(spec.codec, `${id} codec`) }),
    ...(spec.protocol === undefined ? {} : { protocol: nonempty(spec.protocol, `${id} protocol`) }),
    ...(spec.method === undefined ? {} : { method: nonempty(spec.method, `${id} method`) }),
    ...(spec.href === undefined ? {} : { href: nonempty(spec.href, `${id} href`) }),
    ...(spec.description === undefined ? {} : { description: nonempty(spec.description, `${id} description`) }),
  });
}

export function siteBulk(spec) {
  const boundaries = spec.boundaries.map(siteBulkBoundary);
  if (boundaries.length === 0) throw new TypeError("siteBulk: expected at least one boundary");
  return Object.freeze({
    id: nonempty(spec.id, "siteBulk id"),
    boundaries: Object.freeze(boundaries),
    constraints: frozenNonemptyStrings(spec.constraints, "siteBulk constraint"),
  });
}

export function siteForm(spec) {
  return Object.freeze({
    kind: "metroplat.site.form",
    id: schemaNodeId(spec.id),
    name: nonempty(spec.name, "siteForm name"),
    siteKind: spec.siteKind,
    complexity: spec.complexity,
    proofStatus: spec.proofStatus,
    ...(spec.theoremReference === undefined ? {} : { theoremReference: nonempty(spec.theoremReference, `${spec.id} theoremReference`) }),
    objects: frozenNonemptyStrings(spec.objects, `${spec.id} object`),
    morphisms: frozenNonemptyStrings(spec.morphisms, `${spec.id} morphism`),
    covers: frozenNonemptyStrings(spec.covers, `${spec.id} cover`),
    bulk: siteBulk(spec.bulk),
    frontier: Object.freeze(spec.frontier.map((item) => nonempty(item, `${spec.id} frontier`))),
  });
}

export function siteFormBoundaryKinds(form) {
  return Object.freeze([...new Set(form.bulk.boundaries.map((boundary) => boundary.kind))].sort());
}

export function siteBulkHasBoundary(form, kind) {
  return form.bulk.boundaries.some((boundary) => boundary.kind === kind);
}

/** Normalize a schema address into the bare descent path form used as `$id`. */
export function schemaNodeId(id) {
  const normalized = id.trim().replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  if (normalized === "") throw new TypeError("schemaNodeId: schema node id is empty");
  return normalized;
}

/** Project a schema `$id` to its namespace path. The `$id` is the path. */
export function schemaNodePath(id) {
  return `/${schemaNodeId(id)}`;
}

/** Return the nearest visible prefix-node of `id`, if one is present. */
export function schemaNodeParent(id, universe) {
  const parts = schemaNodeId(id).split("/");
  for (let size = parts.length - 1; size > 0; size -= 1) {
    const candidate = parts.slice(0, size).join("/");
    if (universe.has(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Materialize schema `$id`s as a namespace tree.
 *
 * The site is the prefix order over schema addresses. This function does not
 * invent route names or module tails: each node's location is exactly its bare
 * schema `$id`, exposed as `/${id}` for URL projections.
 */
export function schemaSiteNodes(ids) {
  const normalized = new Set();
  for (const id of ids) normalized.add(schemaNodeId(id));

  const children = new Map();
  const parents = new Map();
  for (const id of normalized) {
    const parent = schemaNodeParent(id, normalized);
    if (parent === undefined) continue;
    parents.set(id, parent);
    const bucket = children.get(parent);
    if (bucket === undefined) children.set(parent, [id]);
    else bucket.push(id);
  }

  return Object.freeze([...normalized]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => {
      const parent = parents.get(id);
      return Object.freeze({
        id,
        path: schemaNodePath(id),
        ...(parent === undefined ? {} : { parent }),
        children: Object.freeze([...(children.get(id) ?? [])].sort()),
        depth: id.split("/").length,
      });
    }));
}

export function schemaSiteIncidence(legs) {
  const normalized = legs.map(schemaSiteLeg);
  const domains = siteExtrema(normalized, "domain");
  const codomains = siteExtrema(normalized, "codomain");
  const domainSchemas = new Set(domains.map((extremum) => extremum.schema));
  const codomainSchemas = new Set(codomains.map((extremum) => extremum.schema));
  return Object.freeze({
    domains,
    codomains,
    incoming: Object.freeze(domains.filter((extremum) => !codomainSchemas.has(extremum.schema))),
    outgoing: Object.freeze(codomains.filter((extremum) => !domainSchemas.has(extremum.schema))),
    edges: siteEdges(normalized),
  });
}

export function siteExtrema(
  legs,
  side,
) {
  const bySchema = new Map();
  for (const leg of legs) {
    const schema = leg[side];
    if (schema === undefined) continue;
    const at = bySchema.get(schema);
    if (at === undefined) bySchema.set(schema, [leg.id]);
    else at.push(leg.id);
  }
  return Object.freeze([...bySchema.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schema, ids]) => Object.freeze({ schema, legs: Object.freeze([...ids].sort()) })));
}

export function siteEdges(legs) {
  const domains = siteExtrema(legs, "domain");
  const codomains = siteExtrema(legs, "codomain");
  const domainBySchema = new Map(domains.map((extremum) => [extremum.schema, extremum.legs]));
  const edges = [];
  for (const codomain of codomains) {
    const tos = domainBySchema.get(codomain.schema);
    if (tos === undefined) continue;
    for (const from of codomain.legs) {
      for (const to of tos) {
        edges.push(Object.freeze({ from, to, schema: codomain.schema, relation: "codomain-domain" }));
      }
    }
  }
  return Object.freeze(edges.sort((left, right) =>
    left.schema.localeCompare(right.schema)
    || left.from.localeCompare(right.from)
    || left.to.localeCompare(right.to)));
}

function nonempty(value, label) {
  const text = value.trim();
  if (text.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return text;
}

function frozenNonemptyStrings(values, label) {
  if (values.length === 0) throw new TypeError(`${label}: expected at least one entry`);
  return Object.freeze(values.map((value) => nonempty(value, label)));
}

