/** Pure laws for journal events: content-address path arithmetic, event
 *  identity, and EAVT-row/event codec transformations. No filesystem effect:
 *  reading and admitting events lives in `write-journal-store.mjs`, which
 *  imports these laws rather than recomputing them. */
import path from "node:path";
import { isArtifactRef } from "../../identity/index.mjs";

import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { tm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { journalWitness } from "../event.mjs";
import { artifactStoreRoot } from "../store-root.mjs";
import { toEavt, eavtKey, eavtRecord, parse as parseEavt } from "@red-cup-engineering/eavt/row";

const CAUSAL_ADMISSION_INDEX_VERSION = 1;

/** True when `error` is a Node `EEXIST` filesystem error. A pure predicate
 *  over an error's shape -- used by every idempotent-create path in
 *  `write-journal-store.mjs` to recognize "already written, verify instead
 *  of retry" without importing anything effectful itself. */
export function alreadyExists(error) {
  return typeof error === "object" && error !== null && (error).code === "EEXIST";
}

const NI_SHA256 = "ni:///sha-256;";

/** The content digest one artifact reference addresses: its base64url SHA-256. */
export function digestSegment(id) {
  if (!isArtifactRef(id)) throw new TypeError(`not an artifact reference: ${String(id)}`);
  return id.slice(NI_SHA256.length);
}

/** The artifact reference a stored digest segment names, or undefined. */
export function referenceOfDigest(segment) {
  const reference = `${NI_SHA256}${segment}`;
  return isArtifactRef(reference) ? reference : undefined;
}

/** The directory of the journal's content-addressed artifact objects. */
export function artifactObjectDirectory(logPath) {
  return path.join(artifactStoreRoot(logPath), "objects", "sen", "sha-256");
}

export function eventDirectoryPath(logPath) {
  return `${logPath}.statements`;
}

export function eventPath(logPath, id) {
  return path.join(eventDirectoryPath(logPath), "sha-256", `${digestSegment(id)}.json`);
}

export function eventIndexDirectoryPath(logPath) {
  return path.join(`${logPath}.index`, "statements", "sha-256");
}

export function eventIndexPath(logPath, id) {
  return path.join(eventIndexDirectoryPath(logPath), `${digestSegment(id)}.json`);
}

export function causeIndexDirectoryPath(logPath, from) {
  return path.join(`${logPath}.index`, "causes", "by-from", "sha-256", digestSegment(from));
}

export function causeIndexPath(logPath, from, to) {
  return path.join(causeIndexDirectoryPath(logPath, from), `${digestSegment(to)}.json`);
}

export function receivedDirectoryPath(logPath) {
  return path.join(eventDirectoryPath(logPath), "received", "sha-256");
}

export function receivedPath(logPath, id) {
  return path.join(receivedDirectoryPath(logPath), `${digestSegment(id)}.json`);
}

export function causalAdmissionIndexRoot(logPath) {
  return path.join(artifactStoreRoot(logPath), "index", "causal-admission", `v${CAUSAL_ADMISSION_INDEX_VERSION}`);
}

export function admittedIndexDirectoryPath(logPath) {
  return path.join(causalAdmissionIndexRoot(logPath), "admitted", "sha-256");
}

export function admittedIndexPath(logPath, id) {
  return path.join(admittedIndexDirectoryPath(logPath), `${digestSegment(id)}.json`);
}

export function blockedIndexPath(logPath, id) {
  return path.join(causalAdmissionIndexRoot(logPath), "blocked", "sha-256", `${digestSegment(id)}.json`);
}

export function receivedLocationDirectory(logPath, id) {
  return path.join(causalAdmissionIndexRoot(logPath), "received", "by-witness", "sha-256", digestSegment(id));
}

export function dependentDirectory(logPath, dependency) {
  return path.join(causalAdmissionIndexRoot(logPath), "dependents", "by-dependency", "sha-256", digestSegment(dependency));
}

export function indexReadyPath(logPath) {
  return path.join(causalAdmissionIndexRoot(logPath), "ready.json");
}

export function artifactPath(logPath, ref) {
  return path.join(artifactObjectDirectory(logPath), `${digestSegment(ref)}.json`);
}

/** Every reference one received witness statement's admission depends on:
 *  its articulation, referenced artifacts, causes, and any source whose ref
 *  is neither the statement nor its site. */
export function requiredReferences(statement) {
  const references = new Set([
    statement.core.articulation,
    ...statement.core.referencedArtifacts,
    ...statement.core.causes,
  ]);
  for (const source of statement.sources) {
    if (source.ref !== statement.id && source.ref !== statement.core.site) references.add(source.ref);
  }
  return Object.freeze([...references].sort());
}

export function eventForRow(row, seat, options = {}) {
  const { t } = eavtRecord(row);
  const referencedArtifacts = options.artifacts?.map((artifact) => artifact.ref) ?? [];
  return journalWitness(Object.freeze({
    kind: "metroplat.journal.observation",
    seat,
    claim: options.claim ?? tm.mark("metroplat.eavt.row"),
    address: tm.mark(eavtKey(row)),
    time: String(t),
    causes: Object.freeze([...(options.causes ?? [])].sort()),
    payload: row,
    ...(referencedArtifacts.length === 0 ? {} : { referencedArtifacts: Object.freeze(referencedArtifacts) }),
  }));
}

export function verdictEvent(input

) {
  return journalWitness(Object.freeze({
    kind: "metroplat.journal.observation",
    seat: input.seat,
    claim: tm.mark(`metroplat.journal.inadmissible.${input.reason}`),
    address: tm.mark(input.address),
    time: input.time,
    causes: Object.freeze([...(input.causes ?? [])].sort()),
    payload: Object.freeze({
      kind: "metroplat.journal.inadmissibility-verdict",
      reason: input.reason,
      evidence: input.evidence,
      charge: "contested",
    }),
  }));
}

/** A statement core's inadmissible evidence, safe to embed in a verdict
 *  event: the JSON value when it validates, else its string projection. */
export function evidenceJson(value, message) {
  try {
    return Object.freeze({ message, value: requireJsonValue(value, "inadmissible statement evidence") });
  } catch {
    return Object.freeze({ message, value: String(value) });
  }
}

/** A statement core's admission time, defaulting to the epoch date when the
 *  core carries no usable `time` field. */
export function coreTime(value) {
  return typeof value === "object"
    && value !== null
    && typeof (value).time === "string"
    && (value).time.length > 0
    ? (value).time
    : "0000-00-00T00:00:00.000Z";
}

export function rowFromStatement(statement) {
  const payload = statement.observation.payload;
  if (!Array.isArray(payload)) return undefined;
  try {
    return toEavt(eavtRecord(payload));
  } catch {
    return undefined;
  }
}

/** Partition read statements into their EAVT rows and the malformed
 *  statements whose payload never decoded to one. */
export function rowsOfStatements(statements) {
  const rows = [];
  const verdicts = [];
  for (const statement of statements) {
    const row = rowFromStatement(statement);
    if (row === undefined) verdicts.push(statement);
    else rows.push(row);
  }
  return Object.freeze({ statements, rows: Object.freeze(rows), verdicts: Object.freeze(verdicts) });
}

export function parseLegacyLineAsEvents(line, seat, time, address) {
  try {
    return Object.freeze(parseEavt(line).map((row) => eventForRow(toEavt(row), seat)));
  } catch (error) {
    return Object.freeze([verdictEvent({
      seat,
      reason: "malformed-line",
      address,
      time,
      evidence: Object.freeze({
        line,
        message: error instanceof Error ? error.message : "unreadable legacy line",
      }),
    })]);
  }
}
