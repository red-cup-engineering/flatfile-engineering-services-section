import { runMutateMarkdownFrontmatter } from "./mutate-markdown-frontmatter.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

export const command = Object.freeze({
  run: ({ argv, stdout, stderr }) => runMutateMarkdownFrontmatter(argv, writeMarkdownFile, { stdout, stderr }),
  formatError: (error) => `mutate-markdown-frontmatter: ${error.message}\n`,
  exitCode: 64,
});
