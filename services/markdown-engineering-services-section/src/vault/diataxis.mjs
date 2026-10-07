import { readingAs, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * vault-note-schema/src/diataxis - Diataxis as a derived read over markdown
 * text, and its transport onto the four readings. Relocated
 * verbatim from metroplat's `src/integrations/knowledge-vaults/codec.mts`,
 * per the 2026-09-05 ruling that a capability living inside metroplat's
 * `src/integrations/*` belongs in its own topic section, with metroplat
 * reduced to a thin consumer.
 *
 * Diataxis (tutorial/how-to/explanation/reference) is an external
 * documentation taxonomy, not a RelMath object: the mapping from a mode name
 * to the four readings is a designed correspondence between
 * two representations, and the coverage read is a boundary computation over
 * admitted document text — both are codec concerns (a codec IS a mapping
 * between representations), never material law.
 *
 * This module is the house's one Diataxis implementation: the modes, their readings and
 * the compass's two axes (application, cognition), the dualities those axes give, and the
 * reads over text.
 *
 * `diataxisModeOfText` reads a document's mode as real structural evidence
 * (ordered steps, code-block density, table density, goal framing) rather
 * than asserting it as hand-curated editorial data — Diataxis mode is a
 * purpose judgment, so a structural reader will sometimes be wrong, but it
 * is evidence read from the actual document, not asserted about it from
 * outside.
 */

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label}: expected a non-empty string`);
  }
  return value;
}

// ── mode / reading ────────────────────────────────────────────────────────

/** All Diataxis mode names. */
export const diataxisModeNames = Object.freeze(["tutorial", "how-to", "explanation", "reference"]);
// A mode's reading is its place among the four readings by bilattice role: tutorial is the
// knowledge bottom, reference the top, how-to the told-for side and explanation the told-against.
const readingByMode = Object.freeze({ tutorial: "absurd", "how-to": "potential", explanation: "active", reference: "stable" });
const modeByReading = Object.freeze({ absurd: "tutorial", potential: "how-to", active: "explanation", stable: "reference" });
/** Whether a string names a Diataxis mode. */
export function isDiataxisModeName(value) {
  return diataxisModeNames.includes(value);
}
/** Coerce a string to a Diataxis mode name, or throw. */
export function asDiataxisModeName(value) {
  if (!isDiataxisModeName(value)) {
    throw new TypeError(`not a Diataxis mode name: ${JSON.stringify(value)} (expected one of ${diataxisModeNames.join(", ")})`);
  }
  return value;
}
const modeNameOf = (mode) => typeof mode === "string" ? asDiataxisModeName(mode) : mode.name;
/** A Diataxis mode and its reading: application is the for side, cognition the against side. */
export function diataxisMode(name) {
  const reading = readingByMode[asDiataxisModeName(name)];
  const [application, cognition] = sidesOfReading(reading);
  return Object.freeze({ kind: "diataxis.mode", name, reading, application, cognition });
}
/** All four Diataxis modes. */
export const diataxisModes = Object.freeze(diataxisModeNames.map(diataxisMode));
/** The name of a Diataxis mode. */
export const diataxisModeName = (mode) => mode.name;
/** The reading (knowledge family) a Diataxis mode names. */
export function readingOfDiataxisMode(mode) {
  return readingByMode[modeNameOf(mode)];
}
/** The Diataxis mode a reading (any family) names. */
export function diataxisModeOfReading(value) {
  return diataxisMode(modeByReading[readingAs("knowledge", value)]);
}
/** Whether a Diataxis mode is application-facing. */
export function diataxisApplication(mode) {
  return sidesOfReading(readingOfDiataxisMode(mode))[0];
}
/** Whether a Diataxis mode is cognition-facing. */
export function diataxisCognition(mode) {
  return sidesOfReading(readingOfDiataxisMode(mode))[1];
}

// ── dualities: the compass's axes swapped or flipped ──────────────────────
const modeOfAxes = (application, cognition) => diataxisModeOfReading(readingOfSides("knowledge", application, cognition));
/** Lookup duality: tutorial <-> reference, with how-to and explanation fixed (both axes flipped and exchanged). */
export function diataxisLookupDual(mode) {
  return modeOfAxes(!diataxisCognition(mode), !diataxisApplication(mode));
}
/** Doing duality: how-to <-> explanation, with tutorial and reference fixed (the axes exchanged). */
export function diataxisDoingDual(mode) {
  return modeOfAxes(diataxisCognition(mode), diataxisApplication(mode));
}
/** The composite of the two dualities: tutorial <-> reference and how-to <-> explanation. */
export function diataxisAntipode(mode) {
  return diataxisDoingDual(diataxisLookupDual(mode));
}
const dualityEdge = (duality, from, to) => Object.freeze({ kind: "diataxis.duality-edge", duality, from, to });
/** All four modes with their lookup, doing and antipode duality edges. */
export function diataxisReading() {
  const modes = diataxisModes;
  return Object.freeze({
    kind: "diataxis.reading",
    modes,
    lookupDual: Object.freeze(modes.map((mode) => dualityEdge("lookup", mode, diataxisLookupDual(mode)))),
    doingDual: Object.freeze(modes.map((mode) => dualityEdge("doing", mode, diataxisDoingDual(mode)))),
    antipode: Object.freeze(modes.map((mode) => dualityEdge("antipode", mode, diataxisAntipode(mode)))),
  });
}

// ── mode-of-text: the real read this codec exists to do ─────────────────────

const ORDERED_STEP_LINE = /^\s*\d+[.)]\s+\S/mu;
const CODE_FENCE = /^```/mu;
const TABLE_ROW = /^\s*\|.*\|\s*$/mu;
const GOAL_FRAMING = /\b(by the end of this|you will (?:learn|be able to)|in this tutorial|the goal of this)\b/iu;

function countMatches(pattern, text) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return (text.match(new RegExp(pattern.source, flags)) ?? []).length;
}

/** Read structural evidence from a markdown document body (frontmatter already stripped). */
export function diataxisTextEvidence(body) {
  const lines = body.split(/\r?\n/u);
  const orderedStepLines = countMatches(ORDERED_STEP_LINE, body);
  const codeBlockCount = Math.floor(countMatches(CODE_FENCE, body) / 2);
  const tableRowCount = countMatches(TABLE_ROW, body);
  const structuralLines = orderedStepLines + tableRowCount;
  const proseLineCount = lines.filter((line) => line.trim().length > 0).length - structuralLines;
  return Object.freeze({
    kind: "diataxis.text-evidence",
    orderedStepLines,
    codeBlockCount,
    tableRowCount,
    proseLineCount: Math.max(0, proseLineCount),
    totalLineCount: lines.length,
    hasGoalFraming: GOAL_FRAMING.test(body),
  });
}

/**
 * Read a Diataxis mode from a markdown document's actual body text.
 *
 * This is a structural heuristic over Diataxis's own distinguishing
 * questions, not a definitive classifier — Diataxis mode is fundamentally a
 * purpose judgment, and a document can be structurally ambiguous. Priority,
 * read from real evidence:
 *
 * 1. Explicit `mode` frontmatter, if the caller supplies one — an authored
 *    override always wins over inference.
 * 2. Goal-framing language ("by the end of this...") combined with ordered
 *    steps: learning-oriented -> tutorial.
 * 3. Ordered steps without goal framing: task-oriented -> how-to.
 * 4. Table/code-block density at or above prose density: information-oriented
 *    -> reference.
 * 5. Otherwise: understanding-oriented -> explanation (the prose default).
 */
export function diataxisModeOfText(body, explicitMode) {
  if (explicitMode !== undefined && isDiataxisModeName(explicitMode)) return explicitMode;
  const evidence = diataxisTextEvidence(body);
  if (evidence.orderedStepLines > 0 && evidence.hasGoalFraming) return "tutorial";
  if (evidence.orderedStepLines > 0) return "how-to";
  if (evidence.codeBlockCount + evidence.tableRowCount >= evidence.proseLineCount) return "reference";
  return "explanation";
}

// ── coverage surface / read ──────────────────────────────────────────────

const diagonalModes = Object.freeze(["tutorial", "reference"]);
const offDiagonalModes = Object.freeze(["how-to", "explanation"]);

function normalizeModes(modes) {
  const source = modes ?? diataxisModeNames;
  const seen = new Set();
  const out = [];
  for (const mode of source) {
    const normalized = asDiataxisModeName(mode);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return Object.freeze(out);
}

/** Construct one documentation locus for a coverage surface. */
export function diataxisCoverageItem(mode, id, options = {}) {
  const item = {
    kind: "diataxis.coverage.item",
    id: nonempty(id, "diataxisCoverageItem.id"),
    mode: asDiataxisModeName(mode),
    ...(options.title === undefined ? {} : { title: nonempty(options.title, "diataxisCoverageItem.title") }),
    ...(options.source === undefined ? {} : { source: nonempty(options.source, "diataxisCoverageItem.source") }),
  };
  return Object.freeze(item);
}

/** Admit a finite documentation surface as Diataxis coverage material. */
export function diataxisCoverageSurface(id, items, options = {}) {
  if (!Array.isArray(items)) throw new TypeError("diataxisCoverageSurface.items: expected an array");
  return Object.freeze({
    kind: "diataxis.coverage.surface",
    id: nonempty(id, "diataxisCoverageSurface.id"),
    items: Object.freeze(items.map((item) => diataxisCoverageItem(item.mode, item.id, item))),
    requiredModes: normalizeModes(options.requiredModes),
  });
}

function readMode(mode, items) {
  const loci = Object.freeze(items.filter((item) => item.mode === mode).map((item) => item.id));
  return Object.freeze({
    kind: "diataxis.coverage.mode-classification",
    mode,
    reading: readingOfDiataxisMode(mode),
    application: diataxisApplication(mode),
    cognition: diataxisCognition(mode),
    count: loci.length,
    loci,
  });
}

function readFace(face, modes, modeReads) {
  const selected = modeReads.filter((read) => modes.includes(read.mode));
  const missing = Object.freeze(selected.filter((read) => read.count === 0).map((read) => read.mode));
  return Object.freeze({
    kind: "diataxis.coverage.face-read",
    face,
    modes: Object.freeze([...modes]),
    count: selected.reduce((total, read) => total + read.count, 0),
    complete: missing.length === 0,
    missing,
    loci: Object.freeze(selected.flatMap((read) => read.loci)),
  });
}

/** Read Diataxis coverage over admitted documentation loci. */
export function diataxisCoverageClassification(surface) {
  if (surface.kind !== "diataxis.coverage.surface") {
    throw new TypeError("diataxisCoverageClassification: expected a diataxis.coverage.surface object");
  }
  const requiredModes = normalizeModes(surface.requiredModes);
  const items = surface.items.map((item) => diataxisCoverageItem(item.mode, item.id, item));
  const modes = Object.freeze(requiredModes.map((mode) => readMode(mode, items)));
  const coveredModes = Object.freeze(modes.filter((read) => read.count > 0).map((read) => read.mode));
  const missingModes = Object.freeze(modes.filter((read) => read.count === 0).map((read) => read.mode));
  const diagonal = readFace("diagonal", diagonalModes.filter((mode) => requiredModes.includes(mode)), modes);
  const offDiagonal = readFace("off-diagonal", offDiagonalModes.filter((mode) => requiredModes.includes(mode)), modes);
  const judgment = missingModes.length === 0
    ? Object.freeze({
      kind: "diataxis.coverage:witness",
      surface: surface.id,
      requiredModes,
      itemCount: items.length,
      diagonalComplete: diagonal.complete,
      offDiagonalComplete: offDiagonal.complete,
    })
    : Object.freeze({
      kind: "diataxis.coverage-obstruction",
      surface: surface.id,
      requiredModes,
      missingModes,
      diagonalComplete: diagonal.complete,
      offDiagonalComplete: offDiagonal.complete,
    });
  return Object.freeze({
    kind: "diataxis.coverage.classification",
    surface: surface.id,
    itemCount: items.length,
    requiredModes,
    coveredModes,
    missingModes,
    modes,
    diagonal,
    offDiagonal,
    judgment,
  });
}

/**
 * Read Diataxis coverage over real markdown documents: each document's mode
 * is read from its own body text (`diataxisModeOfText`), not asserted.
 */
export function diataxisCoverageOfDocuments(id, documents, options = {}) {
  const items = documents.map((doc) =>
    diataxisCoverageItem(diataxisModeOfText(doc.body, doc.explicitMode), doc.path, {
      source: doc.path,
      ...(doc.title === undefined ? {} : { title: doc.title }),
    }));
  return diataxisCoverageClassification(diataxisCoverageSurface(id, items, options));
}
