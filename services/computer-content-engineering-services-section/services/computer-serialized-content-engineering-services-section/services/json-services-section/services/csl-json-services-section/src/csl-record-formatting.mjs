// Plain author-year citation formatting over CSL-JSON reference entries, per
// the citation section of the VICTOR dialect specification. No citeproc
// dependency: this is the small formatter the note asks for, covering the
// article-journal, report, book, chapter, and webpage CSL types.

import { escapeHtml } from '@red-cup-engineering/html-structural-projection-service/string-rendering';
import { admitCslItem, cslDate, issuedYear, nameFromString, nameToString } from './csl-json.mjs';
import { decodeReferencesValue } from './csl-references.mjs';

/**
 * Split a citation bracket's interior into its component items. Each item is
 * "@key" optionally followed by ", <locator>"; several items separate on ";".
 *
 * @param {string} text - the bracket interior, e.g. "@a, p. 12; @b".
 * @returns {Array<{key: string, locator: (string|null)}>} parsed items, in
 *   the order they appear; malformed items are dropped.
 */
export function parseCitationItems(text) {
  return text.split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^@([A-Za-z][\w-]*)\s*(?:,\s*(.+))?$/u);
      return m ? { key: m[1], locator: m[2] ? m[2].trim() : null } : null;
    })
    .filter((item) => item !== null);
}

function personName(person) {
  if (!person || typeof person !== 'object') return '';
  if (typeof person.literal === 'string') return person.literal;
  return [person.given, person.family].filter(Boolean).join(' ');
}

function personFamily(person) {
  if (!person || typeof person !== 'object') return '';
  if (typeof person.literal === 'string') return person.literal;
  return person.family || person.given || '';
}

/**
 * Join a CSL-JSON author (or editor) list into full prose, "and"-joined.
 *
 * @param {Array<object>} [authors] - CSL-JSON name objects (`given`/`family`
 *   or `literal`).
 * @returns {string} plain text, e.g. "A and B" or "A, B, and C"; empty when
 *   there are no names.
 */
export function formatAuthorsFull(authors) {
  const names = Array.isArray(authors) ? authors.map(personName).filter(Boolean) : [];
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function referenceYear(reference) {
  const parts = reference?.issued?.['date-parts']?.[0];
  return Array.isArray(parts) && parts[0] != null ? String(parts[0]) : 'n.d.';
}

/**
 * The short author-year label a citation renders in running text, e.g.
 * "Choutka 2022" or, with a locator, "Choutka et al. 2022, p. 12".
 *
 * @param {object} reference - a CSL-JSON reference entry.
 * @param {string|null} [locator] - an optional page/section locator.
 * @returns {string} plain text (the caller wraps it in parens and escapes).
 */
export function formatCitationLabel(reference, locator) {
  const authors = Array.isArray(reference?.author) ? reference.author : [];
  const year = referenceYear(reference);
  let who;
  if (authors.length === 0) who = reference?.title ? String(reference.title).split(/[.:]/u)[0].trim() : 'Unknown';
  else if (authors.length === 1) who = personFamily(authors[0]);
  else if (authors.length === 2) who = `${personFamily(authors[0])} & ${personFamily(authors[1])}`;
  else who = `${personFamily(authors[0])} et al.`;
  return locator ? `${who} ${year}, ${locator}` : `${who} ${year}`;
}

/**
 * Render one CSL-JSON reference entry in a plain author-year style, covering
 * article-journal, report, book, chapter, and webpage; other types fall back
 * to a minimal author/title/year line. No citeproc dependency.
 *
 * @param {object} reference - a CSL-JSON reference entry.
 * @returns {string} trusted HTML for the entry's content; the caller supplies
 *   the `<li id="ref-key">` wrapper.
 */
export function formatReferenceEntry(reference) {
  const authorsHtml = escapeHtml(formatAuthorsFull(reference?.author) || 'Unknown');
  const year = referenceYear(reference);
  const title = escapeHtml(reference?.title || 'Untitled');
  const publisher = reference?.publisher ? escapeHtml(reference.publisher) : '';
  const container = reference?.['container-title'] ? escapeHtml(reference['container-title']) : '';

  switch (reference?.type) {
    case 'article-journal': {
      const volIssue = [reference.volume, reference.issue ? `no. ${reference.issue}` : null].filter(Boolean).join(', ');
      const pages = reference.page ? `: ${escapeHtml(String(reference.page))}` : '';
      const venue = container ? `<cite>${container}</cite>` : '';
      return `${authorsHtml}. "${title}." ${venue}${volIssue ? ` ${escapeHtml(volIssue)}` : ''} (${year})${pages}.`;
    }
    case 'chapter': {
      const editors = formatAuthorsFull(reference.editor);
      const pages = reference.page ? `, ${escapeHtml(String(reference.page))}` : '';
      const venue = container ? `<cite>${container}</cite>` : '';
      return `${authorsHtml}. "${title}." In ${venue}${editors ? `, ed. ${escapeHtml(editors)}` : ''}${pages}${publisher ? `, ${publisher}` : ''}, ${year}.`;
    }
    case 'webpage': {
      const venue = container || publisher;
      const url = reference.URL ? ` <a href="${escapeHtml(reference.URL)}">${escapeHtml(reference.URL)}</a>` : '';
      return `${authorsHtml}. <cite>${title}</cite>. ${venue}, ${year}.${url}`;
    }
    case 'book':
    case 'report':
    default: {
      const venue = publisher || container;
      return `${authorsHtml}. <cite>${title}</cite>. ${venue}, ${year}.`;
    }
  }
}

/**
 * Read one reference entry as CSL-JSON. A CSL-JSON entry passes through; the house citekey form
 * the term contract admits (`authors` as name strings, `year`, `publication`, `doi`, `url`,
 * `volume`, `issue`, `pages`, `edition`) becomes the CSL-JSON entry it describes, so every
 * renderer and projection reads one reference shape.
 *
 * @param {object} reference
 * @returns {object} a CSL-JSON reference entry.
 */
export function cslReference(reference) {
  if (!reference || typeof reference !== 'object') return reference;
  const standard = Array.isArray(reference.author) || reference.issued;
  const normalized = standard
    ? decodeReferencesValue([reference]).items[0]
    : decodeReferencesValue({ reference }).items[0];
  if (normalized === undefined) return reference;
  const { id: _id, ...entry } = normalized;
  if (entry.URL === undefined && entry.DOI !== undefined) entry.URL = `https://doi.org/${entry.DOI}`;
  return entry;
}

/** One CSL-JSON reference as a schema.org CreativeWork for a page's JSON-LD `citation`. */
export function schemaOrgCitation(reference) {
  const csl = cslReference(reference);
  const year = csl?.issued?.['date-parts']?.[0]?.[0];
  const work = {
    '@type': csl?.type === 'article-journal' ? 'ScholarlyArticle' : csl?.type === 'chapter' ? 'Chapter' : 'CreativeWork',
    name: csl?.title,
    author: Array.isArray(csl?.author) ? csl.author.map((person) => ({ '@type': 'Person', name: personName(person) })).filter((person) => person.name) : undefined,
    datePublished: year != null ? String(year) : undefined,
    isPartOf: csl?.['container-title'] ? { '@type': 'Periodical', name: csl['container-title'] } : undefined,
    publisher: csl?.publisher ? { '@type': 'Organization', name: csl.publisher } : undefined,
    identifier: csl?.DOI ? { '@type': 'PropertyValue', propertyID: 'doi', value: csl.DOI } : undefined,
    url: csl?.URL,
  };
  return Object.fromEntries(Object.entries(work).filter(([, value]) => value !== undefined));
}

const HOUSE_CITEKEY_RE = /^[a-z][a-z0-9-]*[0-9]{4}[a-z0-9-]*$/u;

function surnameToken(name) {
  const source = typeof name === 'string' ? name : (name?.family ?? name?.literal ?? '');
  return String(source).split(',')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, '');
}

/** Mint the house's stable author-year citekey for a CSL record. */
export function makeCitekey(names, year, taken = new Set()) {
  const tokens = (names ?? []).map(surnameToken).filter((token) => token.length > 0);
  const base = tokens.length > 0 ? `${tokens[0]}${year}` : `anon${year}`;
  if (!taken.has(base)) return base;
  for (const suffix of 'abcdefghijklmnopqrstuvwxyz') {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`CSL record formatting: too many citekey collisions on ${base}`);
}

function identityReferenceEntry(_citekey, entry) {
  return Object.freeze({ ...entry });
}

function referenceAdmission(options) {
  const admit = options.admitReferenceEntry ?? identityReferenceEntry;
  if (typeof admit !== 'function') throw new TypeError('admitReferenceEntry must be a function');
  return admit;
}

/** Project one CSL-JSON item to the house depth-1 reference-record shape. */
export function fromCslItem(item, options = {}) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new TypeError('fromCslItem requires a CSL-JSON item object');
  }
  const taken = options.taken ?? new Set();
  const hasHouseCitekeyId = typeof item.id === 'string' && HOUSE_CITEKEY_RE.test(item.id);
  const sourceId = !hasHouseCitekeyId && typeof item.id === 'string' && item.id.trim() !== '' ? item.id.trim() : null;
  const namesForKey = Array.isArray(item.author) && item.author.length > 0 ? item.author
    : Array.isArray(item.editor) && item.editor.length > 0 ? item.editor
    : null;
  if (!hasHouseCitekeyId && namesForKey === null) {
    throw new TypeError('cannot mint a citekey for this CSL item: no author or editor to derive a surname from');
  }
  const yearForKey = issuedYear(item.issued);
  if (!hasHouseCitekeyId && !Number.isInteger(yearForKey)) {
    throw new TypeError('cannot mint a citekey for this CSL item: no resolvable issued year');
  }
  const citekey = hasHouseCitekeyId ? item.id : makeCitekey(namesForKey, yearForKey, taken);
  taken.add(citekey);

  const admitted = admitCslItem({ ...item, id: citekey });
  const names = admitted.author ?? admitted.editor ?? [];
  const entry = { authors: names.map(nameToString), title: admitted.title, year: issuedYear(admitted.issued) };
  if (typeof admitted['container-title'] === 'string' && admitted['container-title'].trim() !== '') entry.publication = admitted['container-title'];
  if (typeof admitted.publisher === 'string' && admitted.publisher.trim() !== '') entry.publisher = admitted.publisher;
  if (typeof admitted.DOI === 'string' && admitted.DOI.trim() !== '') entry.doi = admitted.DOI;
  if (typeof admitted.URL === 'string' && admitted.URL.trim() !== '') entry.url = admitted.URL;
  if (typeof admitted.note === 'string' && admitted.note.trim() !== '') entry.note = admitted.note;
  if (entry.note === undefined && sourceId !== null && sourceId !== entry.doi && sourceId !== entry.url) entry.note = `source id: ${sourceId}`;
  return Object.freeze({ citekey, entry: referenceAdmission(options)(citekey, entry) });
}

/** Project one admitted house depth-1 reference record to CSL-JSON. */
export function toCslItem(citekey, entry, options = {}) {
  const admitted = referenceAdmission(options)(citekey, entry);
  const type = admitted.publication !== undefined ? 'article-journal' : admitted.publisher !== undefined ? 'book' : 'document';
  const item = {
    id: citekey,
    type,
    author: admitted.authors.map(nameFromString),
    title: admitted.title,
    issued: cslDate(admitted.year),
  };
  if (admitted.publication !== undefined) item['container-title'] = admitted.publication;
  if (admitted.publisher !== undefined) item.publisher = admitted.publisher;
  if (admitted.doi !== undefined) item.DOI = admitted.doi;
  if (admitted.url !== undefined) item.URL = admitted.url;
  if (admitted.note !== undefined) item.note = admitted.note;
  return Object.freeze(item);
}
