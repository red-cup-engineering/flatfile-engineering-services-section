import { applyMarkdownLinkRepair } from "./apply-markdown-tree-relocation.mjs";
import { scanMarkdownTreeLinks } from "./scan-markdown-tree-links.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

export const command = Object.freeze({
  run: async ({ argv }) => {
    const [root, region = "", limit = "200000", maxScan = "2000000"] = argv;
    if (!root) throw new Error("usage: apply-markdown-link-repair.mjs <root> [region] [limit] [max-scan]");
    const result = await applyMarkdownLinkRepair({
      root, region, limit: Number(limit), maxScan: Number(maxScan), scan: scanMarkdownTreeLinks, write: writeMarkdownFile,
    });
    return result;
  },
  formatResult: (result) => `${JSON.stringify(result, null, 2)}\n`,
  resultExitCode: (result) => (result.type === "MarkdownLinkRepairApplication" ? 0 : 1),
});
