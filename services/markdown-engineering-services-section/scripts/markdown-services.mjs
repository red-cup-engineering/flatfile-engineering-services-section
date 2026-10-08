#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { invokeOperation, operations as pureOperations } from "../src/type/markdown.mjs";
import { observeMarkdownVaultDirectory } from "../src/observe-markdown-vault-directory.mjs";
import { scanMarkdownTreeLinks } from "../src/scan-markdown-tree-links.mjs";
import { resolveSetOfMarkdownLinkTargets, walkMarkdownLinkTargets } from "../src/resolve-set-of-markdown-link-targets.mjs";
import { writeMarkdownFile } from "../src/write-markdown-file.mjs";
import { applyMarkdownTreeRelocation } from "../src/apply-markdown-tree-relocation.mjs";

/**
 * The pure operations of `type/markdown.mjs` extended with the operations
 * whose implementation itself reads or writes -- the kernel edge that
 * supplies the concrete effectful functions those operations need. One
 * dispatch table, one place these five effects are wired in.
 */
export const operations = Object.freeze({
  ...pureOperations,
  "observe-markdown-vault-directory": (request) => observeMarkdownVaultDirectory(request),
  "scan-markdown-tree-links": (request) => scanMarkdownTreeLinks(request),
  "resolve-set-of-markdown-link-targets": ({ text, carrierPath, root }) => resolveSetOfMarkdownLinkTargets(text, { carrierPath, root }),
  "walk-markdown-link-targets": (request) => walkMarkdownLinkTargets(request),
  "write-markdown-file": (request) => writeMarkdownFile(request),
  "apply-markdown-tree-relocation": (request) => applyMarkdownTreeRelocation({
    ...request, scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
  }),
});

export const markdownOperationNames = Object.freeze(Object.keys(operations));

/** Invoke one named Markdown operation, pure or effectful, with its JSON request. */
export async function invokeMarkdownService(operation, request) {
  return invokeOperation(operations, operation, request);
}

if (process.argv[1]) {
  const operation = basename(process.argv[1]).replace(/\.mjs$/u, "");
  if (markdownOperationNames.includes(operation)) {
    process.stdout.write(`${JSON.stringify(await invokeMarkdownService(operation, JSON.parse(readFileSync(0, "utf8"))))}\n`);
  }
}
