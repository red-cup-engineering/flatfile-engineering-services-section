import type { JsonValue } from "../../../../../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { Seavt, SeavtReadout, SeavtTuple } from "@red-cup-engineering/eavt/row";

export interface SeavtRdfProjection {
  readonly graph: `ni:///sha-256;${string}`;
  readonly token: `ni:///sha-256;${string}`;
  readonly mediaType: "application/n-quads";
  readonly bytes: Uint8Array;
  readonly canonicalNQuads: string;
  readonly statementCount: 2;
  readonly source: SeavtReadout;
  readonly coordinateTokens: Readonly<{ e: `ni:///sha-256;${string}`; a: `ni:///sha-256;${string}`; v: `ni:///sha-256;${string}` }>;
}

export declare function projectSeavtRdf(
  row: Seavt | SeavtTuple,
  options: { readonly graph: `ni:///sha-256;${string}` },
): Promise<SeavtRdfProjection>;

export declare function verifySeavtRdfProjection(projection: unknown): Promise<boolean>;

export type { JsonValue, Seavt, SeavtReadout, SeavtTuple };
