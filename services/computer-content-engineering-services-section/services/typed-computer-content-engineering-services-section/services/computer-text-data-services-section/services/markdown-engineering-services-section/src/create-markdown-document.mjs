import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { encodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";

/**
 * Create Markdown text from one JSON-object view.
 *
 * The `bodyKey` attribute (default `body`) supplies the Markdown body and is
 * omitted from YAML frontmatter. Undefined attributes are absent; null attributes
 * are omitted by default or retained with nullFrontmatter: "preserve";
 * an empty array remains an explicit YAML value. The output is semantic-line
 * feed normalized unless `semanticLinefeeds` is false.
 */
export function createMarkdownDocument(view, { body, bodyKey = "body", semanticLinefeeds = true, nullFrontmatter = "omit" } = {}) {
  if (view === null || typeof view !== "object" || Array.isArray(view)) throw new TypeError("view must be a JSON object");
  if (typeof bodyKey !== "string" || bodyKey === "") throw new TypeError("bodyKey must be a non-empty string");
  if (body !== undefined && typeof body !== "string") throw new TypeError("body must be a string when provided");

  if (nullFrontmatter !== "omit" && nullFrontmatter !== "preserve") throw new TypeError("nullFrontmatter must be omit or preserve");

  const rawBody = body ?? view[bodyKey];
  const documentBody = typeof rawBody === "string" ? rawBody : "";
  const normalizedBody = semanticLinefeeds ? normalizeLinefeeds(documentBody) : documentBody;
  const frontmatter = {};
  for (const key of Object.keys(view).sort()) {
    if (key === bodyKey) continue;
    const value = view[key];
    if (value !== undefined && (value !== null || nullFrontmatter === "preserve")) {
      Object.defineProperty(frontmatter, key, { value, enumerable: true });
    }
  }
  const encoded = encodeYaml(frontmatter);
  return encoded === "" ? normalizedBody : `---\n${encoded}---\n${normalizedBody}`;
}
