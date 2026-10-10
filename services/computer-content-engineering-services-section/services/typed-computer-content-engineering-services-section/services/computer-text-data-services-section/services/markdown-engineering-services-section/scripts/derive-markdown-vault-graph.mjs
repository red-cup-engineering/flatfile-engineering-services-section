import { deriveMarkdownVaultGraph } from "../src/derive-markdown-vault-graph.mjs";

export const operation = Object.freeze({ name: "derive-markdown-vault-graph", description: "Projects the relation graph of one Markdown vault document index, without I/O.", operation: deriveMarkdownVaultGraph });
