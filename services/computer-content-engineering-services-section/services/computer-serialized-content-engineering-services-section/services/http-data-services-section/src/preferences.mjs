import { splitHeaderList, splitHeaderParameters } from "./header-value.mjs";

/** All three Accept fields share the same finite weighted-token carrier.
 * Invalid weights exclude the named range, so a wildcard cannot revive it. */
export function parseWeightedField(header) {
  return splitHeaderList(header).map((part, order) => {
    const [value = "", ...parameters] = splitHeaderParameters(part);
    const weights = parameters.filter(parameter => /^q\s*=/i.test(parameter));
    const weight = weights.length === 1
      ? /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(weights[0])
      : null;
    return { value: value.toLowerCase(), q: weights.length === 0 ? 1 : weight ? Number(weight[1]) : 0, order, parameters };
  });
}

const rank = (a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order;

export function parseAccept(header) {
  return parseWeightedField(header).map(({ value, q, order }) => {
    const [type = "*", subtype = "*"] = value.split("/");
    return { type, subtype, q, specificity: type === "*" ? 0 : subtype === "*" ? 1 : 2, order };
  }).sort(rank);
}

export function parseAcceptLanguage(header) {
  return parseWeightedField(header).map(({ value: range, q, order }) => ({
    range, q, specificity: range === "*" ? 0 : range.split("-").filter(Boolean).length, order,
  })).sort(rank);
}

export function parseAcceptEncoding(header) {
  const preferences = new Map();
  for (const { value, q, parameters } of parseWeightedField(header)) {
    if (/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(value)) {
      preferences.set(value, parameters.length && (parameters.length !== 1 || !/^q=/i.test(parameters[0])) ? 0 : q);
    }
  }
  return preferences;
}
