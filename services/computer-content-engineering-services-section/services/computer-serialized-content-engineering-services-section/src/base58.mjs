import { base58 } from "@scure/base";

/** Bitcoin-alphabet Base58, retaining the existing byte-input and Buffer-output API. */
export function encode(bytes) { return base58.encode(Buffer.from(bytes)); }
export function decode(text) { return Buffer.from(base58.decode(text)); }
