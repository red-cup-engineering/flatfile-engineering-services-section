import { jsonToTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { inferTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import {
  EMPTY_WITNESS_ROOT,
  identifyValueSemanticContent,
  IDENTITY_SETTLEMENT_PROFILE,
  SEN_NORMALIZATION_PROFILE,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import {
  settleProofCoordinate,
} from "@red-cup-engineering/proof-path-structuration-service";

export const PROOF_COORDINATE_OBJECT_KIND = "proof-path-addressing.settled-coordinate";

/** Translate an earned PPA coordinate into the existing closed SEN term grammar. */
export function proofCoordinateTerm(coordinate) {
  const checked = settleProofCoordinate(coordinate?.settlement);
  if (!checked.ok || coordinate.type !== "rmn-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("a settled proof coordinate is required");
  }
  return jsonToTerm(checked.coordinate);
}

/** Identify one earned coordinate through the sole normalized v2 semantic envelope. */
export function identifyProofCoordinate(coordinate) {
  const term = proofCoordinateTerm(coordinate);
  const semanticType = inferTy([], term);
  if (semanticType === null) {
    throw new TypeError("a proof coordinate must translate to an inferable closed SEN term");
  }
  return identifyValueSemanticContent({
    objectKind: PROOF_COORDINATE_OBJECT_KIND,
    semanticType,
    term,
    normalizationProfile: SEN_NORMALIZATION_PROFILE,
    settlementProfile: IDENTITY_SETTLEMENT_PROFILE,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
}

/** Settle a coordinate request and identify only the successful settlement. */
export function settleAndIdentifyProofCoordinate(input) {
  const settled = settleProofCoordinate(input);
  if (!settled.ok) return settled;
  return Object.freeze({
    ...settled,
    identity: identifyProofCoordinate(settled.coordinate),
  });
}
