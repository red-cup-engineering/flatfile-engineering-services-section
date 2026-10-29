import { immutableJsonValue } from "../../../src/index.mjs";
import { isJsonRecord } from "../../../src/index.mjs";

export function projectJsonRecordKeys({ record, keys } = {}) {
  if (!isJsonRecord(record)) throw new TypeError("record must be a JSON object");
  if (!Array.isArray(keys) || keys.length === 0 || keys.some((key) => typeof key !== "string" || key.length === 0)) {
    throw new TypeError("keys must be a nonempty array of nonempty strings");
  }
  const projection = {};
  for (const key of new Set(keys)) {
    if (Object.hasOwn(record, key)) projection[key] = record[key];
  }
  return immutableJsonValue(projection);
}
