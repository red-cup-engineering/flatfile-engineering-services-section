const CURRENCY_CLASS = "$€£¥₩₹₽¢";
/** A comma-grouped or decimal number, optionally currency-prefixed: one of
 * (a) a currency symbol followed by digits, with any run of comma/decimal groups,
 * (b) plain digits with at least one comma-group or decimal-point group, or
 * (c) plain digits immediately followed by a percent sign (consumed below).
 * Each alternative requires a digit after every comma/period so a sentence-final
 * period or a plain list-separating comma is never pulled into the match. */
const NUMBER_TOKEN_SOURCE = `[${CURRENCY_CLASS}]\\d+(?:[,.]\\d+)*` +
    `|\\d+(?:[,.]\\d+)+` +
    `|\\d+(?=%)`;
/** Word-internal joiners: apostrophes and hyphens, unchanged from the original tokenizer. */
const WORD_TOKEN_SOURCE = "[\\p{L}\\p{M}\\p{N}](?:[''ʼ‐\\-]?[\\p{L}\\p{M}\\p{N}])*";
/** One token: a numeric token (with its optional trailing percent sign and any
 * directly-attached unit letters, e.g. "$40.5bn"), or else a default word run. */
const TOKEN_RE_SOURCE = `(?:${NUMBER_TOKEN_SOURCE})%?[\\p{L}]*|${WORD_TOKEN_SOURCE}`;
/** A token text reads as numeric when it opens with an optional currency symbol
 * then a digit — covers every match produced by `NUMBER_TOKEN_SOURCE` above, plus
 * plain digit runs ("2020", "10") matched by the fallback word alternative. */
const NUMERIC_TOKEN_RE = new RegExp(`^[${CURRENCY_CLASS}]?\\d`, "u");
/** Whether a word begins with the canonical numeric prefix. */
export function isNumericWord(text) { return NUMERIC_TOKEN_RE.test(text); }
/** Unicode words, internal joiners and numeric amounts, preserving source offsets. */
export function tokenizeWords(text, baseOffset = 0) {
    return Array.from(text.matchAll(new RegExp(TOKEN_RE_SOURCE, "gu")), (match) => {
        const start = baseOffset + match.index;
        return Object.freeze({ tier: "word", text: match[0], start, end: start + match[0].length,
            ...(isNumericWord(match[0]) ? { numeric: true } : {}) });
    });
}
