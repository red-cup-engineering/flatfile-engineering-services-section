import { renderMarkdownInlineHtml } from "@red-cup-engineering/render-markdown-inline-html-service";

const escape = (value) => value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
const indent = (value, spaces) => value.split("\n").map((line) => `${" ".repeat(spaces)}${line}`).join("\n");
function fenceStart(line) { return line.match(/^ {0,3}(`{3,}|~{3,})/u)?.[1] ?? null; }
function heading(line) { const match = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u); return match === null ? null : { level: match[1].length, text: match[2] }; }
function thematicBreak(line) { return /^ {0,3}((?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/u.test(line); }
function callout(line) { const match = line.match(/^ {0,3}>[ \t]*\[!([A-Za-z0-9_-]+)\][ \t]*(.*)$/u); return match === null ? null : { type: match[1].toLowerCase(), title: match[2].trim() || null }; }
function listMarker(line) { const expanded = expandLeadingTabs(line); const match = expanded.match(/^(\s*)((?:[-+*])|(?:\d{1,9}[.)]))\s+(?:\[([ xX])\]\s+)?(.*)$/u); return match === null ? null : { indent: match[1].length, ordered: /^\d/u.test(match[2]), marker: match[2], checkbox: match[3] === undefined ? null : /x/iu.test(match[3]) ? "checked" : "unchecked", text: match[4] }; }
function isBlockStart(line) { return fenceStart(line) !== null || heading(line) !== null || thematicBreak(line) || callout(line) !== null || /^ {0,3}>/u.test(line) || listMarker(line) !== null; }
function closeFence(line, fence) { const match = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/u); return match !== null && match[1][0] === fence[0] && match[1].length >= fence.length; }
function expandLeadingTabs(line) { const leading = line.match(/^\s*/u)?.[0] ?? ""; return leading.replace(/\t/gu, "  ") + line.slice(leading.length); }
function indentWidth(line) { return expandLeadingTabs(line).match(/^\s*/u)?.[0].length ?? 0; }
function removeIndentColumns(line, columns) { let index = 0, remaining = columns; while (index < line.length && remaining > 0) { if (line[index] === " ") { remaining -= 1; index += 1; continue; } if (line[index] === "\t") { remaining -= 2; index += 1; continue; } break; } return line.slice(index); }

function renderBlocks(lines, start = 0) {
  const blocks = []; let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") { index += 1; continue; }
    const fence = fenceStart(line);
    if (fence !== null) { const token = line.slice(line.indexOf(fence) + fence.length).trim().split(/\s+/u)[0] || ""; const info = /\w/u.test(token) ? token : null; const code = []; index += 1; while (index < lines.length && !closeFence(lines[index], fence)) code.push(lines[index++]); if (index < lines.length) index += 1; blocks.push(`<pre><code${info === null ? "" : ` class=\"language-${escape(info)}\"`}>${escape(code.join("\n"))}</code></pre>`); continue; }
    const title = heading(line);
    if (title !== null) { blocks.push(`<h${title.level}>${renderMarkdownInlineHtml(title.text)}</h${title.level}>`); index += 1; continue; }
    if (thematicBreak(line)) { blocks.push("<hr>"); index += 1; continue; }
    const notice = callout(line);
    if (notice !== null) { const quoted = []; index += 1; while (index < lines.length && (/^ {0,3}>/u.test(lines[index]) || lines[index].trim() === "")) quoted.push(lines[index++].replace(/^ {0,3}>\s?/u, "")); const body = renderBlocks(quoted).html; blocks.push(`<aside class=\"markdown-callout markdown-callout-${escape(notice.type)}\" data-callout=\"${escape(notice.type)}\"><p class=\"markdown-callout-title\">${renderMarkdownInlineHtml(notice.title ?? notice.type)}</p>${body === "" ? "" : `\n<div class=\"markdown-callout-body\">\n${indent(body, 2)}\n</div>`}\n</aside>`); continue; }
    if (/^ {0,3}>/u.test(line)) { const quoted = []; while (index < lines.length && (/^ {0,3}>/u.test(lines[index]) || lines[index].trim() === "")) quoted.push(lines[index++].replace(/^ {0,3}>\s?/u, "")); blocks.push(`<blockquote>\n${indent(renderBlocks(quoted).html, 2)}\n</blockquote>`); continue; }
    const first = listMarker(line);
    if (first !== null) { const items = [], tag = first.ordered ? "ol" : "ul"; while (index < lines.length) { const marker = listMarker(lines[index]); if (marker === null || marker.indent !== first.indent || marker.ordered !== first.ordered) break; const itemLines = [`${marker.checkbox === null ? "" : marker.checkbox === "checked" ? "[x] " : "[ ] "}${marker.text}`]; index += 1; while (index < lines.length) { const continuation = lines[index], next = listMarker(continuation); if (next !== null && next.indent === first.indent) break; if (continuation.trim() !== "" && indentWidth(continuation) <= first.indent) break; itemLines.push(continuation.trim() === "" ? "" : removeIndentColumns(continuation, first.indent + 2)); index += 1; } items.push(`<li>${renderBlocks(itemLines).html}</li>`); } const start = first.ordered && first.marker.replace(/\D/gu, "") !== "1" ? ` start=\"${first.marker.replace(/\D/gu, "")}\"` : ""; blocks.push(`<${tag}${start}>\n${indent(items.join("\n"), 2)}\n</${tag}>`); continue; }
    const paragraph = []; while (index < lines.length && lines[index].trim() !== "" && (paragraph.length === 0 || !isBlockStart(lines[index]))) paragraph.push(lines[index++].trim()); blocks.push(`<p>${renderMarkdownInlineHtml(paragraph.join(" "))}</p>`);
  }
  return { html: blocks.join("\n"), next: index };
}

export function renderMarkdownBlockHtml(markdown, { emptyHtml = "<p></p>" } = {}) {
  if (typeof markdown !== "string") throw new TypeError("markdown must be a string");
  const normalized = markdown.replace(/\r\n?/gu, "\n").trim();
  return normalized === "" ? emptyHtml : renderBlocks(normalized.split("\n")).html;
}
