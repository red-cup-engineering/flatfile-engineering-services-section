/**
 * Matching names against a list of named records: people, companies, places. A name is folded to
 * its words (case, accents and punctuation dropped; words the caller names as uninformative, such
 * as company forms, left out), and each word is weighted by how rare it is across the list, so two
 * names sharing a common word ("Shenzhen", "Electronic") score low and two sharing a rare one score
 * high. Pure: the caller supplies the records and the words to ignore.
 * @packageDocumentation
 */

/** Words naming a company's legal form or a generic business word, not the company. */
export const COMPANY_FORM_WORDS = Object.freeze(new Set([
  "CO", "COMPANY", "CORP", "CORPORATION", "INC", "INCORPORATED", "LTD", "LIMITED", "LLC", "LLP", "LP", "PLC",
  "GMBH", "AG", "SA", "SRL", "BV", "JSC", "PJSC", "OJSC", "GROUP", "HOLDING", "HOLDINGS", "INTERNATIONAL", "INTL",
  "TECHNOLOGY", "TECHNOLOGIES", "TECH", "INDUSTRIAL", "INDUSTRY", "INDUSTRIES", "TRADING", "IMPORT", "EXPORT",
  "MANUFACTURING", "MFG", "THE", "AND", "OF",
]));

/** A name's words: upper case, accents and punctuation dropped; Han characters kept. */
export const nameWords = (name) => String(name ?? "").toUpperCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Z0-9一-鿿]+/g, " ").trim().split(" ").filter(Boolean);

/** A name folded for comparison: its words less `ignored`, in order, joined by spaces. */
export const foldName = (name, { ignored = COMPANY_FORM_WORDS } = {}) => nameWords(name).filter((word) => !ignored.has(word)).join(" ");

/**
 * An index over records' names: each record's names folded once, folded names to records, each
 * word to the records carrying it, and each word's weight, the log of how rare it is in the list.
 * @template R
 * @param {R[]} records
 * @param {{namesOf?: (record: R) => string[], ignored?: Set<string>}} [options]
 */
export function nameIndex(records, { namesOf = (record) => [record.name], ignored = COMPANY_FORM_WORDS } = {}) {
  const names = records.map((record) => (namesOf(record) ?? []).filter(Boolean)
    .map((name) => ({ name, folded: foldName(name, { ignored }) })).filter((n) => n.folded));
  const exact = new Map();
  const byWord = new Map();
  names.forEach((list, at) => {
    for (const { folded } of list) {
      exact.set(folded, [...(exact.get(folded) ?? []), at]);
      for (const word of folded.split(" ")) byWord.set(word, (byWord.get(word) ?? new Set()).add(at));
    }
  });
  const weight = (word) => Math.log((records.length + 1) / ((byWord.get(word)?.size ?? 0) + 1));
  return Object.freeze({ records, names, exact, byWord, weight, ignored });
}

/** The words two names share, and the shared words' weight as a share of the heavier name's. */
export function nameOverlap(a, b, weight = () => 1) {
  const mine = new Set(a);
  const other = new Set(b);
  const shared = [...mine].filter((word) => other.has(word));
  const total = (words) => [...words].reduce((sum, word) => sum + weight(word), 0);
  return Object.freeze({ shared: shared.length, score: total(shared) / Math.max(total(mine), total(other), 1e-9) });
}

/**
 * Every record whose name matches `name`, best first. A match is `exact` when the folded names are
 * equal and either carries two or more words or the names are equal before folding; a one-word
 * folded match ("Fortune Company Ltd." against "Fortune") is `near`, and so is any name sharing at
 * least `minShared` words that carry at least `threshold` of the heavier name's weight.
 * @param {ReturnType<typeof nameIndex>} index
 * @param {string} name
 * @returns {{record: object, kind: "exact"|"near", matched: string, score: number}[]}
 */
export function matchName(index, name, { threshold = 0.6, minShared = 2 } = {}) {
  const folded = foldName(name, { ignored: index.ignored });
  const words = folded.split(" ").filter(Boolean);
  if (words.length === 0) return Object.freeze([]);
  const plain = (text) => nameWords(text).join(" ");
  const candidates = new Set(index.exact.get(folded) ?? []);
  for (const word of words) for (const at of index.byWord.get(word) ?? []) candidates.add(at);
  const matches = [];
  for (const at of candidates) {
    let best = null;
    for (const { name: candidate, folded: other } of index.names[at]) {
      if (other === folded && (words.length >= 2 || plain(candidate) === plain(name))) { best = { kind: "exact", matched: candidate, score: 1 }; break; }
      if (other === folded) { if (!best || best.score < 1) best = { kind: "near", matched: candidate, score: 1 }; continue; }
      const { shared, score } = nameOverlap(words, other.split(" "), index.weight);
      if (shared >= minShared && score >= threshold && (!best || score > best.score)) best = { kind: "near", matched: candidate, score };
    }
    if (best) matches.push(Object.freeze({ record: index.records[at], ...best, score: Number(best.score.toFixed(2)) }));
  }
  return Object.freeze(matches.sort((a, b) => (b.kind === "exact") - (a.kind === "exact") || b.score - a.score));
}
