import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { niUriDigest } from "@red-cup-engineering/uri-services-section/ni-uri";
function text(value) { if (value === undefined || value === null) return null; const result = String(value).trim(); return result === "" ? null : result; }
function hash(value) { return niUriDigest(semanticId(value)); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 72) || "checkpoint"; }
function count(value) { const number = Number(value ?? 0); return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0; }

/** Admit explicit journal counts and file witnesses as one checkpoint event. */
export function admitJournalCheckpoint(params, carriers, options = {}) {
  const at = text(options.at ?? params.at); if (at === null) throw new TypeError("at must be nonempty text");
  if (!carriers || !Array.isArray(carriers.files)) throw new TypeError("carriers.files must be an array");
  const label = text(params.label ?? params.q) ?? "checkpoint"; const reason = text(params.reason) ?? "externalized journal state checkpoint"; const source = text(params.source) ?? "journal-checkpoint-projection-service";
  const counts = Object.freeze({ goals: count(carriers.counts?.goals), work: count(carriers.counts?.work), context: count(carriers.counts?.context), operations: count(carriers.counts?.operations), readinessScore: count(carriers.counts?.readinessScore) });
  const files = Object.freeze(carriers.files.map((file) => Object.freeze({ path: String(file.path), exists: file.exists === true, bytes: count(file.bytes), sha256: typeof file.sha256 === "string" ? file.sha256 : null })));
  const seed = { at, label, reason, source, counts, files: files.map(({ path, sha256 }) => [path, sha256]) }; const id = `checkpoint:${slug(label)}:${hash(seed).slice(0, 16)}`; const eventId = `checkpoint-event:${hash({ id, seed }).slice(0, 24)}`;
  const value = Object.freeze({ kind: "journal-checkpoint.record", id, eventId, at, label, reason, source, flow: Object.freeze(["journal-logs", "application-fold", "state-readouts", "json-interface"]), counts, files });
  return Object.freeze({ kind: "journal-checkpoint.admission", accepted: true, id, value, event: Object.freeze([id, "journal-checkpoint.recorded", value, Object.freeze({ at, eventId })]) });
}
