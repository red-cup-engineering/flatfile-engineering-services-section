import { eavtRow } from "./admit-row.mjs";
import { foldEavtEvidence } from "./fold-eavt-evidence.mjs";
import { readFileSync } from "node:fs";
export const inputSchema = Object.freeze({
  type: "object",
  required: ["subject", "predicate", "side", "by", "witness"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["e", "a", "v", "t"],
});
// A Fregean predication fixes one oriented (subject, predicate, object) point; evidence for it and
// evidence against it are independent coordinates (Obsmetrologia FregeanFourChu,
// independentEvidence : Bool × Bool -> FOUR). Relational converse and subject/object reversal are
// never denial. One observation is an exact EAVT row whose `t` names the side and the observer.
export const INDEPENDENT_EVIDENCE_WITNESS_KIND = "predication.independent-evidence";
export function independentEvidenceRow({ subject, predicate, object, side, by, witness } = {}) {
  if (typeof subject !== "string" || subject === "")
    throw new TypeError("subject must be a non-empty string");
  if (typeof predicate !== "string" || predicate === "")
    throw new TypeError("predicate must be a non-empty string");
  if (side !== "positive" && side !== "negative")
    throw new TypeError("side must be positive or negative");
  if (typeof by !== "string" || by === "")
    throw new TypeError("by must be a non-empty string");
  if (witness === undefined) throw new TypeError("witness is required");
  return eavtRow({
    e: subject,
    a: predicate,
    v: object,
    t: Object.freeze({ kind: INDEPENDENT_EVIDENCE_WITNESS_KIND, version: 1, side, by, witness }),
  });
}
// The side an EAVT row witnesses, or null when it carries no independent-evidence witness.
export function independentEvidenceSide(row) {
  const t = row?.t;
  if (t?.kind !== INDEPENDENT_EVIDENCE_WITNESS_KIND) return null;
  if (t.version !== 1) throw new TypeError("independent evidence witness must be version 1");
  if (t.side !== "positive" && t.side !== "negative")
    throw new TypeError("independent evidence witness side must be positive or negative");
  return t.side;
}
// One subject's claims (seeded at ⊥) and independent-evidence rows folded; other rows tell nothing.
export function foldIndependentEvidence({ subject, claims = [], rows, retract } = {}) {
  return foldEavtEvidence({ subject, claims, rows, retract, sideOf: independentEvidenceSide });
}
if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(independentEvidenceRow(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
