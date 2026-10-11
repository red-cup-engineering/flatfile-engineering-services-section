import { readFile } from "node:fs/promises";



import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { mutateMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

export function stripMarkdownFrontmatterKeys(text, keys) {
  const parsed = readMarkdownFrontmatter(text);
  const removed = [...new Set(keys)].filter((key) => Object.hasOwn(parsed.frontmatter ?? {}, key));
  return { text: removed.length === 0 ? text : mutateMarkdownFrontmatter(text, { mode: "delete", keys: removed }), removed };
}

export async function runStripMarkdownFrontmatterKey(argv, io) {
  const options = parseArguments(argv);
  const receipts = [];
  for (const path of options.paths) {
    const source = await readFile(path, "utf8");
    const result = stripMarkdownFrontmatterKeys(source, options.keys);
    if (options.apply && result.text !== source) await writeFileText(path, result.text);
    receipts.push({ path, changed: result.text !== source, removed: result.removed });
  }
  io.stdout.write(`${JSON.stringify({ applied: options.apply, receipts }, null, 2)}\n`);
  return receipts;
}

function parseArguments(argv) {
  const keys = [];
  const paths = [];
  let apply = false;
  let afterSeparator = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") { afterSeparator = true; continue; }
    if (!afterSeparator && argument === "--apply") { apply = true; continue; }
    if (!afterSeparator && argument === "--key") { keys.push(argv[++index]); continue; }
    if (!afterSeparator && argument.startsWith("--")) throw new TypeError(`unknown option ${argument}`);
    paths.push(argument);
  }
  if (keys.length === 0 || paths.length === 0 || keys.some((key) => typeof key !== "string")) {
    throw new TypeError("usage: strip-markdown-frontmatter-key --key KEY [--key KEY ...] [--apply] -- FILE.md [FILE.md ...]");
  }
  return { apply, keys, paths };
}


export const command = Object.freeze({
  run: ({ argv, stdout }) => runStripMarkdownFrontmatterKey(argv, { stdout }),
  formatError: (error) => `strip-markdown-frontmatter-key: ${error.message}\n`,
  exitCode: 64,
});
