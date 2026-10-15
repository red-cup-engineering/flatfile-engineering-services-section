import { readMarkdownFile } from "./read-markdown-file.mjs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";
import { enumerateMarkdownPaths } from "./observe-markdown-vaults.mjs";

const DEFAULT_EXCLUDES = Object.freeze([".git", "node_modules"]);

/**
 * Discover Markdown capability declarations without treating them as authority
 * to run code. A declaration is a `SKILL.md` carrier with object frontmatter
 * naming a nonempty `id` and `name`; its frontmatter remains uninterpreted
 * data so another layer can explicitly admit it as an operation if desired.
 */
export async function discoverMarkdownCapabilityDeclarations({ root, excludes = DEFAULT_EXCLUDES, limit = 20_000 } = {}) {
  if (typeof root !== "string" || root.length === 0) throw new TypeError("root must be a nonempty string");
  if (!Array.isArray(excludes) || excludes.some((value) => typeof value !== "string" || value.length === 0)) throw new TypeError("excludes must contain nonempty strings");
  if (!Number.isSafeInteger(limit) || limit < 0) throw new TypeError("limit must be a nonnegative safe integer");
  const inventory = await enumerateMarkdownPaths({ root, policy: {
    schemaVersion: 1,
    extensions: ["md"],
    excludedDirectoryNames: excludes,
    vaults: [{ id: "source", region: ".", fallback: true }],
  } });
  const paths = inventory.paths.filter((path) => path === "SKILL.md" || path.endsWith("/SKILL.md")).slice(0, limit);
  const declarations = [];
  const diagnostics = [];
  const ids = new Set();
  for (const path of paths) {
    try {
      const parsed = readMarkdownFrontmatter(await readMarkdownFile({ root: inventory.root, path }), { absentFrontmatter: "throw" });
      const frontmatter = parsed.frontmatter;
      if (typeof frontmatter.id !== "string" || frontmatter.id.length === 0 || typeof frontmatter.name !== "string" || frontmatter.name.length === 0) {
        diagnostics.push(Object.freeze({ path, code: "InvalidDeclaration", message: "frontmatter requires nonempty id and name" }));
        continue;
      }
      if (ids.has(frontmatter.id)) {
        diagnostics.push(Object.freeze({ path, code: "DuplicateId", message: `duplicate declaration id: ${frontmatter.id}` }));
        continue;
      }
      ids.add(frontmatter.id);
      declarations.push(Object.freeze({ id: frontmatter.id, name: frontmatter.name, path, frontmatter: Object.freeze({ ...frontmatter }) }));
    } catch (error) {
      diagnostics.push(Object.freeze({ path, code: "UnreadableDeclaration", message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return Object.freeze({
    type: "MarkdownCapabilityDeclarationInventory",
    root: inventory.root,
    declarations: Object.freeze(declarations),
    diagnostics: Object.freeze(diagnostics),
    available: paths.length,
    truncated: inventory.paths.filter((path) => path === "SKILL.md" || path.endsWith("/SKILL.md")).length > limit,
  });
}
