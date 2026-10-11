/**
 * Articulating as one addressable operation: an admitted token/claim
 * utterance opened as an articulation cell. The operation apex names the
 * operation, its request and receipt kinds, and its readings in Node, Lean and
 * Solidity; the receipt carries the cell under the semantic identities of the
 * request and of itself. A request crosses a wire as the canonical bytes of
 * `{ kind, operation, input }`.
 */
import { bytesEqual, decodeSemantic, semanticBytes, semanticId, utf8Bytes } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { mark } from "./mark.mjs";
import { articulate, utterance } from "./utterance.mjs";

export const ARTICULATE_OPERATION = "articulate-utterance";
export const ARTICULATING_REQUEST_KIND = "obsmetrologia.articulating.request";
export const ARTICULATING_RECEIPT_KIND = "obsmetrologia.articulating.receipt";
export const MAX_ARTICULATING_INPUT_BYTES = 65_536;

export const ARTICULATING_LANGUAGE_IDENTIFIERS = Object.freeze({
  operation: ARTICULATE_OPERATION,
  node: "@red-cup-engineering/signcell/utterance#articulate",
  lean: "Obsmetrologia.Articulating.Cell.initial",
  solidity: "ArticulationCell.seat",
});

export const ARTICULATING_APEX_BODY = Object.freeze({
  kind: "obsmetrologia.articulating.operation-apex",
  version: 1,
  operation: ARTICULATE_OPERATION,
  precondition: ARTICULATING_REQUEST_KIND,
  postcondition: ARTICULATING_RECEIPT_KIND,
  implementations: ARTICULATING_LANGUAGE_IDENTIFIERS,
});
export const ARTICULATING_APEX = semanticId(ARTICULATING_APEX_BODY);

function boundedInput(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("articulate-utterance input must be an object");
  if (utf8Bytes(JSON.stringify(value)).length > MAX_ARTICULATING_INPUT_BYTES) throw new RangeError(`articulate-utterance input exceeds ${MAX_ARTICULATING_INPUT_BYTES} bytes`);
  if (value.apex !== undefined && value.apex !== ARTICULATING_APEX) throw new TypeError("articulate-utterance input is bound to a different apex");
  if (!Object.hasOwn(value, "tokenMark") || !Object.hasOwn(value, "claimMark")) throw new TypeError("articulate-utterance requires tokenMark and claimMark");
  return value;
}

/** Open one token/claim utterance as an articulation cell, with its receipt identity. */
export function executeArticulateUtterance(value) {
  const input = boundedInput(value);
  // The cell is built by the real Mark/Utterance constructors, then copied to
  // own properties so its canonical bytes never carry host class prototypes.
  const cell = structuredClone(articulate(utterance(mark(input.tokenMark), mark(input.claimMark))));
  const body = Object.freeze({
    kind: ARTICULATING_RECEIPT_KIND,
    apex: ARTICULATING_APEX,
    operation: ARTICULATE_OPERATION,
    requestNi: semanticId(input),
    identifiers: ARTICULATING_LANGUAGE_IDENTIFIERS,
    cell,
  });
  return Object.freeze({ ...body, id: semanticId(body) });
}

export const articulateUtteranceAction = Object.freeze({
  verb: ARTICULATE_OPERATION,
  inputFormat: "json",
  outputFormat: "json",
  summary: "Open one admitted token/claim utterance as an Obsmetrologia articulation cell.",
  run: executeArticulateUtterance,
});

export const articulatingApex = Object.freeze({
  packageName: "@red-cup-engineering/computer-data-engineering-services-section",
  basePath: "/articulating",
  apex: ARTICULATING_APEX,
  actions: Object.freeze([articulateUtteranceAction]),
  resource: ARTICULATING_APEX_BODY,
});

/** One articulating request as canonical bytes and their semantic identity. */
export function encodeArticulatingRequest(input) {
  const request = { kind: ARTICULATING_REQUEST_KIND, operation: ARTICULATE_OPERATION, input: boundedInput(input) };
  return Object.freeze({ mediaType: "application/cbor", request, bytes: semanticBytes(request), semanticId: semanticId(request) });
}

/** Admit canonical articulating request bytes; refuses noncanonical bytes and other operations. */
export function decodeArticulatingRequest(bytes) {
  const source = Uint8Array.from(bytes);
  const request = decodeSemantic(source);
  if (!bytesEqual(semanticBytes(request), source)) throw new TypeError("articulating request bytes are not canonical");
  if (request?.kind !== ARTICULATING_REQUEST_KIND || request.operation !== ARTICULATE_OPERATION) throw new TypeError(`Obsmetrologia articulating expected one ${ARTICULATE_OPERATION} ${ARTICULATING_REQUEST_KIND}`);
  boundedInput(request.input);
  return Object.freeze({ request, semanticId: semanticId(request) });
}
