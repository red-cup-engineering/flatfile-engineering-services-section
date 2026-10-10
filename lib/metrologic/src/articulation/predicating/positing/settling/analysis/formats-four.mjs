import { knowledgeLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { regimeCost, regimeDecidable } from "@red-cup-engineering/computer-data-engineering-services-section/closure-regime";
import { KNOWLEDGE_BOTTOM, KNOWLEDGE_TOP, TRUTH_BOTTOM, TRUTH_TOP } from "../../../../../reading-points.mjs";
/**
 * analysis/formats-four - finite executable shadow of RelMath.Computing.FormatsFour.
 *
 * Serialization formats are classified by two independent FOUR-valued coordinates:
 * a content-commitment corner and a completion regime. The small table here is the
 * finite runtime counterpart of the Lean `Format.all` census, its regimes spoken by their
 * Obsmetrologia names.
 */
const format = (name, corner, regime) => Object.freeze({ name, corner, regime, cost: regimeCost(regime), decidable: regimeDecidable(regime) });
/** The Lean `Format.all` census: each format's content corner and completion regime (Lean
 *  `Format.corner`, `Format.regime`); its cost and decidability are read off the regime. */
export const formatRows = Object.freeze([
    format("bytes", KNOWLEDGE_BOTTOM, "strict"),
    format("plaintext", TRUTH_BOTTOM, "strict"),
    format("json", TRUTH_TOP, "transfinite-bounded"),
    format("rdf", KNOWLEDGE_TOP, "scott"),
    format("markdown", KNOWLEDGE_TOP, "strict"),
    format("html", KNOWLEDGE_TOP, "aperiodic"),
    format("tex", KNOWLEDGE_TOP, "aperiodic"),
    format("senHtml", KNOWLEDGE_TOP, "scott"),
]);
const rowOf = (name) => {
    const row = formatRows.find((candidate) => candidate.name === name);
    if (row === undefined)
        throw new RangeError(`unknown format ${name}`);
    return row;
};
const knowledgeLeq = (left, right) => knowledgeLeqReading(left.corner, right.corner);
/** The finite `FormatsClosureHierarchy` bundle: FOUR x FOUR and non-monotone cost. */
export function formatsClosureHierarchy() {
    const bytes = rowOf("bytes");
    const json = rowOf("json");
    const rdf = rowOf("rdf");
    const markdown = rowOf("markdown");
    const html = rowOf("html");
    const senHtml = rowOf("senHtml");
    const cornerNames = new Set(formatRows.map((row) => row.corner));
    if (!knowledgeLeq(bytes, json) || !(bytes.cost < json.cost)) {
        throw new Error("FormatsFour invariant failed: bytes <=K json must raise cost");
    }
    if (!knowledgeLeq(json, rdf) || !(rdf.cost < json.cost)) {
        throw new Error("FormatsFour invariant failed: json <=K rdf must lower cost");
    }
    if (senHtml.corner !== html.corner || senHtml.decidable !== true || html.decidable !== false) {
        throw new Error("FormatsFour invariant failed: SEN-in-HTML decidability");
    }
    if (cornerNames.size !== 4) {
        throw new Error("FormatsFour invariant failed: corner projection is not onto FOUR");
    }
    return Object.freeze({
        kind: "formatsFour.closureHierarchy:witness",
        formats: formatRows,
        cardinality: 8,
        cornersOnto: true,
        costRises: Object.freeze(["bytes", "json"]),
        costFalls: Object.freeze(["json", "rdf"]),
        topCornerMultiRegime: Object.freeze([markdown.name, rdf.name, html.name]),
        senHtmlRecoversDecidability: true,
    });
}
