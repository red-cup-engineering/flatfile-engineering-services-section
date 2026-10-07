/**
 * Admits one TextFileRead carrier for text-file consumers.
 *
 * @param {unknown} value A candidate TextFileRead carrier.
 * @param {{exactKeys?: boolean}} [options] Consumer-specific admission policy.
 * @returns {{type: "TextFileRead", path: string, text: string}} The admitted carrier.
 * @throws {TypeError} When the candidate is not an admitted TextFileRead carrier.
 */
export function requireTextFileRead(value, { exactKeys = false } = {}) {
  if (value?.type !== "TextFileRead") throw new TypeError("input must be a TextFileRead carrier");
  if (typeof value.path !== "string" || value.path.length === 0) throw new TypeError("TextFileRead.path must be a nonempty string");
  if (typeof value.text !== "string") throw new TypeError("TextFileRead.text must be a string");
  if (exactKeys) {
    const keys = Object.keys(value).sort();
    if (keys.length !== 3 || keys.join(",") !== "path,text,type") throw new TypeError("TextFileRead must carry exactly path, text, and type");
  }
  return value;
}
