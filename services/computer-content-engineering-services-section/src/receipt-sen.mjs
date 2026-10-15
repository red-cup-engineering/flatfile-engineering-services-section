import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";
import { freezeJson } from "@red-cup-engineering/json-services-section";
import { semanticId } from "./resource-term.mjs";

const RESOURCE_KIND = "typed-resource-catalog.resource";

/** Present a TRC receipt at the same SEN coordinate that identifies its body. */
export function receiptSen(receipt) {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) throw new TypeError("receipt must be an object");
  const { id, ...body } = receipt;
  if (semanticId(body) !== id) throw new TypeError("receipt id does not identify its canonical SEN body");
  const identified = identifyJsonSemanticContent({ objectKind: RESOURCE_KIND, value: body, witnessRoot: EMPTY_WITNESS_ROOT });
  return Object.freeze({
    mediaType: identified.mediaType,
    term: identified.envelope.settledBody,
    semanticId: id,
    bytes: identified.bytes,
  });
}

export function decodeReceiptSen(bytes) {
  const identified = admitJsonSemanticContent({ bytes, objectKind: RESOURCE_KIND });
  return freezeJson({ ...identified.value, id: identified.token });
}
