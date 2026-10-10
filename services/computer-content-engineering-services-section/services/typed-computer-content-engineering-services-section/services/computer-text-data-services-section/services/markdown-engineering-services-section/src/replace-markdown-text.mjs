/** Replace literal text or a regular-expression pattern within Markdown text. */
export function replaceMarkdownText(text, { search, pattern, flags, replacement, all = false, required = false } = {}) {
  if (typeof text !== "string" || typeof replacement !== "string") throw new TypeError("text and replacement must be strings");
  if ((typeof search === "string") === (typeof pattern === "string")) throw new TypeError("provide exactly one of search or pattern");
  if (typeof search === "string") {
    if (search === "") throw new TypeError("search must be non-empty");
    if (!text.includes(search)) { if (required) throw new TypeError(`markdown text ${JSON.stringify(search)} not found`); return text; }
    return all ? text.split(search).join(replacement) : text.replace(search, replacement);
  }
  const finalFlags = flags?.includes("g") ? flags : `${flags ?? ""}g`;
  const matcher = new RegExp(pattern, finalFlags);
  if (!matcher.test(text)) { if (required) throw new TypeError(`markdown pattern ${JSON.stringify(pattern)} not found`); return text; }
  matcher.lastIndex = 0;
  return text.replace(matcher, replacement);
}
