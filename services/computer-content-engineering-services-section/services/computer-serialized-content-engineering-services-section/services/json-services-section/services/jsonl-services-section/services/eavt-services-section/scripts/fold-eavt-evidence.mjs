import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { eavtRow } from "./admit-row.mjs";
import { identifyContentAddressedRow } from "./identify-content-addressed-row.mjs";
import { cell, merge, told } from "@red-cup-engineering/signcell/cell";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["subject", "rows"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["entity", "fiber"],
});
const pointKey = (predicate, object) => canonicalJson([predicate, object]);
// One subject's trace folded into its fiber: one SignCell cell per (predicate, object), each row's
// identity told for or against it, cells merged. `claims` seed points at ⊥. `sideOf(row)` names the
// side a row witnesses ("positive", "negative", or null for a row that is not evidence); without it
// every row is positive unless `converse` maps its predicate onto the one it opposes (in-trace
// `has-converse` rows add to that map). A `{ not: X }` value tells the cell of X against. A null `v` is a
// retraction: earlier rows of that attribute on the subject stop counting. Under a `functional`
// predicate (one object at a time) every object told for stands against each other object.
export function foldEavtEvidence({
  subject,
  rows,
  claims = [],
  sideOf,
  retract = true,
  converse,
  functional = [],
} = {}) {
  if (typeof subject !== "string" || subject.length === 0)
    throw new TypeError("subject must be a non-empty string");
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  if (!Array.isArray(claims)) throw new TypeError("claims must be an array");
  if (sideOf !== undefined && converse !== undefined)
    throw new TypeError("sideOf and converse are exclusive");
  const trace = rows.map(eavtRow),
    opposites = converse === undefined ? undefined : { ...converse };
  if (opposites)
    for (const item of trace)
      if (item.a === "has-converse" && typeof item.v === "string")
        opposites[item.v] = item.e;
  const tombstones = new Map();
  if (retract)
    for (const item of trace)
      if (
        item.e === subject &&
        item.v === null &&
        (!tombstones.has(item.a) || item.t > tombstones.get(item.a))
      )
        tombstones.set(item.a, item.t);
  const cells = new Map();
  for (const [index, claim] of claims.entries()) {
    if (!claim || typeof claim !== "object" || Array.isArray(claim))
      throw new TypeError(`claims[${index}] must be an object`);
    if (claim.subject !== subject)
      throw new TypeError(`claims[${index}].subject must equal the folded subject`);
    if (typeof claim.predicate !== "string" || claim.predicate === "")
      throw new TypeError(`claims[${index}].predicate must be a non-empty string`);
    cells.set(pointKey(claim.predicate, claim.object), cell(subject, claim.predicate, claim.object));
  }
  for (const item of trace) {
    if (
      item.e !== subject ||
      item.v === null ||
      (opposites && item.a === "has-converse") ||
      (tombstones.has(item.a) && item.t < tombstones.get(item.a))
    )
      continue;
    const side = sideOf ? sideOf(item) : "positive";
    if (side === null) continue;
    if (side !== "positive" && side !== "negative")
      throw new TypeError("sideOf must return positive, negative, or null");
    const denial = item.v !== null && typeof item.v === "object" && !Array.isArray(item.v) && Object.keys(item.v).length === 1 && "not" in item.v;
    const object = denial ? item.v.not : item.v;
    const predicate = opposites?.[item.a] ?? item.a,
      negative = (side === "negative") !== denial || predicate !== item.a,
      key = pointKey(predicate, object);
    const id = identifyContentAddressedRow({ row: item }).identity;
    const telling = cell(subject, predicate, object, negative ? { against: [id] } : { for: [id] });
    const prior = cells.get(key);
    cells.set(key, prior === undefined ? telling : merge(prior, telling));
  }
  const single = new Set(functional);
  if (single.size > 0) {
    const told = [...cells.values()];
    for (const [key, at] of cells) {
      if (!single.has(at.predicate)) continue;
      const rivals = told.filter((other) => other !== at && other.predicate === at.predicate && other.for.length > 0).flatMap((other) => other.for);
      if (rivals.length > 0) cells.set(key, merge(at, cell(subject, at.predicate, at.object, { against: rivals })));
    }
  }
  return {
    entity: subject,
    fiber: [...cells.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, at]) => ({
        predicate: at.predicate,
        object: at.object,
        value: {
          pos: told(at)[0] ? 1 : 0,
          neg: told(at)[1] ? 1 : 0,
          evidence: [at.for, at.against],
        },
      })),
  };
}
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    `${JSON.stringify(foldEavtEvidence(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
}
