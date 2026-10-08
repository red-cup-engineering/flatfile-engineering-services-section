import { applyMarkdownTreeRelocation } from "./apply-markdown-tree-relocation.mjs";
import { parseRelocationCliArguments, relocationCliUsage } from "./markdown-tree-relocation-cli.mjs";
import { observeMarkdownVaultDirectory } from "./observe-markdown-vault-directory.mjs";
import { scanMarkdownTreeLinks } from "./scan-markdown-tree-links.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

export const command = Object.freeze({
  run: async ({ argv, stdout }) => {
    const arguments_ = parseRelocationCliArguments(argv);
    if (arguments_.help) {
      stdout.write(relocationCliUsage("apply-markdown-tree-relocation", "Applies"));
      return undefined;
    }
    const { root, sourceDir, destDir, region, limit, maxScan } = arguments_;
    if (!root || !sourceDir || !destDir) {
      throw new Error("usage: apply-markdown-tree-relocation.mjs <root> <sourceDir> <destDir> [relation-universe] [limit] [max-scan]\nThis operation applies Markdown link rewrites only; move carriers separately.");
    }
    const result = await applyMarkdownTreeRelocation({
      root, sourceDir, destDir, region, limit, maxScan,
      scan: scanMarkdownTreeLinks, observe: observeMarkdownVaultDirectory, write: writeMarkdownFile,
    });
    return result;
  },
  formatResult: (result) => result === undefined ? "" : `${JSON.stringify(result, null, 2)}\n`,
  resultExitCode: (result) => (result === undefined || (result.type === "MarkdownTreeRelocationApplication" && result.ok) ? 0 : 1),
});
