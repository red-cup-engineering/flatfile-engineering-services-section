/**
 * sparql-over-eavt — a SPARQL Basic Graph Pattern evaluator over EAVT witness rows.
 *
 * The behaviour is ported from agent-organization-engine's
 * `lib/knowing/src/writing/sparql`, which lowers the same SPARQL surface through a general
 * Datalog evaluator it carries for other, unrelated callers. This module has exactly one job —
 * join triple patterns over `{e, a, v, t}` rows — so it does that directly, with a plain
 * nested-loop join, instead of bringing in a rule engine to do it. `t` (the witness time) never
 * participates in a pattern; every triple pattern matches only `s` against `e`, `p` against `a`,
 * and `o` against `v`.
 */
import { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-services-section/turtle";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

const SPARQL_VARIABLE = "knowing.sparql.variable";

/** A SPARQL variable term (`{kind: "knowing.sparql.variable", name}`). */
export function sparqlVariable(name) {
  if (typeof name !== "string" || name === "") throw new TypeError("sparql variable name is required");
  return Object.freeze({ kind: SPARQL_VARIABLE, name });
}

/** Read a JSON query term: ?name denotes a variable; other terms stay bound. */
export function sparqlTerm(value) {
  return typeof value === "string" && /^\?[A-Za-z][A-Za-z0-9_]*$/u.test(value)
    ? sparqlVariable(value.slice(1)) : value;
}

/** True when `term` is a SPARQL variable rather than a bound (literal or IRI) term. */
export function isSparqlVariable(term) {
  return term !== null && typeof term === "object" && !Array.isArray(term)
    && term.kind === SPARQL_VARIABLE && typeof term.name === "string";
}

/** One `{s, p, o}` triple pattern; each of `s`, `p`, `o` is a term or a `sparqlVariable`. */
export function triplePattern(s, p, o) {
  return Object.freeze({ s, p, o });
}

/** A deterministic, order-sensitive JSON rendering used only to compare and sort terms. */
function canonical(value) {
  return canonicalJson(value);
}

function sameTerm(left, right) {
  return canonical(left) === canonical(right);
}

/** `binding` extended by matching `pattern` against one EAVT `row`, or `null` when it conflicts. */
function unify(pattern, row, binding) {
  const next = { ...binding };
  for (const [term, value] of [[pattern.s, row.e], [pattern.p, row.a], [pattern.o, row.v]]) {
    if (isSparqlVariable(term)) {
      if (Object.hasOwn(next, term.name)) {
        if (!sameTerm(next[term.name], value)) return null;
      } else {
        next[term.name] = value;
      }
    } else if (!sameTerm(term, value)) {
      return null;
    }
  }
  return next;
}

/** Every binding that satisfies the conjunction of `patterns` over `rows` (a left-deep join). */
function evaluateWhere(rows, patterns) {
  let bindings = [{}];
  for (const pattern of patterns) {
    const next = [];
    for (const binding of bindings) {
      for (const row of rows) {
        const unified = unify(pattern, row, binding);
        if (unified) next.push(unified);
      }
    }
    bindings = next;
    if (bindings.length === 0) break;
  }
  return bindings;
}

function variablesOf(patterns) {
  const names = [];
  const seen = new Set();
  const add = (term) => {
    if (!isSparqlVariable(term) || seen.has(term.name)) return;
    seen.add(term.name);
    names.push(term.name);
  };
  for (const pattern of patterns) { add(pattern.s); add(pattern.p); add(pattern.o); }
  return names;
}

/** The projected variables for a query: an explicit `select`, or every variable a `where`/`construct` mentions. */
function variablesFor(query) {
  if (query.type === "select" && query.select !== undefined) return [...query.select];
  if (query.type === "ask") return [];
  const source = query.type === "construct" ? [...(query.construct ?? []), ...query.where] : query.where;
  return variablesOf(source);
}

/** Project solution mappings without fabricating NULL for an unbound variable.
 * SPARQL SELECT has bag semantics unless DISTINCT is requested. RDF graph
 * triples themselves are sets, so duplicate EAVT witness rows are collapsed
 * before evaluation without erasing distinct joins or witness history. */
function project(bindings, variables, distinct = false) {
  const tuples = bindings.map(binding => {
    const record = Object.fromEntries(variables
      .filter(name => Object.hasOwn(binding, name))
      .map(name => [name, binding[name]]));
    return { key: canonical(record), record: Object.freeze(record) };
  });
  tuples.sort((a,b) => a.key.localeCompare(b.key));
  return (distinct ? tuples.filter((row,i) => i===0 || row.key!==tuples[i-1].key) : tuples)
    .map(row => row.record);
}

function valueOf(term, binding) {
  if (!isSparqlVariable(term)) return term;
  const value = binding[term.name];
  if (value === undefined) throw new TypeError(`sparql: unbound variable ${term.name} in CONSTRUCT template`);
  return value;
}

function constructTriples(template, bindings) {
  const byKey = new Map();
  for (const binding of bindings) {
    for (const pattern of template) {
      const triple = Object.freeze({ s: valueOf(pattern.s, binding), p: valueOf(pattern.p, binding), o: valueOf(pattern.o, binding) });
      byKey.set(canonical(triple), triple);
    }
  }
  return [...byKey.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, triple]) => triple);
}

function requireQuery(query) {
  if (query === null || typeof query !== "object" || Array.isArray(query)) throw new TypeError("sparql query must be an object");
  if (!["select", "ask", "construct"].includes(query.type)) throw new TypeError("sparql query type must be select, ask, or construct");
  if (!Array.isArray(query.where) || query.where.length === 0 || query.where.length > 64 || query.where.some(p => !p || !["s","p","o"].every(k => Object.hasOwn(p,k)))) throw new TypeError("sparql where must contain 1–64 valid triple patterns");
  if (query.select !== undefined && (!Array.isArray(query.select) || query.select.some(x => typeof x !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/u.test(x)))) throw new TypeError("sparql select must contain variable names");
  if (query.distinct !== undefined && typeof query.distinct !== "boolean") throw new TypeError("sparql distinct must be boolean");
}

/**
 * Evaluate a SPARQL BGP `query` (`{kind, type: "select"|"ask"|"construct", where, select?,
 * construct?}`) over `rows` (EAVT `{e,a,v,t}` witnesses), returning `{bindings, triples, ask,
 * turtle, ...}`. ASK and CONSTRUCT are both projections of the same WHERE evaluation: an ASK's
 * bindings collapse to at most one (empty) row, and a CONSTRUCT's triples are its template
 * instantiated once per binding, deduplicated.
 */
export function evaluateSparql(rows, query) {
  requireQuery(query);
  // RDF graphs contain distinct triples; repeated witness events are a
  // separate EAVT concern and cannot multiply one RDF statement.
  const distinctRows = [...new Map(rows.map(row => {
    const triple = {e:row.e,a:row.a,v:row.v};
    return [canonical(triple),triple];
  })).values()];
  const solutions = evaluateWhere(distinctRows, query.where);
  const variables = variablesFor(query);
  const bindings = project(solutions, variables, query.type === "ask" || query.distinct === true);
  const triples = query.type === "construct" ? constructTriples(query.construct ?? query.where, solutions) : [];
  return Object.freeze({
    kind: "knowing.sparql.result",
    type: query.type,
    variables: Object.freeze([...variables]),
    bindings,
    ask: bindings.length > 0,
    triples: Object.freeze(triples),
    turtle: triplesToTurtle(triples),
  });
}

function subjectOrPredicate(value) {
  return iriRef(typeof value === "string" ? value : canonical(value));
}

function objectTerm(value) {
  return typeof value === "string" && /^[a-z][a-z0-9+.-]*:/iu.test(value) ? iriRef(value) : turtleLiteral(value);
}

/** Render RDF `{s, p, o}` triples as Turtle. Subjects and predicates are always IRIs; an object is
 * an IRI when it looks like one (a scheme followed by `:`), a literal otherwise. */
export function triplesToTurtle(triples) {
  if (triples.length === 0) return "";
  return `${triples.map((triple) => `${subjectOrPredicate(triple.s)} ${subjectOrPredicate(triple.p)} ${objectTerm(triple.o)} .`).join("\n")}\n`;
}

/** EAVT rows read directly as RDF triples: `{s: e, p: a, o: v}`, `t` dropped. */
export function triplesFromEavt(rows) {
  return Object.freeze(rows.map((row) => Object.freeze({ s: row.e, p: row.a, o: row.v })));
}
