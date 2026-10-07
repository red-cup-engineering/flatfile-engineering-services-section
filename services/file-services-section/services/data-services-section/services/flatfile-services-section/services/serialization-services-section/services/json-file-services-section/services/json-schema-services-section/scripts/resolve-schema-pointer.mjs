#!/usr/bin/env node
import * as json from "@red-cup-engineering/json-services-section";
import { freezeJson } from "@red-cup-engineering/json-services-section";

import contract from "../schemas/resolve-schema-pointer.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;
export function resolveSchemaPointer({ document, pointer }) {
  json.requireJsonValue(document);
  if (typeof pointer !== "string") throw new TypeError("pointer must be text");
  if (pointer === "" || pointer === "#")
    return { found: true, value: document };
  let path = pointer.startsWith("#") ? pointer.slice(1) : pointer;
  try {
    if (pointer.startsWith("#")) path = decodeURIComponent(path);
  } catch {
    return { found: false };
  }
  if (!path.startsWith("/")) return { found: false };
  let current = document;
  for (const raw of path.slice(1).split("/")) {
    if (/~(?:[^01]|$)/u.test(raw)) return {found:false};
    const key = raw.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current) && /^(?:0|[1-9][0-9]*)$/u.test(key) && Number(key) < current.length && Object.hasOwn(current, key))
      current = current[Number(key)];
    else if (json.isJsonRecord(current) && Object.hasOwn(current, key))
      current = current[key];
    else return { found: false };
    if (current === undefined) return { found: false };
  }
  return { found: true, value: current };
}

