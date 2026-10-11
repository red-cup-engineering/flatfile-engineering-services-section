import { resolve } from "node:path";
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { confineExistingPath, isMarkdownPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";

export async function readMarkdownFile(pathOrOptions) {
  const options = typeof pathOrOptions === "string" ? { path: pathOrOptions } : pathOrOptions;
  if (!options || typeof options.path !== "string" || options.path.length === 0) throw new TypeError("path must be a nonempty string");
  if (!isMarkdownPath(options.path)) throw new TypeError("path must name a Markdown file");
  const address = options.root === undefined
    ? { path: resolve(options.path), relativePath: options.path }
    : await confineExistingPath({ root: options.root, path: options.path, allowRoot: false });
  return readFileText(address.path);
}
