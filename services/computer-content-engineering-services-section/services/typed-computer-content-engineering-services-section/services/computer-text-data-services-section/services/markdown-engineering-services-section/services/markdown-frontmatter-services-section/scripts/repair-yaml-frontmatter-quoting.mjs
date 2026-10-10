/** Explicit, dry-run-by-default repair of invalid YAML scalar quoting in Markdown. */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repairYamlPlainScalars } from "@red-cup-engineering/yaml-frontmatter-codec-service";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { observeMarkdownVaultDirectory } from "@red-cup-engineering/markdown-engineering-services-section/observe-markdown-vault-directory";
import { readFlagValue } from "@red-cup-engineering/computer-text-content-engineering-services-section/read-flag-token-values";

export function repairMarkdownFrontmatterQuoting(original) {
  const fence = splitMarkdownFrontmatterFence(original);
  if (fence?.format !== "yaml") return { status: "no-frontmatter" };
  const { rawStart, rawEnd } = fence.source;
  const repaired = repairYamlPlainScalars(original.slice(rawStart, rawEnd));
  if (!repaired.ok) return { status: "unresolved", reason: repaired.reason, line: repaired.line };
  if (repaired.changes.length === 0) return { status: "already-valid" };
  return { status: "repaired", text: original.slice(0, rawStart) + repaired.text + original.slice(rawEnd), iterations: repaired.changes.length, changes: repaired.changes };
}

function parseArgs(argv) {
  const root = readFlagValue("--root", argv);
  if (!root) throw new TypeError("usage: repair-yaml-frontmatter-quoting --root DIRECTORY [--apply] [--report PATH]");
  return { apply: argv.includes("--apply"), root, report: readFlagValue("--report", argv) ?? null };
}

export async function runRepairYamlFrontmatterQuoting(argv, io) {
  const args = parseArgs(argv);
  const inventory = await observeMarkdownVaultDirectory({ root: args.root, limit: Number.MAX_SAFE_INTEGER, maxScan: Number.MAX_SAFE_INTEGER });
  if (inventory.truncated || inventory.diagnostics.length > 0) throw new Error("frontmatter repair requires a complete readable Markdown inventory; nothing written");
  const results = { repaired: [], unresolved: [], alreadyValid: 0, noFrontmatter: 0 };
  // Resolve all reads before applying any repair: unreadable inventory members
  // must not yield a misleading partially completed directory operation.
  const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const plans = inventory.paths.map((path) => ({ path, outcome: repairMarkdownFrontmatterQuoting(utf8.decode(readFileSync(join(inventory.root, path)))) }));
  for (const { path, outcome } of plans) {
    if (outcome.status === "already-valid") results.alreadyValid += 1;
    else if (outcome.status === "no-frontmatter") results.noFrontmatter += 1;
    else if (outcome.status === "unresolved") results.unresolved.push({ path, reason: outcome.reason, line: outcome.line });
    else {
      results.repaired.push({ path, iterations: outcome.iterations, changes: outcome.changes });
      if (args.apply) writeFileSync(join(inventory.root, path), outcome.text, "utf8");
    }
  }
  io.stdout.write(`${JSON.stringify({ root: inventory.root, applied: args.apply, inventory: { scanned: inventory.scanned, symlinkPolicy: inventory.symlinkPolicy, excludes: inventory.excludes }, ...results }, null, 2)}\n`);
  if (args.report) writeFileSync(args.report, JSON.stringify(results, null, 2), "utf8");
  return results;
}

export const command = Object.freeze({
  run: ({ argv, stdout }) => runRepairYamlFrontmatterQuoting(argv, { stdout }),
  formatError: (error) => `repair-yaml-frontmatter-quoting: ${error.message}\n`,
  exitCode: 1,
});
