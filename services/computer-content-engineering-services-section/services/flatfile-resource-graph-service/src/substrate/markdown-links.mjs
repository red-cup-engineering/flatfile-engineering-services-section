import { readMarkdownFeatures } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-features";
import { classify } from "./link-kind.mjs";

function lineAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text[index] === "\n") line += 1;
  return line;
}

export function parseLinks(body) {
  const normalized = body.replace(/\r\n?/gu, "\n");
  return readMarkdownFeatures(body)
    .filter(({ type }) => type === "markdown-link")
    .map((feature) => ({
      text: feature.label,
      targetRaw: feature.target,
      line: lineAt(normalized, feature.span.start),
      kind: classify(feature.target),
    }));
}


