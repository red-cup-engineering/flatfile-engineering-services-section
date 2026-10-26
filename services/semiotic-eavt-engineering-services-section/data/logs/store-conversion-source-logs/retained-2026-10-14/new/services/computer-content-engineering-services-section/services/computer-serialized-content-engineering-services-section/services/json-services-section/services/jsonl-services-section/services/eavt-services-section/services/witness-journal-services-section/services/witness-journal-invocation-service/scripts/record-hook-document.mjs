#!/usr/bin/env node
import { recordHookDocument } from "../src/record-hook-document.mjs";

export const recordHookDocumentScript = (document) => recordHookDocument(document);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

if (import.meta.main) {
  try {
    process.stdout.write(recordHookDocumentScript(await readStdin()));
  } catch (error) {
    process.stderr.write(`record-hook-document: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
