import { readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";

const wikilink = /(?<!\\)(!?)\[\[([^\]\n]+?)\]\]/dgu;
const inlineField = /(?<!\\)(\[|\()([^\]\)\n]+?)::[ \t]*([^\]\)\n]+?)(\]|\))/gu;
const citationGroup = /(?<!\\)\[([^\]\n]*@[^\]\n]*)\]/gu;
const markdownLink = /(?<!\\)(!?)\[([^\]\n]*)\]\(([^)\n]*?)(?:[ \t]+"([^"]*)")?[ \t]*\)/dgu;
const calloutStart = /^ {0,3}>[ \t]*\[!([A-Za-z0-9_-]+)\][ \t]*(.*)$/u;

function spanOf(text, start, end) { return Object.freeze({ start, end, text: text.slice(start, end) }); }
function eligibleText(source) {
  const ranges = [...(source.bodyStartOffset > 0 ? [{ start: 0, end: source.bodyStartOffset }] : []), ...source.codeRanges];
  let offset = 0;
  const parts = [];
  for (const { start, end } of ranges) {
    parts.push(source.text.slice(offset, start), source.text.slice(start, end).replace(/[^\n]/g, " "));
    offset = end;
  }
  return parts.join("") + source.text.slice(offset);
}
function targetLabel(value) { const index = value.indexOf("|"); return index < 0 ? { target: value.trim(), label: null } : { target: value.slice(0, index).trim(), label: value.slice(index + 1).trim() || null }; }
function citationKeys(value) {
  const keys = [], suppressedKeys = [];
  for (const match of value.matchAll(/(?<!\S)(-?)@([A-Za-z0-9_:-]+)/gu)) (match[1] === "-" ? suppressedKeys : keys).push(match[2]);
  return { keys: Object.freeze(keys), suppressedKeys: Object.freeze(suppressedKeys) };
}

export function readMarkdownFeatures(body) {
  if (typeof body !== "string") throw new TypeError("body must be a string");
  return projectMarkdownFeatures(readMarkdownSource(body, { frontmatter: false }));
}

export function projectMarkdownFeatures(source) {
  const { text } = source;
  const eligible = eligibleText(source), features = [];
  for (const match of eligible.matchAll(wikilink)) {
    const targetRaw = text.slice(...match.indices[2]);
    const split = targetLabel(targetRaw);
    features.push(Object.freeze({ type: match[1] === "!" ? "transclusion" : "wikilink", targetRaw, target: split.target, label: split.label, span: spanOf(text, match.index, match.index + match[0].length) }));
  }
  for (const match of eligible.matchAll(markdownLink)) {
    const rawTarget = text.slice(...match.indices[3]);
    const target = rawTarget.trim();
    const labelSpan = spanOf(text, ...match.indices[2]);
    const targetStart = match.indices[3][0] + rawTarget.length - rawTarget.trimStart().length;
    features.push(Object.freeze({ type: "markdown-link", label: labelSpan.text.trim(), labelSpan, target, title: match.indices[4] ? text.slice(...match.indices[4]) : null, image: match[1] === "!", targetSpan: spanOf(text, targetStart, targetStart + target.length), span: spanOf(text, match.index, match.index + match[0].length) }));
  }
  for (const match of eligible.matchAll(/(?<![\\\[])(!?)\[([^\]\n]*)\]\[([^\]\n]*)\]/dgu)) {
    const label = text.slice(...match.indices[2]);
    const reference = text.slice(...match.indices[3]) || label;
    features.push(Object.freeze({ type: "reference-link", label, reference, image: match[1] === "!", span: spanOf(text, match.index, match.index + match[0].length) }));
  }
  for (const match of eligible.matchAll(inlineField)) {
    if ((match[1] === "[" && match[4] !== "]") || (match[1] === "(" && match[4] !== ")")) continue;
    features.push(Object.freeze({ type: "inline-field", key: match[2].trim(), value: match[3].trim(), delimiter: match[1] === "[" ? "[]" : "()", span: spanOf(text, match.index, match.index + match[0].length) }));
  }
  for (const match of eligible.matchAll(citationGroup)) {
    const keys = citationKeys(match[1]);
    if (keys.keys.length || keys.suppressedKeys.length) features.push(Object.freeze({ type: "citation-group", ...keys, span: spanOf(text, match.index, match.index + match[0].length) }));
  }
  for (const match of eligible.matchAll(/(^|[\s(])#([\p{L}][\p{L}\p{N}_/-]*)/gu)) {
    const start = match.index + match[1].length;
    features.push(Object.freeze({ type: "hashtag", tag: match[2], span: spanOf(text, start, start + match[2].length + 1) }));
  }
  const lines = text.split(/(?<=\n)/u), eligibleLines = eligible.split(/(?<=\n)/u);
  for (let index = 0, offset = 0; index < lines.length;) {
    const line = lines[index], match = (eligibleLines[index] ?? line).replace(/\r?\n$/u, "").match(calloutStart);
    if (match === null) { offset += line.length; index += 1; continue; }
    const start = offset, bodyLines = [], title = match[2].trim(); offset += line.length; index += 1;
    while (index < lines.length && /^ {0,3}>/u.test(eligibleLines[index] ?? lines[index])) { bodyLines.push(lines[index].replace(/^ {0,3}>[ \t]?/u, "").replace(/\r?\n$/u, "")); offset += lines[index].length; index += 1; }
    features.push(Object.freeze({ type: "callout", calloutType: match[1].trim().toLowerCase(), title: title || null, body: bodyLines.join("\n").trimEnd(), span: spanOf(text, start, offset) }));
  }
  return Object.freeze(features.sort((left, right) => left.span.start - right.span.start || left.span.end - right.span.end));
}
