import { projectMarkdownBlocks } from "./project-markdown-blocks.mjs";
import { renderMarkdownInlineHtml } from "./render-markdown-inline-html.mjs";

const escape = (value) => value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
const indent = (value, spaces) => value.split("\n").map((line) => `${" ".repeat(spaces)}${line}`).join("\n");

function renderBlock(block) {
  switch (block.kind) {
    case "code": {
      const metadata = block.annotations === null ? "" : ` data-ann="${escape(JSON.stringify(block.annotations))}"`;
      return `<pre${metadata}><code${block.info === null ? "" : ` class="language-${escape(block.info)}"`}>${escape(block.code)}</code></pre>`;
    }
    case "heading":
      return `<h${block.level}>${renderMarkdownInlineHtml(block.text)}</h${block.level}>`;
    case "table": {
      const header = block.headers.map((cell) => `<th>${renderMarkdownInlineHtml(cell)}</th>`).join("");
      const body = block.rows.map((cells) => `<tr>${cells.map((cell) => `<td>${renderMarkdownInlineHtml(cell)}</td>`).join("")}</tr>`).join("");
      return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
    }
    case "rule":
      return "<hr>";
    case "callout": {
      const body = renderBlocks(block.blocks);
      return `<aside class="markdown-callout markdown-callout-${escape(block.type)}" data-callout="${escape(block.type)}"><p class="markdown-callout-title">${renderMarkdownInlineHtml(block.title ?? block.type)}</p>${body === "" ? "" : `\n<div class="markdown-callout-body">\n${indent(body, 2)}\n</div>`}\n</aside>`;
    }
    case "quote":
      return `<blockquote>\n${indent(renderBlocks(block.blocks), 2)}\n</blockquote>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const start = block.start === null ? "" : ` start="${block.start}"`;
      return `<${tag}${start}>\n${indent(block.items.map((item) => `<li>${renderBlocks(item.blocks)}</li>`).join("\n"), 2)}\n</${tag}>`;
    }
    case "paragraph":
      return `<p>${renderMarkdownInlineHtml(block.text)}</p>`;
    default:
      throw new TypeError(`unknown Markdown block kind ${block.kind}`);
  }
}

function renderBlocks(blocks) {
  return blocks.map(renderBlock).join("\n");
}

export function renderMarkdownBlockHtml(markdown, { emptyHtml = "<p></p>", headingOffset = 0 } = {}) {
  const blocks = projectMarkdownBlocks(markdown, { headingOffset });
  return blocks.length === 0 ? emptyHtml : renderBlocks(blocks);
}
