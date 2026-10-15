import { isDeepStrictEqual } from "node:util";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { jsonToTerm, termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/semantic-content-identity";

export function semanticId(value) {
  return identifyJsonSemanticContent({
    objectKind: "typed-resource-catalog.resource",
    value: JSON.parse(canonicalJson(value)),
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

/** The one SEN coordinate used for identity and every downstream projection. */
export function semanticTerm(value) {
  return jsonToTerm(JSON.parse(canonicalJson(value)));
}

export function encodeJsonTerm(value) {
  return jsonToTerm(JSON.parse(canonicalJson(value)));
}

export function decodeJsonTerm(term) {
  const value = termToJson(term);
  if (!isDeepStrictEqual(jsonToTerm(value), term)) throw new TypeError("term is not the injective JSON-to-SEN representation");
  return value;
}
