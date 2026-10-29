/** One RMN contraction table. Step, complete development, and normalization
 * differ only in strategy; all congruence comes from grammar child slots. */
import {
  tm,
  instantiateRmn,
  boolOfTerm,
  isRmnValue,
  mapRmnImmediate,
  RMN_FORMS,
  rmnListHeadTail,
  validateRmnTerm,
} from "../../relation-model-notation-service/src/index.mjs";
import {
  jsonToTerm,
  termToJson,
} from "../../relation-model-notation-codecs-services-section/services/relation-model-notation-json-codec-service/src/index.mjs";

function dedupe(terms) {
  const seen = new Set();
  return Object.freeze(
    terms.filter((term) => {
      const key = JSON.stringify(term);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

function rebuild(term, children) {
  return mapRmnImmediate(
    term,
    (child, index, childIndex) => children[index]?.[childIndex ?? 0] ?? child,
  );
}

/** Contract one root redex using already-selected child terms, or null. */
function contract(term, children = {}) {
  const child = (index) => children[index]?.[0] ?? term[index];
  switch (term[0]) {
    // Type ascription is proof evidence, not an executable boundary.  Erase it
    // through the canonical evaluator so checked lambdas remain applicable.
    case "ascribe":
      return child(2);
    case "app":
      return term[1][0] === "lam"
        ? instantiateRmn(child(1)[1], child(2))
        : null;
    case "fst":
      return term[1][0] === "pair" ? child(1)[1] : null;
    case "snd":
      return term[1][0] === "pair" ? child(1)[2] : null;
    case "coincide":
      return isRmnValue(child(1)) && isRmnValue(child(2))
        ? tm.bool(JSON.stringify(child(1)) === JSON.stringify(child(2)))
        : null;
    case "cond": {
      const value = boolOfTerm(child(1));
      return value === undefined ? null : value ? child(2) : child(3);
    }
    case "fold": {
      const decomposed = rmnListHeadTail(child(3));
      if (decomposed === "empty") return child(2);
      if (decomposed === undefined) return null;
      return tm.fold(
        child(1),
        tm.app(tm.app(child(1), child(2)), decomposed.head),
        decomposed.tail,
      );
    }
    default:
      return null;
  }
}

/** Full one-step relation: one root contraction or one immediate-child step. */
function stepUnchecked(term) {
  const out = [],
    root = contract(term);
  if (root) out.push(root);
  mapRmnImmediate(term, (child, index, childIndex) => {
    for (const next of stepUnchecked(child)) {
      const children = { [index]: [] };
      if (childIndex === undefined) children[index][0] = next;
      else {
        children[index] = [...term[index]];
        children[index][childIndex] = next;
      }
      out.push(rebuild(term, children));
    }
    return child;
  });
  return dedupe(out);
}

/** Select normal order's one next contraction without constructing the rest
 * of the one-step relation. The descriptor fixes child order for every RMN
 * form, including list slots, so this remains the same first result as step. */
function firstStepUnchecked(term) {
  const root = contract(term);
  if (root) return root;
  const form = RMN_FORMS[term[0]];
  for (const index of form.terms ?? []) {
    const next = firstStepUnchecked(term[index]);
    if (next) {
      const out = [...term];
      out[index] = next;
      return out;
    }
  }
  for (const index of form.termLists ?? []) {
    for (let childIndex = 0; childIndex < term[index].length; childIndex += 1) {
      const next = firstStepUnchecked(term[index][childIndex]);
      if (next) {
        const out = [...term];
        out[index] = [...term[index]];
        out[index][childIndex] = next;
        return out;
      }
    }
  }
  return undefined;
}

export function step(source) {
  return stepUnchecked(validateRmnTerm(source));
}

/** Takahashi development: contract only redexes present in the input tree. */
function devUnchecked(term) {
  const children = {};
  mapRmnImmediate(term, (child, index, childIndex) => {
    if (childIndex === undefined) {
      children[index] = [devUnchecked(child)];
    } else {
      children[index] ??= [...term[index]];
      children[index][childIndex] = devUnchecked(child);
    }
    return child;
  });
  return contract(term, children) ?? rebuild(term, children);
}

export function dev(source) {
  return devUnchecked(validateRmnTerm(source));
}

/** Normal order over the same contraction table; it never returns undefined. */
export function normalize(source) {
  let current = validateRmnTerm(source);
  while (true) {
    const next = firstStepUnchecked(current);
    if (!next) return current;
    current = next;
  }
}
export const evaluate = normalize;
export { evaluate as eval };
export function evaluateRunTerm(runTerm, input) {
  return termToJson(evaluate(tm.app(runTerm, jsonToTerm(input))));
}
