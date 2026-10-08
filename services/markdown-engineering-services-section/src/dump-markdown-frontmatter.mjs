import { encodeToml } from "@red-cup-engineering/toml-file-codec-service";
import { encodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";

/**
 * Render one fenced Markdown document from a frontmatter record and a body.
 *
 * The counterpart to `readMarkdownFrontmatter`/`splitMarkdownFrontmatterFence`:
 * encoding is delegated to the full YAML or TOML codec, so every record this
 * writes reads back through those decoders to the same value. Markdown owns
 * only the fence and body envelope. `frontmatter` of `null`, `undefined`, or
 * `{}` writes no fence at all -- `body` is returned unchanged.
 */
export function dumpMarkdownFrontmatter(frontmatter, body, format = "yaml") {
  if (typeof body !== "string") throw new TypeError("body must be a string");
  if (format !== "yaml" && format !== "toml") throw new TypeError("format must be yaml or toml");
  if (frontmatter === null || frontmatter === undefined) return body;
  if (typeof frontmatter !== "object" || Array.isArray(frontmatter)) throw new TypeError("frontmatter must be a JSON object");
  if (Object.keys(frontmatter).length === 0) return body;
  return format === "toml" ? `+++\n${encodeToml(frontmatter)}+++\n${body}` : `---\n${encodeYaml(frontmatter)}---\n${body}`;
}
