/** Frozen legacy RMN runtime-v7 ingress; split RMN itself has no `ascribe`. */
import { canonicalEqual } from "@red-cup-engineering/cbor-services-section";
import { decodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/computer-networking-engineering-services-section/signgraph/relational-value";
export function decodeLegacyAscribedRelationalWire(term) {
  if (!Array.isArray(term) || term.length !== 3 || term[0] !== "ascribe" || !canonicalEqual(term[1], RELATIONAL_VALUE_TYPE)) throw new Error("expected canonical legacy relational ascription");
  return decodeRelationalValue(term[1], term[2]);
}
