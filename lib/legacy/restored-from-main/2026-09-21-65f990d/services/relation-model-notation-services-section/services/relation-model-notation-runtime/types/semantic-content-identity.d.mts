export interface SemanticContentIdentity {
  id: `ni:///sha-256;${string}`;
  token: `ni:///sha-256;${string}`;
  algorithm: "sha-256";
  mediaType: "application/rmn+cbor";
  bytes: Uint8Array;
}

export declare const RMN_NORMALIZATION_PROFILE: "urn:rce:rmn:normalize:0.0.1";
export declare const IDENTITY_SETTLEMENT_PROFILE: "urn:rce:settlement:identity:0.0.1";
export declare const EMPTY_WITNESS_ROOT: `ni:///sha-256;${string}`;
export declare function isCanonicalSha256NiUri(value: unknown): value is `ni:///sha-256;${string}`;
export declare function sha256DigestFromNiUri(value: unknown): string;
export declare function sha256DigestBytesFromNiUri(value: unknown): Uint8Array;
export declare function verifySha256NiUri(bytes: Uint8Array, value: unknown): boolean;

export interface NormalizedSemanticContentEnvelope<Ty = unknown, Tm = unknown> {
  kind: "relation-model-notation.normalized-semantic-content";
  version: 2;
  objectKind: string;
  semanticType: Ty;
  normalizationProfile: typeof RMN_NORMALIZATION_PROFILE;
  settlementProfile: typeof IDENTITY_SETTLEMENT_PROFILE;
  settledBody: Tm;
  witnessRoot: `ni:///sha-256;${string}`;
}

export interface NormalizedSemanticContentIdentity<Ty = unknown, Tm = unknown>
  extends SemanticContentIdentity {
  envelope: NormalizedSemanticContentEnvelope<Ty, Tm>;
}

export interface NormalizedSemanticContentInput<Ty = unknown, Tm = unknown> {
  objectKind: string;
  semanticType: Ty;
  term: Tm;
  witnessRoot: `ni:///sha-256;${string}`;
  normalizationProfile?: typeof RMN_NORMALIZATION_PROFILE;
  settlementProfile?: typeof IDENTITY_SETTLEMENT_PROFILE;
}

export declare function identifyNormalizedSemanticContent<Ty, Tm>(
  content: NormalizedSemanticContentInput<Ty, Tm>,
): NormalizedSemanticContentIdentity<Ty, Tm>;

export declare function identifyJsonSemanticContent<Value = unknown>(content: {
  objectKind: string;
  value: Value;
  witnessRoot: `ni:///sha-256;${string}`;
}): NormalizedSemanticContentIdentity;
export declare function verifyJsonSemanticRecord(content?: {
  objectKind?: string;
  value?: unknown;
  witnessRoot?: `ni:///sha-256;${string}`;
  identityField?: string;
}): boolean;
export declare function identifyBytesSemanticContent(content: {
  objectKind: string;
  bytes: Uint8Array;
  mediaType?: string;
  witnessRoot: `ni:///sha-256;${string}`;
}): NormalizedSemanticContentIdentity;

export declare function admitJsonSemanticContent<Value = unknown>(content: {
  bytes: Uint8Array;
  token?: unknown;
  objectKind: string;
}): NormalizedSemanticContentIdentity & { value: Value };

export declare function admitNormalizedSemanticContent<Ty = unknown, Tm = unknown>(
  bytes: Uint8Array,
  token?: unknown,
): NormalizedSemanticContentIdentity<Ty, Tm>;

export declare function verifyNormalizedSemanticContent<Ty, Tm>(
  token: unknown,
  envelope: NormalizedSemanticContentEnvelope<Ty, Tm>,
): boolean;
