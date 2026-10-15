import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/split-markdown-frontmatter-fence-service";
import { decodeToml } from "@red-cup-engineering/toml-codec-service";
import {
  decodeYaml,
  decodeYamlWithSourceLocations,
  projectFlatScalarStringLists,
} from "@red-cup-engineering/yaml-frontmatter-codec-service";

/**
 * Read one fenced Markdown frontmatter record.
 *
 * `frontmatterFormats` limits admitted fence kinds. YAML decoding is delegated
 * to the full YAML codec; Markdown owns only the fence and body envelope.
 */
export function readMarkdownFrontmatter(text, {
  frontmatterFormats = ["yaml", "toml"],
  absentFrontmatter = "null",
  yamlProjection = "json",
  yamlSourceLocations = false,
} = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (!Array.isArray(frontmatterFormats) || frontmatterFormats.some((format) => format !== "yaml" && format !== "toml")) {
    throw new TypeError("frontmatterFormats must contain only yaml or toml");
  }
  if (absentFrontmatter !== "null" && absentFrontmatter !== "empty" && absentFrontmatter !== "throw") {
    throw new TypeError("absentFrontmatter must be null, empty, or throw");
  }
  if (yamlProjection !== "json" && yamlProjection !== "flat-string-lists") {
    throw new TypeError("yamlProjection must be json or flat-string-lists");
  }
  if (typeof yamlSourceLocations !== "boolean") throw new TypeError("yamlSourceLocations must be boolean");
  const fence = splitMarkdownFrontmatterFence(text);
  if (fence === null || !frontmatterFormats.includes(fence.format)) {
    if (absentFrontmatter === "throw") throw new TypeError("markdown frontmatter is required");
    return Object.freeze({ format: null, frontmatter: absentFrontmatter === "empty" ? Object.freeze({}) : null, body: text });
  }
  let frontmatter;
  let keyLocations;
  if (fence.format === "yaml" && yamlSourceLocations) {
    const decoded = decodeYamlWithSourceLocations(fence.raw);
    frontmatter = decoded.value;
    keyLocations = decoded.keyLocations;
  } else {
    frontmatter = fence.format === "yaml" ? decodeYaml(fence.raw) : decodeToml(fence.raw);
  }
  if (fence.format === "yaml" && yamlProjection === "flat-string-lists") {
    frontmatter = projectFlatScalarStringLists(frontmatter);
  }
  if (frontmatter === null || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    throw new TypeError("markdown frontmatter must decode to a JSON object");
  }
  return Object.freeze({
    format: fence.format,
    frontmatter: Object.freeze(frontmatter),
    body: fence.body,
    ...(keyLocations === undefined ? {} : { keyLocations }),
  });
}
