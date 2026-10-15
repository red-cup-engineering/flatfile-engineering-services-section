import assert from "node:assert/strict";
import test from "node:test";
import { readMarkdownStructure, readMarkdownSource } from "@red-cup-engineering/read-markdown-structure-service";

test("source offsets and heading section ranges remain aligned after BOM and CRLF frontmatter", () => {
  const text = "\uFEFF---\r\ntitle: Example\r\n---\r\n# Parent\r\nbody\r\n## Child\r\nchild\r\n# Sibling\r\nend\r\n";
  const structure = readMarkdownStructure(text);
  assert.equal(structure.bodyStartLine, 4);
  assert.deepEqual(structure.headings.map(({title,line,endLine,path}) => ({title,line,endLine,path})), [
    {title:"Parent",line:4,endLine:7,path:["Parent"]},
    {title:"Child",line:6,endLine:7,path:["Parent","Child"]},
    {title:"Sibling",line:8,endLine:9,path:["Sibling"]},
  ]);
});

test("frontmatter boundaries and fence closers require whole delimiter lines", () => {
  assert.equal(readMarkdownSource("---\nkey: value\n---suffix\n# Heading").frontmatter, null);
  const source = readMarkdownSource("~~~lang\n# not heading\n~~~ trailing\n# still code\n~~~~\n# Heading");
  assert.deepEqual(readMarkdownStructure(source.text).headings.map(({title}) => title), ["Heading"]);
  assert.equal(source.codeRanges.length, 1);
});

test("block headings take precedence over an unmatched inline delimiter", () => {
  assert.deepEqual(readMarkdownStructure("before `code\n# example\nend`\n# Real").headings.map(({title}) => title), ["example", "Real"]);
});

test("inline-code content coordinates exclude complete matching delimiter runs", () => {
  const source = readMarkdownSource('before ``a ` b`` after', { frontmatter: false });
  const [code] = source.codeRanges;
  assert.equal(source.text.slice(code.start, code.end), '``a ` b``');
  assert.equal(source.text.slice(code.contentStart, code.contentEnd), 'a ` b');
});


test("rendering and navigation use the same headings and fenced spans", async () => {
  const { renderMarkdownBlockHtml } = await import("../src/render-markdown-block-html.mjs");
  const text = "Paragraph\n\n   # Visible\n~~~js\n# Hidden\n~~~ trailing\n# Also hidden\n~~~~\n#\n```bad`info\n## Still visible";
  const source = readMarkdownSource(text);
  assert.deepEqual(readMarkdownStructure(text).headings.map(({ title }) => title), ["Visible", "", "Still visible"]);
  const html = renderMarkdownBlockHtml(text);
  assert.match(html, /<h1>Visible<\/h1>/u);
  assert.match(html, /<h1><\/h1>/u);
  assert.match(html, /<h2>Still visible<\/h2>/u);
  assert.doesNotMatch(html, /<h1>(?:Hidden|Also hidden)<\/h1>/u);
  const fence = source.codeRanges.find(({ type }) => type === "fenced-code");
  assert.equal(source.text.slice(fence.contentStart, fence.contentEnd), "# Hidden\n~~~ trailing\n# Also hidden\n");
  assert.equal(fence.startLine, 4);
  assert.equal(fence.endLine, 8);
});


test("whole-carrier feature projection excludes metadata while preserving source offsets", async () => {
  const { projectMarkdownFeatures, readMarkdownFeatures } = await import("@red-cup-engineering/read-markdown-features-service");
  const { replaceMarkdownLinkTarget } = await import("../src/replace-markdown-link-target.mjs");
  const text = '\uFEFF---\r\nexample: "[metadata](old.md)"\r\n---\r\n[body](old.md)\r\n';
  const source = readMarkdownSource(text);
  const links = projectMarkdownFeatures(source);
  assert.deepEqual(links.map(({ label }) => label), ["body"]);
  assert.equal(source.text.slice(links[0].targetSpan.start, links[0].targetSpan.end), "old.md");
  const rewritten = replaceMarkdownLinkTarget(text, { target: "old.md", replacement: "new.md" });
  assert.equal(rewritten.count, 1);
  assert.equal(rewritten.text, text.replace("[body](old.md)", "[body](new.md)"));
  assert.equal(readMarkdownFeatures("---\n[body](old.md)\n---").length, 1, "a body fragment still treats thematic breaks as prose boundaries");
});

test("setext declaration ranges drive navigation, rendering, normalization and section replacement", async () => {
  const { renderMarkdownBlockHtml } = await import("../src/render-markdown-block-html.mjs");
  const { normalizeMarkdownDocument } = await import("../src/normalize-markdown-document.mjs");
  const { replaceMarkdownSection } = await import("../src/replace-markdown-section.mjs");
  const text = 'Title\n=====\n\nSection\n-------\nbody\n\n# Next\nend';
  assert.deepEqual(readMarkdownStructure(text).headings.map(({ title, line, declarationEndLine, bodyStartLine, endLine }) => ({ title, line, declarationEndLine, bodyStartLine, endLine })), [
    { title: 'Title', line: 1, declarationEndLine: 2, bodyStartLine: 3, endLine: 7 },
    { title: 'Section', line: 4, declarationEndLine: 5, bodyStartLine: 6, endLine: 7 },
    { title: 'Next', line: 8, declarationEndLine: 8, bodyStartLine: 9, endLine: 9 },
  ]);
  const html = renderMarkdownBlockHtml(text);
  assert.match(html, /<h1>Title<\/h1>/u);
  assert.match(html, /<h2>Section<\/h2>/u);
  assert.doesNotMatch(html, /=+|<hr>/u);
  assert.equal(replaceMarkdownSection(text, { heading: 'Title', mode: 'delete' }), '# Next\nend');
  const normalized = normalizeMarkdownDocument('---\ntitle: Title\n---\nTitle\n=====\n\nContent.\n');
  assert.doesNotMatch(normalized, /=====/u);
  assert.match(normalized, /Content\./u);
  assert.deepEqual(readMarkdownStructure('- list\n---\n\n~~~\nHidden\n======\n~~~').headings, []);
});
