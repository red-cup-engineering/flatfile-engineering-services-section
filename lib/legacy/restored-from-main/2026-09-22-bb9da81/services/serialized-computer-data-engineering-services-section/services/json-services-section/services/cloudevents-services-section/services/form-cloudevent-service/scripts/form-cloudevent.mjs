#!/usr/bin/env node
import { runJavascriptNodeOperation } from "../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";
const OPTIONAL = ["time", "datacontenttype", "dataschema", "subject"];
const nonempty = (v) => typeof v === "string" && v.length > 0;

/**
 * Forms one CloudEvent 1.0 record from caller-owned attributes without minting anything.
 * @param {object} request A record with id, source, type, optional context attributes, data, and extensions.
 * @returns {object} A CloudEvent record.
 * @throws {TypeError} When id, source, or type is missing, or specversion is not 1.0.
 */
export function formCloudEvent(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request is required");
  for (const name of ["id", "source", "type"]) if (!nonempty(request[name])) throw new TypeError(`${name} is required`);
  if (request.specversion !== undefined && request.specversion !== "1.0") throw new TypeError("specversion must be 1.0");
  const event = { specversion: "1.0", id: request.id, source: request.source, type: request.type };
  for (const name of OPTIONAL) if (request[name] !== undefined) event[name] = request[name];
  if (request.data !== undefined) event.data = request.data;
  const extensions = request.extensions ?? {};
  if (extensions === null || typeof extensions !== "object" || Array.isArray(extensions)) throw new TypeError("extensions must be an object");
  for (const [name, value] of Object.entries(extensions)) event[name] = value;
  return event;
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "form-cloudevent", description: "Forms one CloudEvent 1.0 record from caller-owned attributes without minting anything.", operation: formCloudEvent }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
