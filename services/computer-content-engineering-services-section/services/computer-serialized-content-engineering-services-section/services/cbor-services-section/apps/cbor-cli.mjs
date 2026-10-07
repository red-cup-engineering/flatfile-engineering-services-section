import { encodeCbor, decodeCbor, deriveCborNi } from "../src/cbor.mjs";

const verb = (name, description, operation) => Object.freeze({ name, description, operation, inputSchema: { type: "object" }, outputSchema: { type: "object" } });

/**
 * The CBOR verbs as one operation catalog: each verb is one of this section's own fabricated
 * operations from src/cbor.mjs, answering one JSON request per stdin line with one NDJSON
 * response. Run it as `run-javascript-node-operation-module <this file> <verb> < request.ndjson`.
 */
export const catalog = Object.freeze({
  name: "cbor-cli",
  description: "Dispatches one CBOR verb per line of stdin JSON to NDJSON stdout.",
  operations: Object.freeze({
    encode: verb("encode", "Encodes an admitted carrier value as base64 canonical CBOR: {value} -> {base64}", encodeCbor),
    decode: verb("decode", "Decodes base64 canonical CBOR back into its carrier value: {base64} -> {value}", decodeCbor),
    "derive-ni": verb("derive-ni", "Names a value's canonical CBOR encoding with its RFC 6920 ni: URI: {value} -> {uri}", deriveCborNi),
  }),
});
