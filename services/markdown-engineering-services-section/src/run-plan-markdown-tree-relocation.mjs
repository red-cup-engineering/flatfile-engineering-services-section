import { planMarkdownTreeRelocationFromDisk } from "./plan-markdown-tree-relocation.mjs";
import { parseRelocationCliArguments, relocationCliUsage } from "./markdown-tree-relocation-cli.mjs";
import { observeMarkdownVaultDirectory } from "./observe-markdown-vault-directory.mjs";
import { scanMarkdownTreeLinks } from "./scan-markdown-tree-links.mjs";

export const command = Object.freeze({
  run: async ({ argv, stdout }) => {
    const arguments_ = parseRelocationCliArguments(argv);
    if (arguments_.help) {
      stdout.write(relocationCliUsage("plan-markdown-tree-relocation", "Plans"));
      return undefined;
    }
    const { root, sourceDir, destDir, region, limit, maxScan } = arguments_;
    if (!root || !sourceDir || !destDir) {
      throw new Error("usage: plan-markdown-tree-relocation.mjs <root> <sourceDir> <destDir> [relation-universe] [limit] [max-scan]");
    }
    const result = await planMarkdownTreeRelocationFromDisk({
      root, sourceDir, destDir, region, limit, maxScan,
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory,
    });
    return result;
  },
  formatResult: (result) => result === undefined ? "" : `${JSON.stringify(result, null, 2)}\n`,
  resultExitCode: (result) => (result?.type === "MarkdownTreeRelocationRefusal" ? 1 : 0),
});
