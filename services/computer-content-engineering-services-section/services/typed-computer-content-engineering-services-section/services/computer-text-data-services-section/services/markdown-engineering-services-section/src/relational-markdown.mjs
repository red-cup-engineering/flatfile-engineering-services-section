// The house relational Markdown dialect, extracted from VICTOR.
// Implemented: front matter, headings (## -> h2, no skipped levels), paragraphs,
// unordered/ordered lists, fenced code, callouts, plain blockquotes, wikilinks,
// inline fields, footnotes-as-sidenotes, citations, emphasis/strong/inline code,
// links, images, GFM pipe tables.
// Deferred to a later version (per the dialect specification note): transclusion,
// mathematics, raw HTML passthrough (v0.1 escapes everything).

import { escapeHtml } from '@red-cup-engineering/html-structural-projection-service/string-rendering';
import { headingSlug } from '@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text';
import { parseCitationItems, formatCitationLabel, formatReferenceEntry } from '@red-cup-engineering/csl-json-services-section/record-formatting';
import { readMarkdownFrontmatter } from '@red-cup-engineering/read-markdown-frontmatter-service';
import { niUriContentType, niUriName, niWellKnownPath } from '@red-cup-engineering/uri-services-section/ni-uri';
import { extensionType } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/media-type';

// ---------- front matter ----------

export function splitFrontMatter(source) {
  const parsed = readMarkdownFrontmatter(source, { frontmatterFormats: ['yaml'] });
  if (parsed.frontmatter === null) return { frontMatter: {}, body: source };
  const { references } = parsed.frontmatter;
  return {
    frontMatter: {
      ...parsed.frontmatter,
      references: references && typeof references === 'object' && !Array.isArray(references) ? references : {},
    },
    body: parsed.body,
  };
}

// ---------- body parsing ----------

// A line that opens a block of its own and so ends a paragraph.
const STRUCTURAL_LINE = /^(#{1,5}\s|```|>|\s*([-*]|\d+\.)\s|[a-z][a-z0-9-]*::\s|\[\^[^\]]+\]:\s)/;

export function parseBody(body, { references = {} } = {}) {
  const blocks = [];
  const relations = [];
  const refusals = [];
  const advisories = [];
  const footnotes = new Map();
  const citations = [];
  const citedKeys = new Set();
  const ctx = { relations, footnotes, refusals, references, citations, citedKeys };
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let lastHeading = 1; // page title is h1

  // first pass: collect footnote definitions
  for (const line of lines) {
    const def = line.match(/^\[\^([^\]]+)\]:\s+(.*)$/);
    if (def) footnotes.set(def[1], def[2]);
  }

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }
    if (/^\[\^[^\]]+\]:\s/.test(line)) { i++; continue; } // consumed in first pass

    const fence = line.match(/^```(\S*)(?:\s+.*)?$/);
    if (fence) {
      const lang = fence[1];
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
      i++;
      if (!lang) advisories.push({ code: 'A-06', reason: 'untagged code fence renders unhighlighted' });
      blocks.push({ kind: 'code', lang: lang || 'text', text: code.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,5})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length + 1; // '#' authors h2
      if (level > lastHeading + 1) {
        refusals.push({ code: 'R-10', reason: `heading level skips from h${lastHeading} to h${level}`, site: { line: i + 1 } });
      }
      lastHeading = level;
      blocks.push({ kind: 'heading', level, inlines: parseInlines(heading[2], ctx) });
      i++; continue;
    }

    if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, '')); i++;
      }
      const call = quote[0] && quote[0].match(/^\[!(\w+)\]\s*(.*)$/);
      const KNOWN = ['note', 'caution', 'evidence'];
      if (call && KNOWN.includes(call[1].toLowerCase())) {
        blocks.push({
          kind: 'callout', type: call[1].toLowerCase(), title: call[2] || '',
          inlines: parseInlines(quote.slice(1).join(' ').trim(), ctx),
        });
      } else {
        if (call) advisories.push({ code: 'A-07', reason: `unknown callout type "${call[1]}" rendered as quotation` });
        blocks.push({ kind: 'quote', inlines: parseInlines(quote.join(' ').trim(), ctx) });
      }
      continue;
    }

    const field = line.match(/^([a-z][a-z0-9-]*)::\s+(.*)$/);
    if (field) {
      const fields = [];
      while (i < lines.length) {
        const f = lines[i].match(/^([a-z][a-z0-9-]*)::\s+(.*)$/);
        if (!f) break;
        const wl = f[2].match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
        relations.push({ type: f[1], to: wl ? wl[1].trim() : f[2].trim(), literal: !wl, provenance: 'inline-field' });
        fields.push({ key: f[1], inlines: parseInlines(f[2], ctx, { skipRelation: true }) });
        i++;
      }
      blocks.push({ kind: 'fields', fields });
      continue;
    }

    const listStart = line.match(/^(\s*)([-*]|\d+\.)\s+/);
    if (listStart) {
      const ordered = /^\d+\./.test(listStart[2]);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const item = [lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')];
        i++;
        // An item's paragraph continues over wrapped lines (CommonMark's lazy
        // continuation) until a blank line or a line that starts another block.
        while (i < lines.length && lines[i].trim() && !STRUCTURAL_LINE.test(lines[i]) && !isTableStart(lines, i)) {
          item.push(lines[i].trim()); i++;
        }
        items.push(parseInlines(item.join(' '), ctx));
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    if (isTableStart(lines, i)) {
      const headerCells = splitTableRow(line);
      const align = splitTableRow(lines[i + 1]).map(tableCellAlign);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !isTableDelimiterRow(lines[i])) {
        rows.push(splitTableRow(lines[i]).map((c) => parseInlines(c, ctx)));
        i++;
      }
      blocks.push({
        kind: 'table', align,
        header: headerCells.map((c) => parseInlines(c, ctx)),
        rows,
      });
      continue;
    }

    // paragraph: accumulate until blank, a structural line, or a table start
    const para = [];
    while (i < lines.length && lines[i].trim() &&
      !STRUCTURAL_LINE.test(lines[i]) &&
      !isTableStart(lines, i)) {
      para.push(lines[i]); i++;
    }
    // Totality: a line the exclusion above recognizes but no branch consumed is
    // still a line of prose. Without this, the loop would never advance.
    if (para.length === 0) { para.push(lines[i]); i++; }
    blocks.push({ kind: 'paragraph', inlines: parseInlines(para.join(' '), ctx) });
  }

  return { blocks, relations, refusals, advisories, footnotes, citations };
}

// ---------- GFM pipe tables ----------

// Split a pipe-delimited row into trimmed cell strings; `\|` escapes a literal
// pipe, and one optional leading/trailing pipe is stripped.
function splitTableRow(line) {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '|') { current += '|'; i++; continue; }
    if (ch === '|') { cells.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function isTableDelimiterRow(line) {
  const t = line.trim();
  if (!t) return false;
  const cells = splitTableRow(t);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function tableCellAlign(cell) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

// A header row (must carry a pipe) immediately followed by a same-width
// delimiter row starts a table; GFM allows this without a blank-line gap.
function isTableStart(lines, i) {
  if (i + 1 >= lines.length) return false;
  if (!lines[i].includes('|')) return false;
  if (!isTableDelimiterRow(lines[i + 1])) return false;
  return splitTableRow(lines[i]).length === splitTableRow(lines[i + 1]).length;
}

// Inline parse to a token list. Order: code spans first (their content is inert),
// then wikilinks, citations, links, images, footnote marks, strong, emphasis.
function parseInlines(text, ctx, opts = {}) {
  const { relations, footnotes, refusals, references, citations, citedKeys } = ctx;
  const tokens = [];
  const pattern = /(`[^`]+`)|(!\[\[[^\]]+\.(?!md\b)[A-Za-z0-9]{1,5}(?:\|[^\]]*)?\]\])|(!\[[^\]]*\]\([^)]+\))|(\[\[[^\]]+\]\])|(\[@[^\]]+\])|(\[[^\]]+\]\([^)]+\))|(\[\^[^\]]+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let cursor = 0;
  for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
    if (m.index > cursor) tokens.push({ kind: 'text', text: text.slice(cursor, m.index) });
    const tok = m[0];
    cursor = m.index + tok.length;
    if (tok.startsWith('`')) {
      tokens.push({ kind: 'code', text: tok.slice(1, -1) });
    } else if (tok.startsWith('![[')) {
      // An embed in the wikilink syntax names a file (not a note) and, after a bar, its caption.
      const [target, caption] = tok.slice(3, -2).split('|');
      tokens.push({ kind: 'image', alt: (caption ?? target.split('/').pop()).trim(), src: encodeURI(target.trim()) });
    } else if (tok.startsWith('![')) {
      const im = tok.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      tokens.push({ kind: 'image', alt: im[1], src: im[2] });
    } else if (tok.startsWith('[[')) {
      const wl = tok.slice(2, -2);
      const [target, label] = wl.split('|');
      if (!opts.skipRelation) relations.push({ type: 'links', to: target.trim(), literal: false, provenance: 'body' });
      tokens.push({ kind: 'wikilink', target: target.trim(), label: (label || '').trim() });
    } else if (tok.startsWith('[@')) {
      const items = parseCitationItems(tok.slice(1, -1)).map((item) => {
        const reference = references[item.key];
        if (!reference) {
          refusals.push({ code: 'R-03', reason: `unknown citation key "${item.key}"` });
          return { ...item, reference: null };
        }
        relations.push({ type: 'cites', to: item.key, literal: true, provenance: 'body' });
        if (!citedKeys.has(item.key)) { citedKeys.add(item.key); citations.push({ key: item.key, reference }); }
        return { ...item, reference };
      });
      tokens.push({ kind: 'citation', items });
    } else if (tok.startsWith('[^')) {
      const id = tok.slice(2, -1);
      tokens.push({ kind: 'sidenote', id, text: footnotes.get(id) ?? null });
    } else if (tok.startsWith('[')) {
      const lk = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      tokens.push({ kind: 'link', label: lk[1], href: lk[2] });
    } else if (tok.startsWith('**')) {
      tokens.push({ kind: 'strong', text: tok.slice(2, -2) });
    } else {
      tokens.push({ kind: 'em', text: tok.slice(1, -1) });
    }
  }
  if (cursor < text.length) tokens.push({ kind: 'text', text: text.slice(cursor) });
  return tokens;
}

// ---------- rendering ----------

// Heading ids in document order, unique within the page: a repeated heading
// text takes a numeric suffix, and a heading with no sluggable text is named
// by its position. The body and the table of contents both read this list.
export function headingIds(parsed, { reservedIds = [] } = {}) {
  const seen = new Map();
  for (const reserved of reservedIds) seen.set(reserved, 1);
  const ids = [];
  for (const [index, block] of parsed.blocks.entries()) {
    if (block.kind !== 'heading') continue;
    const base = headingSlug(inlineText(block.inlines)) || `section-${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    ids.push(count === 1 ? base : `${base}-${count}`);
  }
  return ids;
}

// Heading levels in document order with no skipped level: a heading may sit at
// most one level below the heading before it, and the first sits under the
// page title. The authored level is preserved in the AST; only the rendered
// outline is closed.
export function headingLevels(parsed) {
  const levels = [];
  let previous = 1;
  for (const block of parsed.blocks) {
    if (block.kind !== 'heading') continue;
    const level = Math.min(block.level, previous + 1);
    levels.push(level);
    previous = level;
  }
  return levels;
}

// resolve(target) -> { href, type, title } | null
export function renderBody(parsed, { resolve, reservedIds = [] }) {
  const notes = { counter: 0 };
  const ids = headingIds(parsed, { reservedIds });
  const levels = headingLevels(parsed);
  let heading = 0;
  const out = [];
  for (const block of parsed.blocks) {
    const index = block.kind === 'heading' ? heading++ : -1;
    out.push(renderBlock(block, resolve, notes, index === -1 ? undefined : { id: ids[index], level: levels[index] }));
  }
  return out.join('\n');
}

// Hrefs a rendered page may carry: relative and root-relative paths, fragments,
// and the http, https, mailto, and tel schemes. Anything else, a data URI
// included, is authored text, not a reference the site vouches for.
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const DOCUMENT_HREF = /\.md(#.*)?$/iu;
export function safeHref(href) {
  if (typeof href !== 'string' || href === '') return null;
  // Classify as the URL consumer does without rewriting the authored href.
  // Schemes are ASCII, so Unicode case folding must not admit or deny one.
  const urlInput = href.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '').replace(/[\t\n\r]/g, '');
  const scheme = urlInput.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return href;
  return SAFE_SCHEMES.has(`${scheme[1].toLowerCase()}:`) ? href : null;
}

// An embed names its content by path or by ni URI (RFC 6920), which the site
// serves at /.well-known/ni/. Its media type, the ni URI's ct attribute or else
// the path's extension, chooses the element: video, audio, image, or a link.
function renderEmbed(t) {
  const ni = niUriName(t.src);
  const src = ni === null ? safeHref(t.src) : niWellKnownPath(ni);
  if (src === null) return `<span class="potential-image">${escapeHtml(t.alt)}</span>`;
  const type = (ni === null ? null : niUriContentType(t.src)) ?? extensionType(t.src.split(/[?#]/u)[0]);
  const [href, alt] = [escapeHtml(src), escapeHtml(t.alt)];
  if (type.startsWith('video/')) return `<video controls preload="metadata" src="${href}" title="${alt}"><a href="${href}">${alt}</a></video>`;
  if (type.startsWith('audio/')) return `<audio controls preload="metadata" src="${href}" title="${alt}"><a href="${href}">${alt}</a></audio>`;
  if (type.startsWith('image/') || type === 'application/octet-stream') return `<img src="${href}" alt="${alt}" loading="lazy" />`;
  return `<a class="embed" href="${href}" type="${escapeHtml(type)}">${alt}</a>`;
}

function renderBlock(block, resolve, notes, heading) {
  switch (block.kind) {
    case 'heading': {
      const level = heading?.level ?? block.level;
      const id = heading?.id ?? headingSlug(inlineText(block.inlines));
      return `<h${level} id="${escapeHtml(id)}">${renderInlines(block.inlines, resolve, notes)}</h${level}>`;
    }
    case 'paragraph':
      return `<p>${renderInlines(block.inlines, resolve, notes)}</p>`;
    case 'quote':
      return `<blockquote><p>${renderInlines(block.inlines, resolve, notes)}</p></blockquote>`;
    case 'callout': {
      const label = block.type[0].toUpperCase() + block.type.slice(1);
      const title = block.title ? `<span class="callout-title">: ${escapeHtml(block.title)}</span>` : '';
      return `<aside class="callout callout-${block.type}"><p class="callout-label">${label}${title}</p><p>${renderInlines(block.inlines, resolve, notes)}</p></aside>`;
    }
    case 'fields': {
      const rows = block.fields.map((f) =>
        `<div class="inline-field"><dt class="field-key">${escapeHtml(f.key)}</dt><dd class="field-value">${renderInlines(f.inlines, resolve, notes)}</dd></div>`).join('');
      return `<dl class="inline-fields">${rows}</dl>`;
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((it) => `<li>${renderInlines(it, resolve, notes)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'code':
      return `<figure class="listing"><figcaption class="listing-language">${escapeHtml(block.lang)}</figcaption><pre><code class="language-${escapeHtml(block.lang)}">${escapeHtml(block.text)}</code></pre></figure>`;
    case 'table': {
      const alignAttr = (a) => (a ? ` style="text-align:${a}"` : '');
      const th = block.header.map((inlines, idx) =>
        `<th scope="col"${alignAttr(block.align[idx])}>${renderInlines(inlines, resolve, notes)}</th>`).join('');
      const body = block.rows.map((row) =>
        `<tr>${block.align.map((a, idx) => `<td${alignAttr(a)}>${row[idx] ? renderInlines(row[idx], resolve, notes) : ''}</td>`).join('')}</tr>`).join('');
      return `<figure class="table-scroll"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></figure>`;
    }
    default:
      return '';
  }
}

function renderInlines(inlines, resolve, notes) {
  return inlines.map((t) => {
    switch (t.kind) {
      case 'text': return escapeHtml(t.text);
      case 'code': return `<code>${escapeHtml(t.text)}</code>`;
      case 'strong': return `<strong>${escapeHtml(t.text)}</strong>`;
      case 'em': return `<em>${escapeHtml(t.text)}</em>`;
      case 'link': {
        const href = safeHref(t.href);
        // A Markdown document reference that no catalog rewrote to a route is a
        // dangling internal link; it renders as a potential link, like an
        // unresolved wikilink, rather than as a broken anchor.
        if (href === null || (DOCUMENT_HREF.test(href) && !/^[a-z][a-z0-9+.-]*:/i.test(href))) {
          return `<span class="potential-link">${escapeHtml(t.label)}<sup class="potential-mark" aria-hidden="true">?</sup></span>`;
        }
        return `<a href="${escapeHtml(href)}">${escapeHtml(t.label)}</a>`;
      }
      case 'image': return renderEmbed(t);
      case 'wikilink': {
        const target = resolve(t.target);
        const label = t.label || (target ? target.title : t.target);
        if (!target) {
          return `<span class="potential-link">${escapeHtml(label)}<sup class="potential-mark" aria-hidden="true">?</sup></span>`;
        }
        return `<a href="${escapeHtml(target.href)}" data-cell-type="${escapeHtml(target.type)}">${escapeHtml(label)}</a>`;
      }
      case 'sidenote': {
        notes.counter += 1;
        const n = notes.counter;
        const body = t.text === null ? '' : escapeHtml(t.text);
        return `<label for="sn-${n}" class="sidenote-toggle"><sup>${n}</sup></label>` +
          `<input type="checkbox" id="sn-${n}" class="sidenote-state" />` +
          `<span class="sidenote" role="note"><sup>${n}</sup> ${body}</span>`;
      }
      case 'citation': {
        // Citations reuse the sidenote mechanism for their margin copies,
        // numbered in the same sequence as footnotes (shared `notes` counter).
        const rendered = t.items.map((item) => renderCitationItem(item, notes));
        const anchors = rendered.map((r) => r.anchor).join('; ');
        const sidenotes = rendered.map((r) => r.sidenote).join('');
        return `(${anchors})${sidenotes}`;
      }
      default: return '';
    }
  }).join('');
}

// One citation-bracket item -> its inline anchor and its margin sidenote.
function renderCitationItem(item, notes) {
  if (!item.reference) {
    return { anchor: `<span class="potential-link">@${escapeHtml(item.key)}<sup class="potential-mark" aria-hidden="true">?</sup></span>`, sidenote: '' };
  }
  notes.counter += 1;
  const n = notes.counter;
  const label = escapeHtml(formatCitationLabel(item.reference, item.locator));
  const anchor = `<a class="citation" href="#ref-${escapeHtml(item.key)}">${label}</a>`;
  const entry = formatReferenceEntry(item.reference);
  const sidenote = `<label for="sn-${n}" class="sidenote-toggle"><sup>${n}</sup></label>` +
    `<input type="checkbox" id="sn-${n}" class="sidenote-state" />` +
    `<span class="sidenote" role="note"><sup>${n}</sup> ${entry}</span>`;
  return { anchor, sidenote };
}

function inlineText(inlines) {
  return inlines.map((t) => t.text || t.label || t.target || '').join('');
}


export function tocOf(parsed, { reservedIds = [] } = {}) {
  const ids = headingIds(parsed, { reservedIds });
  const levels = headingLevels(parsed);
  return parsed.blocks.filter((b) => b.kind === 'heading')
    .map((b, index) => ({ level: levels[index], text: inlineText(b.inlines), id: ids[index] }));
}
