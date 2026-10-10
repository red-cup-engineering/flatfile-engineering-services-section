import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

export async function writeTextFile({ path, text } = {}) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a nonempty string");
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const receipt = await writeFileText(path, text);
  return Object.freeze({ type: "TextFileWrite", path: receipt.path, bytes: receipt.bytes });
}

export const operation = Object.freeze({ name: "write-text-file", description: "writeTextFile — the write-text-file operation.", operation: writeTextFile });
