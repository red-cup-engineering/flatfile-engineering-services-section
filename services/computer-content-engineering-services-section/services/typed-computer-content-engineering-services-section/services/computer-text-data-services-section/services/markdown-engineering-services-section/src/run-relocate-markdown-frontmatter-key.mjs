import { runRelocateMarkdownFrontmatterKey } from "./relocate-markdown-frontmatter-key.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

export const command = Object.freeze({
  run: ({ argv, stdout }) => runRelocateMarkdownFrontmatterKey(argv, writeMarkdownFile, { stdout }),
  formatError: (error) => `relocate-markdown-frontmatter-key: ${error.message}\n`,
  exitCode: 64,
});
