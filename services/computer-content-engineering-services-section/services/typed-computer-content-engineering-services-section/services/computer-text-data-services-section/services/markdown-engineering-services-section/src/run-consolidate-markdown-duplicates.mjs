import { applyMarkdownDuplicateConsolidation, planMarkdownCopyMerge, planMarkdownDuplicateConsolidation, planMarkdownIdentityMerge, planMarkdownNamesakeMerge, planMarkdownSupersededCopies } from "./consolidate-markdown-duplicates.mjs";
import { readMarkdownFile } from "./read-markdown-file.mjs";
import { removeMarkdownFile } from "./remove-markdown-file.mjs";
import { scanMarkdownTreeLinks } from "./scan-markdown-tree-links.mjs";
import { writeMarkdownFile } from "./write-markdown-file.mjs";

/** What counts as a copy: an identical body, a superseded or overlapping custody copy, a shared org-roam identity, or a living namesake saying the same thing. */
const PLANS = {
  exact: (documents) => planMarkdownDuplicateConsolidation({ documents }),
  superseded: (documents) => planMarkdownSupersededCopies({ documents }),
  merge: (documents) => planMarkdownCopyMerge({ documents }),
  identity: (documents) => planMarkdownIdentityMerge({ documents }),
  namesake: (documents) => planMarkdownNamesakeMerge({ documents }),
};

export const command = Object.freeze({
  run: async ({ argv }) => {
    const planName = argv.find((arg) => arg.startsWith("--plan="))?.slice("--plan=".length) ?? "exact";
    const [root, region = "", ...excluded] = argv.filter((arg) => !arg.startsWith("--plan="));
    if (!root || !PLANS[planName]) throw new Error(`usage: consolidate-markdown-duplicates.mjs [--plan=${Object.keys(PLANS).join("|")}] <root> [region] [excluded-segment...]`);
    return applyMarkdownDuplicateConsolidation({
      root, region, limit: 500_000, maxScan: 5_000_000,
      admit: (path) => !path.split("/").some((segment) => excluded.includes(segment)),
      scan: scanMarkdownTreeLinks, read: readMarkdownFile, write: writeMarkdownFile, remove: removeMarkdownFile, plan: PLANS[planName],
    });
  },
  formatResult: (result) => `${JSON.stringify(result, null, 2)}\n`,
});
