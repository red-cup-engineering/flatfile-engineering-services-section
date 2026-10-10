import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { resolve } from "node:path";

export async function readTextFile({ path } = {}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  const absolutePath = resolve(path);
  return Object.freeze({ type: "TextFileRead", path: absolutePath, text: await readFileText(absolutePath) });
}

export const operation = Object.freeze({ name: "read-text-file", description: "readTextFile — the read-text-file operation.", operation: readTextFile });
