import { readMarkdownTable } from "../src/read-markdown-table.mjs";

export const operation = Object.freeze({ name: "read-markdown-table", description: "Reads one GitHub-flavored Markdown table as headers and header-keyed rows.", operation: readMarkdownTable });
