import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyMarkdownDocumentMoves } from "./move-markdown-documents.mjs";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { removeMarkdownFile } from "./remove-markdown-file.mjs";
import { scanMarkdownTreeLinks } from "./scan-markdown-tree-links.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

const USAGE = "usage: move-markdown-documents.mjs <root> <moves.json> [region]\nmoves.json maps each root-relative source path to its destination path; links in and out are rebased.";

async function pathExists({ root, path }) {
  try { await access(resolve(root, path)); return true; } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export const command = Object.freeze({
  run: async ({ argv }) => {
    const [root, movesPath, region = ""] = argv;
    if (!root || !movesPath) throw new Error(USAGE);
    const moves = new Map(Object.entries(JSON.parse(await readFile(movesPath, "utf8"))));
    return applyMarkdownDocumentMoves({
      root, region, limit: 500_000, maxScan: 5_000_000, moves,
      scan: scanMarkdownTreeLinks, read: readMarkdownFile, write: writeMarkdownFile, exists: pathExists, remove: removeMarkdownFile,
    });
  },
  formatResult: (result) => `${JSON.stringify(result, null, 2)}\n`,
});
