import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { differentiateMarkdownLines } from "./differentiate-markdown-lines.mjs";
import { readMarkdownWorkbench } from "./read-markdown-workbench.mjs";

export const markdownDocumentDifferenceKind = "red-cup-engineering.markdown.document-difference";

function hunkLine(change) {
  const kind = change.kind === "equal" ? "context" : change.kind;
  return Object.freeze({
    kind, text: change.text,
    ...(change.beforeLine === undefined || kind === "insert" ? {} : { beforeLine: change.beforeLine }),
    ...(change.afterLine === undefined || kind === "delete" ? {} : { afterLine: change.afterLine }),
  });
}

function hunkOf(changes, start, end) {
  const before = changes.slice(0, start), selected = changes.slice(start, end + 1);
  return Object.freeze({
    beforeStart: before.filter((change) => change.kind !== "insert").length + 1,
    beforeLines: selected.filter((change) => change.kind !== "insert").length,
    afterStart: before.filter((change) => change.kind !== "delete").length + 1,
    afterLines: selected.filter((change) => change.kind !== "delete").length,
    lines: Object.freeze(selected.map(hunkLine)),
  });
}

function hunks(changes, contextLines) {
  const out = [];
  let index = 0;
  while (index < changes.length) {
    while (index < changes.length && changes[index].kind === "equal") index += 1;
    if (index >= changes.length) break;
    const start = Math.max(0, index - contextLines);
    let end = Math.min(changes.length - 1, index + contextLines);
    for (let scan = index + 1; scan < changes.length; scan += 1) {
      if (changes[scan].kind !== "equal" && scan <= end + contextLines) end = Math.min(changes.length - 1, scan + contextLines);
      if (scan > end) break;
    }
    out.push(hunkOf(changes, start, end));
    index = end + 1;
  }
  return Object.freeze(out);
}

const countPart = (count) => (count === 1 ? "" : `,${count}`);
const prefixOf = (line) => (line.kind === "context" ? " " : line.kind === "delete" ? "-" : "+");

function unifiedDiff(hunkList, beforeLabel, afterLabel) {
  if (hunkList.length === 0) return "";
  const lines = [`--- ${beforeLabel}`, `+++ ${afterLabel}`];
  for (const hunk of hunkList) {
    lines.push(`@@ -${hunk.beforeStart}${countPart(hunk.beforeLines)} +${hunk.afterStart}${countPart(hunk.afterLines)} @@`);
    for (const line of hunk.lines) lines.push(`${prefixOf(line)}${line.text}`);
  }
  return `${lines.join("\n")}\n`;
}

function frontmatterDifference(before, after) {
  const left = before.frontmatter ?? {}, right = after.frontmatter ?? {};
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return Object.freeze(keys.flatMap((key) => {
    const was = left[key], is = right[key];
    if (was !== undefined && is !== undefined) return canonicalJson(was) === canonicalJson(is) ? [] : [Object.freeze({ key, kind: "changed", before: was, after: is })];
    if (was === undefined && is !== undefined) return [Object.freeze({ key, kind: "added", after: is })];
    if (was !== undefined) return [Object.freeze({ key, kind: "removed", before: was })];
    return [];
  }));
}

const headingSignature = (heading) => `${heading.level}:${heading.path.join(" / ")}`;
function featureSignature(feature) {
  const extra = "target" in feature ? feature.target
    : "key" in feature ? `${feature.key}=${feature.value}`
      : "keys" in feature ? feature.keys.join(",")
        : "calloutType" in feature ? feature.calloutType
          : "tag" in feature ? feature.tag
            : feature.span.text;
  return `${feature.type}:${extra}`;
}

function setDifference(before, after, [gone, come]) {
  const left = new Set(before), right = new Set(after);
  return Object.freeze([
    ...[...left].filter((entry) => !right.has(entry)).map((signature) => Object.freeze({ kind: gone, signature })),
    ...[...right].filter((entry) => !left.has(entry)).map((signature) => Object.freeze({ kind: come, signature })),
  ].sort((a, b) => a.signature.localeCompare(b.signature)));
}

/**
 * Compare two Markdown documents at the text, frontmatter, heading, feature,
 * validation and normalization layers: one readout for auditing a proposed
 * edit, with unified-diff hunks over the normalized lines.
 */
export function differentiateMarkdownDocuments(beforeText, afterText, options = {}) {
  const beforeLabel = options.beforeLabel ?? "before", afterLabel = options.afterLabel ?? "after";
  const before = readMarkdownWorkbench(beforeText, { coordinate: beforeLabel });
  const after = readMarkdownWorkbench(afterText, { coordinate: afterLabel });
  const changes = differentiateMarkdownLines(beforeText, afterText);
  const hunkList = hunks(changes, options.contextLines ?? 3);
  return Object.freeze({
    kind: markdownDocumentDifferenceKind,
    changed: beforeText !== afterText,
    before,
    after,
    source: Object.freeze({ beforeBytes: before.source.bytes, afterBytes: after.source.bytes, beforeLines: before.source.lines, afterLines: after.source.lines }),
    lines: Object.freeze({
      changed: changes.some((change) => change.kind !== "equal"),
      changes,
      hunks: hunkList,
      unified: unifiedDiff(hunkList, options.beforeLabel ?? "before.md", options.afterLabel ?? "after.md"),
    }),
    frontmatter: frontmatterDifference(before, after),
    headings: setDifference(before.structure.headings.map(headingSignature), after.structure.headings.map(headingSignature), ["removed", "added"]),
    features: setDifference(before.features.map(featureSignature), after.features.map(featureSignature), ["removed", "added"]),
    validation: setDifference(before.validation.findings.map(canonicalJson), after.validation.findings.map(canonicalJson), ["resolved", "introduced"]),
    normalization: Object.freeze({
      beforeSemanticLinefeeds: !before.normalization.semanticLinefeedDocument.changed,
      afterSemanticLinefeeds: !after.normalization.semanticLinefeedDocument.changed,
      beforeRepoNormalized: !before.normalization.repoMarkdownDocument.changed,
      afterRepoNormalized: !after.normalization.repoMarkdownDocument.changed,
    }),
  });
}
