import {
  RMN_FORMS,
  tm,
  validateRmnTerm,
} from "@red-cup-engineering/relation-model-notation";
import { inferTy, isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import {
  arrayTag,
  objectTag,
  stringTag,
} from "@red-cup-engineering/relation-model-notation-json-codec";
import { parse as parseJson } from "../../../../../../serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import {
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";

const text = (value) => JSON.stringify(value);
const namedList = (items) => items.reduceRight((tail, item) => ["pair", item, tail], ["star"]);

export function namedString(value) {
  return ["pair", ["mark", text(stringTag)], ["mark", text(value)]];
}

export function namedArray(items) {
  return ["pair", ["mark", text(arrayTag)], namedList(items)];
}

export function namedObject(entries) {
  const sorted = [...entries].sort(([left], [right]) => left.localeCompare(right));
  return ["pair", ["mark", text(objectTag)], namedList(sorted.map(([key, value]) => ["pair", ["mark", text(key)], value]))];
}

export function namedBool(value) {
  return ["four", value, !value];
}

export function namedGenerator(name) {
  if (!["specialization", "converse", "subjectProjection", "objectProjection"].includes(name)) {
    throw new TypeError(`namedGenerator: unknown generator ${JSON.stringify(name)}`);
  }
  return ["mark", name];
}

function resolve(scope, name) {
  for (let index = scope.length - 1; index >= 0; index -= 1) {
    if (scope[index] === name) return scope.length - 1 - index;
  }
  throw new TypeError(`compileNamedRmn: unbound variable ${JSON.stringify(name)}`);
}

function namedTermSlot(form, slot) {
  return slot + (form.binders?.includes(slot) ? 1 : 0);
}

function compile(surface, scope) {
  if (!Array.isArray(surface) || typeof surface[0] !== "string") {
    throw new TypeError("compileNamedRmn: a named RMN term must be a tagged array");
  }
  if (surface[0] === "embed") {
    if (surface.length !== 2 || !isClosed(surface[1])) throw new TypeError("compileNamedRmn: embed requires one closed RMN term");
    return validateRmnTerm(surface[1]);
  }
  if (surface[0] === "var") {
    if (surface.length !== 2 || typeof surface[1] !== "string") throw new TypeError("compileNamedRmn: var requires one name");
    return tm.var(resolve(scope, surface[1]));
  }
  const form = RMN_FORMS[surface[0]];
  if (form === undefined) throw new TypeError(`compileNamedRmn: unknown RMN form ${JSON.stringify(surface[0])}`);
  const out = [...surface];
  for (const slot of form.terms ?? []) {
    const namedSlot = namedTermSlot(form, slot);
    const childScope = form.binders?.includes(slot)
      ? [...scope, binderName(surface, slot)]
      : scope;
    out[slot] = compile(surface[namedSlot], childScope);
    if (namedSlot !== slot) out.splice(namedSlot, 1);
  }
  for (const slot of form.termLists ?? []) {
    if (!Array.isArray(surface[slot])) throw new TypeError(`compileNamedRmn: ${surface[0]} requires a term list`);
    out[slot] = surface[slot].map((child) => compile(child, scope));
  }
  return validateRmnTerm(out);
}

function binderName(surface, slot) {
  const name = surface[slot];
  if (typeof name !== "string") throw new TypeError("compileNamedRmn: binder names must be text");
  return name;
}

export function compileNamedRmn(surface) {
  return compile(surface, []);
}

export function parseNamedRmn(source) {
  const term = compileNamedRmn(parseJson(source));
  if (!isClosed(term) || inferTy([], term) === null) throw new TypeError("parseNamedRmn: compiled term is not closed and well typed");
  return term;
}

function namedOf(term, scope) {
  const compiled = validateRmnTerm(term);
  if (compiled[0] === "var") {
    const name = scope[scope.length - 1 - compiled[1]];
    if (name === undefined) throw new TypeError(`canonicalNamedRmn: free positional variable ${compiled[1]}`);
    return ["var", name];
  }
  const form = RMN_FORMS[compiled[0]];
  const out = [...compiled];
  for (const slot of form.terms ?? []) {
    if (form.binders?.includes(slot)) {
      const name = `$${scope.length}`;
      out.splice(slot, 0, name);
      out[slot + 1] = namedOf(compiled[slot], [...scope, name]);
    } else {
      out[slot] = namedOf(compiled[slot], scope);
    }
  }
  for (const slot of form.termLists ?? []) out[slot] = compiled[slot].map((child) => namedOf(child, scope));
  return out;
}

export function canonicalNamedRmn(term) {
  return text(namedOf(term, []));
}

export function digestNamedRmn(term) {
  const semanticType = inferTy([], term);
  if (!isClosed(term) || semanticType === null) throw new TypeError("digestNamedRmn: term must be closed and well typed");
  return identifyNormalizedSemanticContent({
    objectKind: "relation-model-notation.named-term",
    semanticType,
    term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}
