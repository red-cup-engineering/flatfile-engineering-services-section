import { measureMarkdownDatePath } from "./measure-markdown-date-path.mjs";
import { projectMarkdownDatePath } from "./project-markdown-date-path.mjs";

const relations = new Set(["authored", "created", "published", "recorded", "source-named", "collection-captured", "archive-accessioned", "repository-observed", "undated"]);

function admitEvidence(evidence) {
  if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) throw new TypeError("evidence must be an object");
  const { date, time = null, relation, source, locator, lexeme } = evidence;
  if (!relations.has(relation)) throw new RangeError("evidence relation is not admitted");
  if (date === null && relation !== "undated") throw new RangeError("null date evidence must use the undated relation");
  if (date !== null && relation === "undated") throw new RangeError("dated evidence cannot use the undated relation");
  for (const [name, value] of [["source", source], ["locator", locator]]) {
    if (typeof value !== "string" || value.length === 0) throw new TypeError(`evidence ${name} must be a nonempty string`);
  }
  if (lexeme !== null && (typeof lexeme !== "string" || lexeme.length === 0)) throw new TypeError("evidence lexeme must be a nonempty string or null");
  return Object.freeze({ date, time, relation, source, locator, lexeme });
}

/** Admit a path iff it is canonical for one explicit, attributable evidence record. */
export function admitMarkdownDatePath({ path, evidence, filingTime = null, slug, extension }) {
  const admittedEvidence = admitEvidence(evidence);
  if (filingTime !== null && filingTime !== admittedEvidence.time) throw new RangeError("filing time must be omitted or exactly supported by the selected evidence");
  const measurement = measureMarkdownDatePath(path);
  if (!measurement.conformant) throw new RangeError(`nonconformant Markdown date path: ${measurement.findings.map(({ rule }) => rule).join(", ")}`);
  const projection = projectMarkdownDatePath({ date: admittedEvidence.date, time: filingTime, slug, extension });
  if (path !== projection.path) throw new RangeError(`path overstates, understates, or contradicts its evidence; expected ${projection.path}`);
  return Object.freeze({ kind: "red-cup-engineering.admitted-markdown-date-path", path, evidence: admittedEvidence, filingTime, precision: projection.precision, slug, extension });
}
