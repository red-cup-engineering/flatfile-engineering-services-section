const FOLDS = new Set(["none", "separator-insensitive", "camel-separator-insensitive"]);
const BOUNDARIES = new Set(["none", "non-alphanumeric"]);

function requireString(value, name) {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isLowerOrNumber(value) {
  return /^[\p{Ll}\p{N}]$/u.test(value);
}

function isUpper(value) {
  return /^\p{Lu}$/u.test(value);
}

function camelTokens(value) {
  const tokens = [];
  let token = "";
  let previous = null;
  for (const character of Array.from(value)) {
    if (character === "-" || character === "_") {
      if (token.length > 0) tokens.push(token);
      token = "";
      previous = null;
      continue;
    }
    if (token.length > 0 && isLowerOrNumber(previous) && isUpper(character)) {
      tokens.push(token);
      token = "";
    }
    token += character;
    previous = character;
  }
  if (token.length > 0) tokens.push(token);
  return tokens;
}

function patternFor(query, fold) {
  if (fold === "none") return escapeRegExp(query);
  if (fold === "separator-insensitive") return Array.from(query).map((character) => (
    character === "-" || character === "_" ? "[-_]" : escapeRegExp(character)
  )).join("");
  const tokens = camelTokens(query);
  return tokens.length === 0 ? "[-_]" : tokens.map(escapeRegExp).join("(?:[-_])?");
}

function isAlphanumeric(character) {
  return character !== undefined && /^[\p{L}\p{N}]$/u.test(character);
}

function validate(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("request must be an object");
  }
  const {
    subject,
    query,
    caseSensitive = false,
    fold = "none",
    boundary = "none",
  } = request;
  requireString(subject, "subject");
  requireString(query, "query");
  if (query.length === 0) throw new TypeError("query must be a nonempty string");
  if (typeof caseSensitive !== "boolean") throw new TypeError("caseSensitive must be a boolean");
  if (!FOLDS.has(fold)) throw new TypeError(`fold must be one of ${[...FOLDS].join(", ")}`);
  if (!BOUNDARIES.has(boundary)) throw new TypeError(`boundary must be one of ${[...BOUNDARIES].join(", ")}`);
  return Object.freeze({ subject, query, caseSensitive, fold, boundary });
}

/** Compare a subject to a query under explicit case, folding, and boundary policies. */
export function compareStrings(request = {}) {
  const { subject, query, caseSensitive, fold, boundary } = validate(request);
  const expression = new RegExp(patternFor(query, fold), caseSensitive ? "gu" : "giu");
  const spans = [];
  for (const match of subject.matchAll(expression)) {
    const start = match.index;
    const end = start + match[0].length;
    if (boundary === "non-alphanumeric" && (isAlphanumeric(subject[start - 1]) || isAlphanumeric(subject[end]))) continue;
    spans.push(Object.freeze({ matchedText: match[0], start, end }));
  }
  const relation = spans.some(({ start, end }) => start === 0 && end === subject.length)
    ? "equal"
    : spans.length > 0 ? "contains" : "absent";
  return Object.freeze({
    type: "StringComparison",
    relation,
    spans: Object.freeze(spans),
  });
}

/** Compare the JSON request consumed by the executable form. */
export const main = compareStrings;
