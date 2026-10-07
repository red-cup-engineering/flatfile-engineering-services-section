import { canonical } from "@red-cup-engineering/json-services-section";

/**
 * Project parsed Markdown document data into EAVT assertions.
 *
 * Input is `{frontmatter, body, links, tags}`: `frontmatter` a JSON object (or null); `body`,
 * when given, a string asserted whole; `links` the document's links as `{kind, target}` (a
 * link kind -- link, embed, image -- and the path it reaches, or its written target); `tags`
 * its inline hashtags. Output is `{subject, assertions}`, each assertion `{e, a, v, t}`:
 * array-valued frontmatter becomes one assertion per item, object values their canonical JSON
 * text, each link an assertion of its kind, each tag a `tag` assertion.
 */
export function projectMarkdownAssertions({ frontmatter = null, body, links = [], tags = [], coordinate = "markdown", subject } = {}) {
  if (frontmatter !== null && (typeof frontmatter !== "object" || Array.isArray(frontmatter))) {
    throw new TypeError("frontmatter must be a JSON object or null");
  }
  if (body !== undefined && typeof body !== "string") throw new TypeError("body must be a string when given");
  if (typeof coordinate !== "string" || coordinate === "") throw new TypeError("coordinate must be a non-empty string");

  const attributes = frontmatter ?? {};
  const entity = subject ?? (typeof attributes.slug === "string" && attributes.slug.trim() !== "" ? attributes.slug : coordinate);
  if (typeof entity !== "string" || entity === "") throw new TypeError("subject must be a non-empty string");

  const assertions = [];
  const valueOf = (value) => value !== null && typeof value === "object" ? canonical(value) : value;
  const push = (attribute, value) => assertions.push(Object.freeze({ e: entity, a: attribute, v: valueOf(value), t: coordinate }));
  for (const [attribute, value] of Object.entries(attributes)) {
    if (Array.isArray(value)) for (const item of value) push(attribute, item);
    else push(attribute, value);
  }
  for (const { kind, target } of links) push(kind, target);
  for (const tag of tags) push("tag", tag);
  if (body !== undefined) push("body", body);
  return Object.freeze({ subject: entity, assertions: Object.freeze(assertions) });
}
