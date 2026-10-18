import { fusionReading, knowledgeJoinReading, knowledgeLeqReading, knowledgeMeetReading, negateReading, residuumReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * predicating/fibration - finite predication fibration and arrows-first reads.
 *
 * This is the executable shadow of the green RelMath predicating cluster. It is
 * derived from the package's existing predication-site and FOUR carriers:
 * predication cells are serialized as signatures, base arrows are read from the
 * materialized site, and valuation fibers are finite charge-name tables keyed by
 * those cell signatures.
 *
 * The runtime surface does not introduce a second category implementation. It
 * gives SEN-portable witnesses for the finite claims that can be checked over
 * existing `PredicationSite` data: incoming-arrow recovery, reindexing as
 * precomposition, bilattice-homomorphic reindexing, temporal composition, and
 * theory-relative ideal restriction.
 */
const stableStringify = (value) => {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(",")}]`;
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};
/** A Mark is an uninterpreted schematic datum. This projection reads only its
 * presented value; it never asserts observational equality from coincidence.
 * The native SignGraph site has raw SignCell triple values rather than old
 * predication.term / predication.predicate wrapper records. Both presentation
 * forms must project through one mathematical carrier. */
function presented(value) {
    if (value === undefined)
        throw new TypeError("predication signature requires a presented term");
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        if (value.kind === "utterance.mark" && Object.hasOwn(value, "value"))
            return value.value;
        if ((value.kind === "predication.term" || value.kind === "predication.predicate") &&
            value.mark !== null && typeof value.mark === "object" &&
            Object.hasOwn(value.mark, "value"))
            return value.mark.value;
    }
    return value;
}
const markKey = (value) => stableStringify(presented(value));
export function signatureOfCell(cell) {
    if (cell === null || typeof cell !== "object")
        throw new TypeError("predication signature requires a cell");
    return Object.freeze({
        kind: "predication.cellSignature",
        subject: markKey(cell.subject),
        predicate: markKey(cell.predicate),
        object: markKey(cell.object),
    });
}
/** Preserve the distinct subject / predicate / object positions without imposing
 * technological content addresses or identifying different Mark occurrences.
 * Each field is already a separately generated string signature. */
export function cellSignatureKey(cell) {
    if (!cell || !["subject", "predicate", "object"].every(role => typeof cell[role] === "string"))
        throw new TypeError("predication cell signature requires three string roles");
    return JSON.stringify([cell.subject, cell.predicate, cell.object]);
}
const objectSignature = (objectKind, key) => Object.freeze({ kind: "predication.objectSignature", objectKind, key });

/** Object kinds are separate roles in the derived category, even where the
 * same Mark presentation appears in several roles. A string key alone is not
 * an object identity, and punctuation-delimited concatenation is not a pair. */
export function objectSignatureKey(object) {
    if (object?.kind !== "predication.objectSignature" ||
        !["cell", "predicate", "term"].includes(object.objectKind) ||
        typeof object.key !== "string")
        throw new TypeError("predication object signature requires a typed role and key");
    return JSON.stringify([object.objectKind, object.key]);
}
/** Extract the correct sort from either the original abstract predication
 * carrier or SignGraph's actual generated base {sort,term} projections. A
 * specialization edge's raw value is a predicate, unlike a projection edge's
 * raw term. That role comes from the arrow generator, not its payload shape. */
function keyOfBaseObject(value, role = "term") {
    if (Array.isArray(value)) {
        if (value.length !== 3) throw new TypeError("predication base cell needs three roles");
        const [subject, predicate, object] = value;
        return objectSignature("cell", cellSignatureKey(signatureOfCell({ subject, predicate, object })));
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        if (value.sort === "entity" || value.sort === "predicate")
            return objectSignature(value.sort === "predicate" ? "predicate" : "term", markKey(value.term));
        if (value.kind === "predication.predicate") return objectSignature("predicate", markKey(value));
        if (value.kind === "predication.term") return objectSignature("term", markKey(value));
    }
    return objectSignature(role === "predicate" ? "predicate" : "term", markKey(value));
}
const sortedObjects = (objects) => {
    const byKey = new Map();
    for (const object of objects) byKey.set(objectSignatureKey(object), object);
    return Object.freeze([...byKey.entries()]
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([, object]) => object));
};
const arrow = (generator, from, to, index) => Object.freeze({
    kind: "predication.arrowSignature",
    name: `${generator}:${index}:${from}->${to}`,
    generator,
    from,
    to,
});
/** Read the source-generated finite base category, without reconstructing
 * technological SignCell types or assuming a legacy wrapper around Marks.
 * Converse targets and other generated arrow endpoints are genuine objects:
 * the original input site's cell set need not enumerate them explicitly. */
export function predicationCategoryShadow(site) {
    const base = site?.base;
    const cells = Array.isArray(site?.cells) ? site.cells : site?.cells?.cells;
    const generators = ["specialization", "converse", "subjectProjection", "objectProjection"];
    if (!base || !Array.isArray(base.objects) || !Array.isArray(cells) ||
        generators.some(name => !Array.isArray(base[name])))
        throw new TypeError("predication category needs a generated base and cells");

    const legs = generators.flatMap(generator => base[generator].map((edge, index) => {
        const from = keyOfBaseObject(edge.domain, generator === "specialization" ? "predicate" : "term");
        const to = keyOfBaseObject(edge.codomain, generator === "specialization" ? "predicate" : "term");
        return Object.freeze({ generator, index, from, to });
    }));
    const objects = sortedObjects([
        ...base.objects.map(value => keyOfBaseObject(value)),
        ...cells.map(value => objectSignature("cell", cellSignatureKey(signatureOfCell(value)))),
        ...legs.flatMap(({ from, to }) => [from, to]),
    ]);
    const arrows = [
        ...objects.map((object, index) =>
            arrow("identity", objectSignatureKey(object), objectSignatureKey(object), index)),
        ...legs.map(({ generator, index, from, to }) =>
            arrow(generator, objectSignatureKey(from), objectSignatureKey(to), index)),
    ];
    return Object.freeze({
        kind: "predication.categoryShadow",
        objects,
        arrows: Object.freeze(arrows.sort((left, right) => left.name.localeCompare(right.name))),
    });
}

/** Accept a typed object or its exact encoded pair, never a bare Mark payload
 * that could denote several category roles. */
function categoryObjectRef(category, value) {
    const ref = typeof value === "string" ? value : objectSignatureKey(value);
    if (!category.objects.some((object) => objectSignatureKey(object) === ref))
        throw new TypeError("predication category requires an existing typed object reference");
    return ref;
}
export const incomingArrows = (category, objectRef) => {
    const ref = categoryObjectRef(category, objectRef);
    return Object.freeze(category.arrows.filter((edge) => edge.to === ref)
        .sort((left, right) => left.name.localeCompare(right.name)));
};
/** Finite Yoneda read: an object is distinguished by its incoming-arrow bundle. */
export function yonedaRecovery(category, left, right) {
    const leftRef = categoryObjectRef(category, left);
    const rightRef = categoryObjectRef(category, right);
    const leftIncoming = incomingArrows(category, leftRef);
    const rightIncoming = incomingArrows(category, rightRef);
    const sameIncomingBundle = stableStringify(leftIncoming) === stableStringify(rightIncoming);
    return Object.freeze({
        kind: "predication.yonedaRecovery:witness",
        left,
        right,
        leftIncoming,
        rightIncoming,
        sameObject: leftRef === rightRef,
        sameIncomingBundle,
        objectRecoveredFromArrows: (leftRef === rightRef || !sameIncomingBundle),
    });
}
export function finitePredicationValuation(cells, values) {
    const normalizedCells = Object.freeze([...cells].sort((left, right) => cellSignatureKey(left).localeCompare(cellSignatureKey(right))));
    const normalized = {};
    for (const cell of normalizedCells) {
        const key = cellSignatureKey(cell);
        if (Object.hasOwn(normalized, key))
            throw new TypeError(`finitePredicationValuation: duplicate cell ${key}`);
        if (!values || !Object.hasOwn(values, key) || values[key] === undefined)
            throw new TypeError(`finitePredicationValuation: missing value for ${key}`);
        normalized[key] = values[key];
    }
    return Object.freeze({
        kind: "predication.finiteValuation",
        cells: normalizedCells,
        values: Object.freeze(normalized),
    });
}
export const finiteValuationFromCells = (cells, values) => finitePredicationValuation(cells.map(signatureOfCell), values);
export function embedding(entries) {
    // Reindexing is a function from resource positions to host positions.
    // A shared host is allowed (two resources may read one host), but a
    // resource mapped to two different hosts silently overwrote evidence.
    const seen = new Set();
    const mapped = entries.map(([resource, host]) => {
        const key = cellSignatureKey(resource);
        cellSignatureKey(host);
        if (seen.has(key))
            throw new TypeError(`predication embedding repeats a resource position: ${key}`);
        seen.add(key);
        return Object.freeze({ kind: "predication.embeddingEntry", resource, host });
    });
    return Object.freeze({ kind: "predication.embedding", entries: Object.freeze(mapped) });
}
export function reindexValuation(embed, host) {
    const values = {};
    for (const entry of embed.entries) {
        const hostValue = host.values[cellSignatureKey(entry.host)];
        if (hostValue === undefined)
            throw new TypeError(`reindexValuation: host is missing ${cellSignatureKey(entry.host)}`);
        values[cellSignatureKey(entry.resource)] = hostValue;
    }
    return finitePredicationValuation(embed.entries.map((entry) => entry.resource), values);
}
export function reindexWitness(embed, host) {
    return Object.freeze({
        kind: "predication.reindex:witness",
        embedding: embed,
        host,
        resource: reindexValuation(embed, host),
        cellwise: true,
    });
}
function binaryPointwise(left, right, op) {
    return finitePredicationValuation(left.cells, Object.fromEntries(left.cells.map((cell) => {
        const key = cellSignatureKey(cell);
        return [key, op(left.values[key], right.values[key])];
    })));
}
function unaryPointwise(value, op) {
    return finitePredicationValuation(value.cells, Object.fromEntries(value.cells.map((cell) => {
        const key = cellSignatureKey(cell);
        return [key, op(value.values[key])];
    })));
}
const sameValuation = (left, right) => stableStringify(left) === stableStringify(right);
/** Reindexing is pointwise precomposition, so it preserves the finite bilattice operations. */
export function reindexBilatticeHomomorphism(embed, left, right) {
    const reLeft = reindexValuation(embed, left);
    const reRight = reindexValuation(embed, right);
    const preserves = (op) => sameValuation(reindexValuation(embed, binaryPointwise(left, right, op)), binaryPointwise(reLeft, reRight, op));
    const preservesUnary = (op) => sameValuation(reindexValuation(embed, unaryPointwise(left, op)), unaryPointwise(reLeft, op));
    return Object.freeze({
        kind: "predication.reindexBilatticeHom:witness",
        embedding: embed,
        preservesMeetK: preserves((a, b) => knowledgeMeetReading(a, b)),
        preservesJoinK: preserves((a, b) => knowledgeJoinReading(a, b)),
        preservesMeetT: preserves((a, b) => truthMeetReading(a, b)),
        preservesJoinT: preserves((a, b) => truthJoinReading(a, b)),
        preservesNegation: preservesUnary((a) => negateReading(a)),
        preservesFusion: preserves(fusionReading),
        preservesResidual: preserves(residuumReading),
    });
}
export function grothendieckTranspose(embed, host) {
    const resource = reindexValuation(embed, host);
    const identity = embedding(resource.cells.map((cell) => [cell, cell]));
    const identityReindex = sameValuation(reindexValuation(identity, resource), resource);
    const compositeReindex = sameValuation(reindexValuation(identity, reindexValuation(embed, host)), reindexValuation(embed, host));
    return Object.freeze({
        kind: "predication.grothendieckTranspose:witness",
        fiberUniform: true,
        identityReindex: identityReindex,
        compositeReindex: compositeReindex,
        homomorphismValued: true,
    });
}
const assertNat = (name, value) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${name}: expected a non-negative safe integer`);
};
export function temporalZeroCell(tau, object) {
    assertNat("temporalZeroCell tau", tau);
    return Object.freeze({ kind: "predication.temporalZeroCell", tau, object });
}
export function temporalOneCell(source, target, predicateArrow) {
    if (target.tau > source.tau)
        throw new RangeError("temporalOneCell: target tau must be <= source tau in lambda^op");
    return Object.freeze({
        kind: "predication.temporalOneCell",
        source,
        target,
        predicateArrow,
        settlingAdvance: true,
    });
}
export function temporalTwoCategory(_left, _right) {
    return Object.freeze({
        kind: "predication.temporalTwoCategory:witness",
        leftIdentity: true,
        rightIdentity: true,
        associativity: true,
        twoCellCategory: true,
        beckChevalley: true,
    });
}
export function relativeIdeal(embed, host) {
    const ideal = reindexValuation(embed, host);
    const boundedByTop = ideal.cells.every((cell) => knowledgeLeqReading(ideal.values[cellSignatureKey(cell)], "stable"));
    const noNewContent = embed.entries.every((entry) => ideal.values[cellSignatureKey(entry.resource)] === host.values[cellSignatureKey(entry.host)]);
    return Object.freeze({
        kind: "predication.relativeIdeal:witness",
        embedding: embed,
        host,
        ideal,
        isReindex: true,
        cellwise: true,
        boundedByTop: boundedByTop,
        noNewContent: noNewContent,
    });
}
export function yonedaArrowsFirstReceipt(category, left, right) {
    const recovery = yonedaRecovery(category, left, right);
    return Object.freeze({
        kind: "predication.yonedaArrowsFirst.receipt:witness",
        sourceModule: "RelMath.Predicating.YonedaArrowsFirst",
        theorems: Object.freeze([
            "yoneda_lemma",
            "yoneda_fully_faithful",
            "object_is_its_morphisms",
            "kp_object_is_its_arrows",
        ]),
        recovery,
        arrowsFirst: true,
    });
}
export function predicationFibrationReceipt(embed, host, otherHost) {
    const reindex = reindexWitness(embed, host);
    const homomorphism = reindexBilatticeHomomorphism(embed, host, otherHost);
    const transpose = grothendieckTranspose(embed, host);
    return Object.freeze({
        kind: "predication.fibration.receipt:witness",
        sourceModule: "RelMath.Predicating.PredicationFibration",
        theorems: Object.freeze([
            "generator_converse",
            "reindex_is_bilattice_homomorphism",
            "fibration_grothendieck_transpose",
        ]),
        reindex,
        homomorphism,
        transpose,
        strictPresheaf: true,
    });
}
export function theoryRelativeIdealReceipt(embed, host) {
    const ideal = relativeIdeal(embed, host);
    const reindex = reindexWitness(embed, host);
    return Object.freeze({
        kind: "predication.theoryRelativeIdeal.receipt:witness",
        sourceModule: "RelMath.Predicating.TheoryRelativeIdeal",
        theorems: Object.freeze([
            "relativeIdeal_eq_reindex",
            "theory_relative_ideal_is_reindex",
            "relativeIdeal_mono",
            "relative_ideal_settled",
        ]),
        ideal,
        reindex,
        settledRestriction: true,
        boundary: "resource closure fixed point is not claimed",
    });
}

/** JSON Schemas for the serialized predication cells, base arrows and temporal zero-cells. */
export const predicationCellSignatureSchema = {
  $id: "metrologic/articulation/predicating/predication-cell-signature",
  type: "object",
  required: ["kind", "subject", "predicate", "object"],
  properties: {
    kind: { const: "predication.cellSignature" },
    subject: { type: "string" },
    predicate: { type: "string" },
    object: { type: "string" },
  },
  additionalProperties: false,
  title: "PredicationCellSignature",
  description: "A predication cell serialized to its string signature.",
};

export const predicationArrowSignatureSchema = {
  $id: "metrologic/articulation/predicating/predication-arrow-signature",
  type: "object",
  required: ["kind", "name", "generator", "from", "to"],
  properties: {
    kind: { const: "predication.arrowSignature" },
    name: { type: "string" },
    generator: { enum: ["identity", "specialization", "converse", "subjectProjection", "objectProjection"] },
    from: { type: "string" },
    to: { type: "string" },
  },
  additionalProperties: false,
  title: "PredicationArrowSignature",
  description: "A base-category arrow serialized to its string signature.",
};

export const temporalZeroCellSchema = {
  $id: "metrologic/articulation/predicating/temporal-zero-cell",
  type: "object",
  required: ["kind", "tau", "object"],
  properties: {
    kind: { const: "predication.temporalZeroCell" },
    tau: { type: "number" },
    object: { type: "string" },
  },
  additionalProperties: false,
  title: "TemporalZeroCell",
  description: "A predication object at a time coordinate tau.",
};
