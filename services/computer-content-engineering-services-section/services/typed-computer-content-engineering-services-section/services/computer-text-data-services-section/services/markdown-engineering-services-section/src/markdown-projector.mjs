/**
 * projections/markdown — Markdown flatfiles with optional frontmatter, projected into
 * EAVT-shaped assertions.
 *
 * Filesystem reads/writes are outside this boundary; callers provide the markdown
 * text and coordinate. Frontmatter unfolds into the same object-spelled EAVT rows
 * the schema writer uses, so a document is a settled fold of its own assertions
 * and its conformance is read from told evidence, not a boolean lint.
 */
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { evidence, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { decodeReferencesValue, referencesFrontmatterValue } from "@red-cup-engineering/csl-json-services-section/csl-references";
import { createMarkdownDocument } from "./create-markdown-document.mjs";
import { readMarkdownFrontmatter } from "./read-markdown-frontmatter.mjs";
import { readMarkdownFeatures } from "./read-markdown-features.mjs";
import { readMarkdownStructure } from "./read-markdown-structure.mjs";
import { validateMarkdownDocument } from "./validate-markdown-document.mjs";
import { readMarkdownWorkbench } from "./read-markdown-workbench.mjs";
import { unfoldSchema } from "@red-cup-engineering/json-schema-services-section/schema-assertion-trace";
import { stringProjector } from "@red-cup-engineering/computer-content-engineering-services-section/text-projector";
// Type-only: `executing/fact-claims.mjs` sits above `projections/` (`api/catalog.mjs`
// already imports this very module), so the glue FUNCTION is injected by callers
// rather than imported here — an `import type` is erased at compile time and adds
// no runtime edge, so this stays a one-way dependency (running -> projections), not
// a cycle a JS module loader has to unwind.

const extensionOf = (path) => {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
};

export const DOC_TYPE_STAMP = "tx-document-types";

export const markdownProjector = restrict(stringProjector, {
  type: "markdown",
  // Prose that carries addressable assertions: it unfolds into EAVT rows, so it
  // climbs from the `bottom` string corner to the `assertion` corner (the ≤_k edge
  // toward triples) while its read stays at the strict rung.
  corner: "assertion",
  recognize: (resource) => [".md", ".markdown"].includes(extensionOf(resource.path)),
  // The read leg: the document unfolds to its dataform — subject, frontmatter,
  // body, EAVT assertions, and the four-valued conformance verdict — carried as
  // one item. `createMarkdownDocument` below is the write leg it is holographic against.
  read: (resource) => [markdownDataform(resource.content, { coordinate: resource.path })],
  // The write leg: an entity view carried in a singleton list is projected to a
  // markdown-with-frontmatter document. `markdownDataform` is its inverse leg,
  // and `markdownDataform(createMarkdownDocument(view)) ≈ view` is the holographic
  // counit (content is a faithful projection of the cells it folds back to).
  write: (items) => {
    if (items.length === 0) return "";
    const first = items[0];
    if (first === null || typeof first !== "object" || Array.isArray(first)) return String(first ?? "");
    const view = { ...(first) };
    // References normalize to the canonical CSL-in-YAML sequence on the way
    // through the document, so both corpus dialects settle to one form.
    const decoded = decodeReferencesValue(view["references"]);
    if (decoded.dialect !== "none") view["references"] = referencesFrontmatterValue(decoded.items);
    return createMarkdownDocument(view);
  },
});

export const markdownDocumentSchemaFragment = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: Object.freeze(["name", "description"]),
  properties: Object.freeze({
    name: Object.freeze({ type: "string", minLength: 1 }),
    description: Object.freeze({ type: "string", minLength: 1, maxLength: 300 }),
  }),
});

/**
 * Facets shared by AGENTS.md and CLAUDE.md — the required sections a
 * compliant agent-instruction document must address, per the living standard
 * (nearest-ancestor resolution, ~32KiB budget, typical sections: build, test,
 * structure, style, git workflow, security) and this repo's own
 * directory-grammar doctrine. Declared as ordinary JSON-Schema properties —
 * the mechanism `site-note` below already uses for its own required fields —
 * with two "x-" extension keywords (`x-facet-modality`,
 * `x-facet-source-hint`), not a second, parallel facet-definition system. Any
 * other document type (README, HEARTBEAT, a spec) declares its own required
 * sections the same way; `documentFacets`/`generateDocumentBody` read any
 * schema's properties generically, not just this one.
 */
const agentsDocSchemaProperties = Object.freeze({
  "project-structure": Object.freeze({
    type: "string",
    title: "Project structure",
    description: "Where things live: module/directory shape and what owns what.",
    "x-facet-modality": "MUST",
    "x-facet-source-hint": "src/monitoring/source-code/topology + derived-directory-grammar.md",
  }),
  "build-test": Object.freeze({
    type: "string",
    title: "Build and test commands",
    description: "How to build, run, and test this package.",
    "x-facet-modality": "MUST",
    "x-facet-source-hint": "src/admission/package-manifest.mts + src/publication-status",
  }),
  "style-conventions": Object.freeze({
    type: "string",
    title: "Style conventions",
    description: "Code style and naming conventions specific to this package.",
    "x-facet-modality": "SHOULD",
    "x-facet-source-hint": "src/admission/package-manifest.mts (lint/format scripts) + derived-directory-grammar.md",
  }),
  "git-workflow": Object.freeze({
    type: "string",
    title: "Git workflow",
    description: "Branching, commit, and review conventions for this package.",
    "x-facet-modality": "SHOULD",
    "x-facet-source-hint": "src/integrations/git/services",
  }),
  "security-boundaries": Object.freeze({
    type: "string",
    title: "Security boundaries",
    description: "What must not be touched, exposed, or bypassed.",
    "x-facet-modality": "MUST",
    "x-facet-source-hint": "src/publication-status + package manifest private/files fields",
  }),
  "common-mistakes": Object.freeze({
    type: "string",
    title: "What agents get wrong without this",
    description: "Real, recorded corrections — not guessed pitfalls.",
    "x-facet-modality": "MUST",
    "x-facet-source-hint": "services/agents-doc readFeedbackMemoryClaims (feedback-tagged memory plate)",
  }),
});

const agentsDocSchemaFragment = Object.freeze({
  properties: agentsDocSchemaProperties,
  required: Object.freeze(Object.entries(agentsDocSchemaProperties)
    .filter(([, property]) => (property)["x-facet-modality"] === "MUST")
    .map(([slug]) => slug)),
});

export const documentTypeDefinitions = Object.freeze([
  Object.freeze({
    slug: "readme",
    title: "README",
    description: "A human-facing markdown-document named exactly README.md at a directory root.",
    filename: "^README\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "agents-guide",
    title: "Agents Guide",
    description: "An agent-facing markdown-document named exactly AGENTS.md at a directory root.",
    filename: "^AGENTS\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# AGENTS.md\n",
    schemaFragment: agentsDocSchemaFragment,
  }),
  Object.freeze({
    slug: "claude-memory",
    title: "Claude Memory",
    description: "A markdown-document at a CLAUDE.md or CLAUDE.local.md location for project instruction memory.",
    filename: "^CLAUDE(\\.local)?\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# CLAUDE.md\n",
    schemaFragment: agentsDocSchemaFragment,
  }),
  Object.freeze({
    slug: "heartbeat",
    title: "Heartbeat",
    description: "A markdown-document named exactly HEARTBEAT.md at a repository or package root.",
    filename: "^HEARTBEAT\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# HEARTBEAT.md\n",
  }),
  Object.freeze({
    slug: "specification",
    title: "Specification",
    description: "A markdown-document named specification.md at {thing}/docs/dev/ for normative development specification.",
    filename: "^specification\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "site-note",
    title: "Site Note",
    description: "A markdown-document under a site's `notes` directory-grammar role (README.md's directory grammar: bare `{thing}/notes/`, `{thing}/content/notes/`, or `{thing}/dev/content/notes/YYYY/MM/DD/` — the position changes which notes they are, never whether this type applies). Working material, archived the moment it is written.",
    filename: "^.+\\.md$",
    placement: "{thing}/notes/ | {thing}/content/notes/ | {thing}/dev/content/notes/YYYY/MM/DD/ (any legal dev/content/notes ordering)",
    bodySkeleton: "# {title}\n",
    schemaFragment: Object.freeze({
      required: Object.freeze(["title", "description", "date-created", "tags"]),
      properties: Object.freeze({
        title: Object.freeze({ type: "string", minLength: 1 }),
        description: Object.freeze({ type: "string", minLength: 1 }),
        "date-created": Object.freeze({ type: "string", format: "date" }),
        tags: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }), minItems: 1 }),
      }),
    }),
  }),
]);

/**
 * Read the facets a document type declares — its `schemaFragment.properties`,
 * each carrying `x-facet-modality`/`x-facet-source-hint` — generically, not
 * just for `agents-guide`/`claude-memory`. Any document type with schema
 * properties (a README, a spec) is renderable the same way; a document type
 * with no schema properties yields no facets (falls back to `bodySkeleton`).
 */
export function documentFacets(definition) {
  const properties = definition.schemaFragment?.properties;
  if (properties === undefined) return Object.freeze([]);
  return Object.freeze(Object.entries(properties).map(([slug, property]) => Object.freeze({
    slug,
    title: typeof property["title"] === "string" ? property["title"] : slug,
    description: typeof property["description"] === "string" ? property["description"] : "",
    modality: (property["x-facet-modality"]) ?? "MAY",
    sourceHint: typeof property["x-facet-source-hint"] === "string" ? property["x-facet-source-hint"] : "(no source hint declared)",
  })));
}

/**
 * Render one facet's body section from its fact claims. `glue` is
 * `executing/fact-claims.mjs`'s `glueFactClaims` — the SAME knowledge-order-join
 * machinery `glueClaimSessions` already uses for Claude/Codex/fleet session
 * claims, not a parallel consensus reading. `reliabilityCorrelation` is
 * `executing/fact-claims.mjs`'s `sourceReliabilityCorrelation` — a genuinely
 * different question from the per-fact gate: whether two disagreeing sources'
 * agree/disagree-with-consensus PATTERN is statistically independent across
 * every fact-key they share (real exact-integer independence test from
 * `core/models/kinetic-theory/molecular-chaos-gluing.mjs`, not per-fact string equality).
 * Two sources can disagree on every literal value yet be perfectly correlated
 * in when they're wrong — worth naming, since it means a third source adds
 * more than a fourth copy of either would. Both functions are injected rather
 * than imported here, since `api/catalog.mjs` already imports this module
 * and `executing/fact-claims.mjs` sits in `executing/` too; importing back would
 * close a cycle a module loader has to unwind, not just an abstraction
 * preference. Each rendered bullet is tagged `[{factKey}]` so
 * `integrations/agents-doc/src/fact-claims`'s `existingDocClaims` can parse this same document
 * back as a historical source later. A facet with no supplied claims renders
 * as an explicit "not yet read" gap — never silently omitted or invented. A
 * fact-key with a real disagreement renders as an open question naming
 * exactly which sources disagree, never smoothed over. Agreeing claims for
 * the same fact-key collapse to one bullet.
 */
export function documentFacetSection(
  definition,
  claims,
  glue,
  reliabilityCorrelation,
) {
  const heading = `## ${definition.title}\n\n`;
  if (claims.length === 0) {
    return `${heading}_Not yet read — source: ${definition.sourceHint}._\n`;
  }
  const glued = glue(claims);
  const byFactKey = new Map();
  for (const entry of claims) {
    const group = byFactKey.get(entry.factKey) ?? [];
    group.push(entry);
    byFactKey.set(entry.factKey, group);
  }
  const bullets = [];
  const openLines = [];
  const reportedPairs = new Set();
  for (const [factKey, group] of byFactKey) {
    const distinctValues = new Set(group.map((entry) => entry.value));
    if (distinctValues.size === 1) {
      const sources = [...new Set(group.map((entry) => entry.source))];
      const confirmedBy = sources.length > 1 ? ` (confirmed by ${sources.join(", ")})` : "";
      bullets.push(`- [${factKey}] ${group[0].value}${confirmedBy}`);
      continue;
    }
    const perSource = group.map((entry) => `${entry.source}=${JSON.stringify(entry.value)}`).join(", ");
    openLines.push(`- **Open — ${factKey}: sources disagree (${perSource})**`);
    bullets.push(...group.map((entry) => `- [${factKey}] ${entry.value} (${entry.source})`));

    const sources = [...new Set(group.map((entry) => entry.source))];
    for (let i = 0; i < sources.length; i += 1) {
      for (let j = i + 1; j < sources.length; j += 1) {
        const pairKey = [sources[i], sources[j]].sort().join(" ");
        if (reportedPairs.has(pairKey)) continue;
        reportedPairs.add(pairKey);
        const correlation = reliabilityCorrelation(claims, sources[i], sources[j]);
        if (correlation !== undefined && correlation.sharedFactKeys >= 3 && !correlation.independent) {
          openLines.push(`- **Note — ${sources[i]} and ${sources[j]} are correlated in when they're wrong across ${correlation.sharedFactKeys} shared facts (not independent evidence — a third source would help more than doubling either).**`);
        }
      }
    }
  }
  if (openLines.length > 0) {
    return `${heading}**Contested (${openLines.length} of the facts below have conflicting claims — glued regime: ${glued.regime}):**\n\n${openLines.join("\n")}\n\n${bullets.join("\n")}\n`;
  }
  return `${heading}${bullets.join("\n")}\n`;
}

/**
 * Render a full document body from facet fact claims, for ANY document type
 * that declares facets via `documentFacets` (not just AGENTS.md/CLAUDE.md).
 * `claimsByFacet` maps a facet slug to its sourced claims (built by
 * `integrations/agents-doc/src/fact-claims` or an equivalent for another document
 * type); facets absent from the map render as "not yet read" rather than as
 * invented prose.
 *
 * `maxBytes` (default 32768, the living standard's own combined-file budget)
 * is enforced by dropping the LOWEST-`weight` claims first from the
 * lowest-modality (MAY, then SHOULD, then MUST) facets — never by silently
 * truncating text mid-sentence. Every drop is named in the rendered section
 * ("+N more … omitted to stay within the Xb budget"), never hidden.
 */
export function generateDocumentBody(
  definition,
  site,
  claimsByFacet,
  glue,
  reliabilityCorrelation,
  options = {},
) {
  const facets = documentFacets(definition);
  const maxBytes = options.maxBytes ?? 32768;
  const render = (byFacet) => {
    const sections = facets
      .map((facet) => documentFacetSection(facet, byFacet.get(facet.slug) ?? [], glue, reliabilityCorrelation))
      .join("\n");
    return `# ${definition.title}\n\n${site}\n\n${sections}`;
  };

  let working = new Map(claimsByFacet);
  let body = render(working);
  if (Buffer.byteLength(body, "utf8") <= maxBytes) return body;

  const modalityRank = { MAY: 0, SHOULD: 1, MUST: 2 };
  const trimOrder = [...facets].sort((left, right) => modalityRank[left.modality] - modalityRank[right.modality]);
  const dropped = new Map();

  for (const facet of trimOrder) {
    while (Buffer.byteLength(body, "utf8") > maxBytes) {
      const claims = working.get(facet.slug) ?? [];
      if (claims.length <= 1) break;
      const weighted = [...claims].sort((left, right) => (left.weight ?? -1) - (right.weight ?? -1));
      const [lowest, ...rest] = weighted;
      if (lowest === undefined) break;
      working = new Map(working);
      working.set(facet.slug, rest);
      dropped.set(facet.slug, (dropped.get(facet.slug) ?? 0) + 1);
      body = render(working);
    }
    if (Buffer.byteLength(body, "utf8") <= maxBytes) break;
  }

  if (dropped.size === 0) return body; // nothing left to trim; over budget is named by the caller, not hidden here

  let finalBody = render(working);
  for (const [slug, count] of dropped) {
    const facet = facets.find((entry) => entry.slug === slug);
    const heading = `## ${facet.title}\n\n`;
    finalBody = finalBody.replace(heading, `${heading}_(+${count} more, omitted to stay within the ${maxBytes}b budget)_\n\n`);
  }
  return finalBody;
}

/** `generateDocumentBody` bound to the `agents-guide` document type — the
 *  entry point `agentsDocProjector` (catalog.mts) and existing callers use.
 *  `glue` is `executing/fact-claims.mjs`'s `glueFactClaims`, injected by the
 *  caller (see `documentFacetSection`'s docstring for why). */
export function generateAgentsDocBody(
  site,
  claimsByFacet,
  glue,
  reliabilityCorrelation,
  options = {},
) {
  const definition = documentTypeDefinitions.find((entry) => entry.slug === "agents-guide");
  return generateDocumentBody(definition, site, claimsByFacet, glue, reliabilityCorrelation, options);
}

/** One presence observation as told evidence: `supported` is a boundary read (a regex match, a
 *  `typeof` check, a field lookup) and the coordinate witnesses for it when true, against it when
 *  false; `null` means the predicate was not observable, so nothing is told (absurd). Shared by
 *  `frontmatterConformanceOfFormat` and `siteNoteFrontmatterConformance`. */
function presenceObservation(
  predicate,
  modality,
  depth,
  supported,
  coordinate,
) {
  const told = evidence({ for: supported === true ? [coordinate] : [], against: supported === false ? [coordinate] : [] });
  return Object.freeze({ predicate, modality, depth, reading: knowledgeReading(told), evidence: told });
}

/** Conformance is the truth-order meet over the MUST observations, which falls to false exactly when
 *  some MUST is told against without every MUST told for; with each observation told one way at
 *  most, that is: no MUST told against. */
const mustsHold = (observations) => !observations.some((entry) => entry.modality === "MUST" && entry.evidence.against.length > 0);

export function frontmatterConformance(text, opts = {}) {
  return frontmatterConformanceOfFormat(readMarkdownFrontmatter(text).format, opts);
}

/** Conformance from an already-parsed frontmatter format — the one split is
 *  the evidence; callers holding a `MarkdownParseResult` never re-scan. */
export function frontmatterConformanceOfFormat(format, opts = {}) {
  const coordinate = opts.coordinate ?? "frontmatter";
  const yaml = format === "yaml";
  const toml = format === "toml";
  const present = format !== null;
  const observations = Object.freeze([
    presenceObservation("has-frontmatter", "MUST", 0, present, coordinate),
    presenceObservation("yaml-frontmatter", "SHOULD", 1, yaml ? true : present ? false : null, coordinate),
    presenceObservation("toml-frontmatter", "MAY", 2, toml ? true : null, coordinate),
  ]);
  const notes = observations
    .filter((entry) => entry.modality === "SHOULD" && entry.reading === "active")
    .map((entry) => `SHOULD ${entry.predicate} (depth ${entry.depth})`);
  return Object.freeze({
    settled: true,
    conformant: mustsHold(observations),
    format: yaml ? "yaml" : toml ? "toml" : null,
    observations,
    notes: Object.freeze(notes),
  });
}

/** The generic templated description a 278-note census of one site's
 *  `dev/content/notes/` (read 2026-07-05) found on 132 of them — `"This is a
 *  research on X, written for users of @red-cup-engineering/metroplat."` and its
 *  siblings for every other note kind. Restated per-note it carries zero
 *  information beyond the filename; folding it into conformance
 *  as a MUST told against forces a real description at the write boundary
 *  instead of perpetuating the boilerplate. Not tied to that site's
 *  vocabulary specifically — the pattern is "This is a {kind} on/of/for/to/
 *  about {subject}, written for users of {package}", the shape a templated
 *  note-generator produces regardless of which site writes through this
 *  conformance check. */
const GENERIC_NOTE_DESCRIPTION = /^this is an? [a-z][a-z -]* (on|of|for|to|about) .+, written for users of .+\.?$/iu;

/**
 * A site-note's own required facets, read through the same told evidence
 * `frontmatterConformanceOfFormat` uses for the frontmatter-format predicates
 * — a note is a note by being markdown (the parent `markdownProjector`'s own
 * recognition), by sitting at a site's `notes` directory-grammar role (`site-
 * directory-grammar.mts`'s positional read), AND by carrying these facets:
 * title, a real (non-templated) description, a creation date, and at least
 * one tag — the shape a 278-note census (2026-07-05) found already universal
 * across the corpus. Each is a MUST observation; any MUST told against makes `conformant` false — never a flat boolean guard standing in for the algebra this
 * whole package is built on.
 */
export function siteNoteFrontmatterConformance(
  frontmatter,
  opts = {},
) {
  const coordinate = opts.coordinate ?? "frontmatter";
  const title = frontmatter["title"];
  const description = frontmatter["description"];
  const tags = frontmatter["tags"];
  const dateCreated = frontmatter["date-created"];
  const hasTitle = typeof title === "string" && title.trim() !== "";
  const hasDescription = typeof description === "string" && description.trim() !== "";
  const descriptionGeneric = hasDescription && GENERIC_NOTE_DESCRIPTION.test((description).trim());
  const hasTags = Array.isArray(tags) && tags.length > 0 && tags.every((tag) => typeof tag === "string");
  const hasDateCreated = typeof dateCreated === "string" && dateCreated.trim() !== "";
  const observations = Object.freeze([
    presenceObservation("has-title", "MUST", 0, hasTitle, coordinate),
    presenceObservation("has-description", "MUST", 0, hasDescription, coordinate),
    presenceObservation("description-not-generic", "MUST", 1, hasDescription ? !descriptionGeneric : null, coordinate),
    presenceObservation("has-date-created", "MUST", 0, hasDateCreated, coordinate),
    presenceObservation("has-tags", "MUST", 0, hasTags, coordinate),
  ]);
  return Object.freeze({
    settled: true,
    conformant: mustsHold(observations),
    observations,
  });
}

export function markdownDataform(text, opts) {
  const parsed = parseMarkdownDataformInput(text, opts);
  const verdict = frontmatterConformanceOfFormat(parsed.format, { coordinate: opts.coordinate });
  const workbench = readMarkdownWorkbench(text, opts);
  const frontmatter = parsed.frontmatter ?? {};
  const subject = opts.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"] ? frontmatter["slug"] : opts.coordinate);
  const assertions = [];
  const push = (a, v) => {
    assertions.push(Object.freeze({ e: subject, a, v, t: opts.coordinate }));
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) for (const item of value) push(key, frontmatterRowValue(item));
    else push(key, frontmatterRowValue(value));
  }
  push("body", parsed.body);
  const cells = assertions.map((assertion) => Object.freeze({
    cell: Object.freeze({ subject: assertion.e, predicate: assertion.a, object: assertion.v }),
    evidence: evidence({ for: [opts.coordinate] }),
  }));
  return Object.freeze({
    subject,
    format: parsed.format,
    conformant: verdict.conformant,
    verdict,
    frontmatter: Object.freeze(frontmatter),
    body: parsed.body,
    structure: readMarkdownStructure(text),
    validation: validateMarkdownDocument(text),
    workbench,
    features: readMarkdownFeatures(parsed.body),
    assertions: Object.freeze(assertions),
    cells: Object.freeze(cells),
  });
}

// A JSON-object frontmatter is YAML, so the frontmatter reader admits it as is.
function parseMarkdownDataformInput(text, opts) {
  return readMarkdownFrontmatter(text, opts.frontmatterFormats === undefined ? {} : { frontmatterFormats: opts.frontmatterFormats });
}

export function documentTypeFragment(definition) {
  return Object.freeze({
    title: definition.title,
    description: definition.description,
    "x-trc-type": definition.slug,
    "x-trc-filename": definition.filename,
    "x-trc-placement": definition.placement,
    "x-trc-body-skeleton": definition.bodySkeleton,
    ...(definition.schemaFragment ?? {}),
  });
}

export function documentTypeAssertions(definition, opts

 = {}) {
  const options = { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t ?? DOC_TYPE_STAMP };
  return [
    ...unfoldSchema(markdownDocumentSchemaFragment, options),
    ...unfoldSchema(documentTypeFragment(definition), options),
  ];
}

export function allDocumentTypeAssertions(opts = {}) {
  return Object.freeze(documentTypeDefinitions.flatMap((definition) => documentTypeAssertions(definition, opts)));
}

function frontmatterRowValue(value) {
  if (value !== null && typeof value === "object") return canonicalJson(value);
  return value;
}

/** The frontmatter, format and body of a document (TOML frontmatter reads as empty). */
export function parseMarkdown(text) {
  const parsed = readMarkdownFrontmatter(text);
  return Object.freeze({
    frontmatter: parsed.format === "toml" ? Object.freeze({}) : parsed.frontmatter,
    format: parsed.format,
    body: parsed.body,
  });
}
