/** Split only a complete leading YAML or TOML fence, preserving source bytes. */
export function splitMarkdownFrontmatterFence(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const bomLength = text.startsWith("\uFEFF") ? 1 : 0;
  const normalized = text.slice(bomLength);
  const opening = /^(---|\+\+\+)[ \t]*(?:\r\n|\r|\n)/u.exec(normalized);
  if (opening === null) return null;
  const marker = opening[1];
  const lines = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  lines.lastIndex = opening[0].length;
  let line;
  while ((line = lines.exec(normalized)) !== null && line[0] !== "") {
    if (line[1].trimEnd() === marker) {
      const raw = normalized.slice(opening[0].length, line.index).replace(/(?:\r\n|\r|\n)$/u, "");
      return Object.freeze({ format: marker === "---" ? "yaml" : "toml", raw, body: normalized.slice(lines.lastIndex), source: Object.freeze({ rawStart: bomLength + opening[0].length, rawEnd: bomLength + line.index, bodyStart: bomLength + lines.lastIndex }) });
    }
  }
  return null;
}
