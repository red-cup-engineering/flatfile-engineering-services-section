/**
 * Bitcoin-alphabet Base58, retaining the byte-input and Buffer-output interface. Its canonical owner is
 * `@red-cup-engineering/base58-encoding-service` in red-cup-engineering/serialized-data-services-section,
 * which this workspace does not mount, so a workspace dependency on it never resolves; until it is mounted
 * (or released through the house registry), this export carries the same codec over `@scure/base`.
 */
import { base58 } from "@scure/base";

export function encode(bytes) { return base58.encode(Buffer.from(bytes)); }
export function decode(text) { return Buffer.from(base58.decode(text)); }
