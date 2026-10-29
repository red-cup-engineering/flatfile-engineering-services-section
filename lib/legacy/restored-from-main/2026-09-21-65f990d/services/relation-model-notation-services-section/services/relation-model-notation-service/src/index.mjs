/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation` is the grammar of Relation
 * Model Notation.
 *
 * Types (Ty) and terms (Tm) as frozen-array JSON s-expressions, the
 * recursive JSON-Schema literals that admit those arrays, and the
 * structural de-Bruijn operations (rename, subst, inst). This is what RMN
 * notation is: no evaluation, no JSON bridge, no pre-built programs.
 *
 * Transcribed from metroplat's `src/lib/language/ast/index.mts`, behavior
 * preserved exactly. Deliberately does NOT port
 * `bilattice-charge.mts`'s rotated name-to-bits table — the source's own
 * comment says not to; this file carries the corrected
 * `Obsmetrologia`-ground-truth table only.
 */

export { TmSchema, TySchema } from "./schema.mjs";
export { isTerm } from "./validator.mjs";
export { RMN_FORMS } from "./forms.mjs";
import { RMN_FORMS, RMN_TYPE_FORMS } from "./forms.mjs";

// ── type exports (documentation only — see types.mjs) ──────────────────────

// ── type constructors ───────────────────────────────────────────────────────

/** Constructors for the finite RMN type grammar. */
export const ty = {
  base: () => Object.freeze(["base"]),
  effect: () => Object.freeze(["effect"]),
  arrow: (domain, codomain) => Object.freeze(["arrow", domain, codomain]),
  prod: (left, right) => Object.freeze(["prod", left, right]),
  unit: () => Object.freeze(["unit"]),
  list: (element) => Object.freeze(["list", element]),
};

const generatorNames = [
  "specialization",
  "converse",
  "subjectProjection",
  "objectProjection",
];

/** Recognize a generator-encoded mark and recover its name, the inverse of `tm.generator`. */
export function generatorNameOfTerm(term) {
  return term[0] === "mark" && generatorNames.includes(term[1])
    ? term[1]
    : undefined;
}

// ── term constructors ─────────────────────────────────────────────────────────

/**
 * Charge (Belnap FOUR) is `Articulating.Corner` in Lean — its own four-point object,
 * not built from two independent booleans (`RelBool` is the derived party: the
 * truth-axis embedding `b ↦ ofSlots(b, ¬b)` of a PRE-EXISTING `Charge`, per
 * `Obsmetrologia/Language/Positing/RelBool.lean`). Mirroring that direction here: charge
 * is the grammar's canonical `four` term, and `bool` is derived as the two
 * of those four values that lie on the truth axis
 * — not the other way around.
 *
 * The (name, truth-bit, falsity-bit) table below is `Obsmetrologia/Articulation/
 * Articulating/Cell.lean`'s `Corner.ofStatus`/`toStatus` — confirmed ground truth over
 * metroplat's `bilattice-charge.mts`'s `chargeCoordinatesByName`, which assigns the
 * same four bit-pairs to a ROTATED set of names (its join/meet/negate *formulas*
 * still match Lean's; only its name↔bits table is off). Do not port that table here.
 */
const chargeBits = {
  unknown: [false, false],
  held: [true, false],
  denied: [false, true],
  contested: [true, true],
};
const chargeNames = Object.keys(chargeBits);

/** The finite FOUR charge-name vocabulary, in the same order `chargeCase`
 *  dispatches over. The grammar's own vocabulary, not general infra — this
 *  is the correct home for it, not a reach into some other package. */
export const chargeValueNames = Object.freeze([...chargeNames]);

/** Whether a raw string is one of the four charge names. */
export function isChargeValueName(value) {
  return chargeNames.includes(value);
}

const nameOfBits = (truth, falsity) =>
  chargeNames.find(
    (name) => chargeBits[name][0] === truth && chargeBits[name][1] === falsity,
  );

/** Recognize a canonical FOUR charge and recover its surface name. */
export function chargeNameOfTerm(term) {
  if (!Array.isArray(term) || term[0] !== "four") return undefined;
  return nameOfBits(term[1], term[2]);
}

/**
 * `cond` is the finite branch form. It reduces only on the two truth-axis
 * charges, so unknown and contested remain explicitly non-reduced predicates.
 */
function chargeCase(subject, branch) {
  function go(remaining) {
    const [name, ...rest] = remaining;
    if (name === undefined)
      throw new TypeError("chargeCase: no charge names to dispatch over");
    if (rest.length === 0) return branch(name);
    return tm.cond(
      tm.coincide(subject, tm.charge(name)),
      branch(name),
      go(rest),
    );
  }
  return go(chargeNames);
}

/** Recognize a truth-axis charge (`held` = true, `denied` = false). */
export function boolOfTerm(term) {
  const name = chargeNameOfTerm(term);
  if (name === "held") return true;
  if (name === "denied") return false;
  return undefined;
}

export const tm = {
  var: (index) => {
    if (!Number.isInteger(index) || index < 0)
      throw new TypeError(
        `tm.var: de-Bruijn index must be a natural number: ${index}`,
      );
    return Object.freeze(["var", index]);
  },
  lam: (body) => Object.freeze(["lam", body]),
  app: (fn, arg) => Object.freeze(["app", fn, arg]),
  pair: (left, right) => Object.freeze(["pair", left, right]),
  fst: (value) => Object.freeze(["fst", value]),
  snd: (value) => Object.freeze(["snd", value]),
  star: () => Object.freeze(["star"]),
  mark: (surface) => Object.freeze(["mark", surface]),
  effect: (cell) => Object.freeze(["effect", cell]),
  /** Construct exactly one of the four canonical FOUR charges. */
  charge: (name) => {
    if (!isChargeValueName(name))
      throw new TypeError(`tm.charge: unknown charge name ${String(name)}`);
    return Object.freeze(["four", ...chargeBits[name]]);
  },
  /** `true`/`false` are the truth-axis charges: Lean's `Charge.tTop = active`, `tBot = stable`. */
  bool: (value) => {
    if (typeof value !== "boolean")
      throw new TypeError(`tm.bool: expected boolean, got ${typeof value}`);
    return tm.charge(value ? "held" : "denied");
  },
  /**
   * `RelBool.fromCharge c := Charge.pos c` — the forgetful projection reading a charge's
   * positive/truth-bit slot, total over all four corners (unlike `boolOfTerm`, which only
   * recognizes the two charges already sitting on the truth axis). Lean keeps `truthAxis`
   * (`tm.bool`, embedding) and `fromCharge` (this, projecting) as two distinct operations —
   * a round-trip through the term layer deshrouding a plain boolean into its full charge is
   * not lossy in the direction that matters; `fromCharge` is how a caller who wants the
   * collapsed boolean view back gets it, explicitly, rather than the layer hiding the charge.
   */
  fromCharge: (value) =>
    chargeCase(value, (name) => tm.bool(chargeBits[name][0])),
  /** One of the four predication-site generator morphisms (converse/subjectProjection/
   *  objectProjection/specialization) — a bare distinguishable atom with no algebra
   *  defined over it in this grammar, so a mark. */
  generator: (name) => tm.mark(name),
  /** Knowledge/truth order swap: `ofSlots a.neg a.pos` in `Charge.negate`, dispatched by mark. */
  negate: (value) =>
    chargeCase(value, (name) => {
      const [truth, falsity] = chargeBits[name];
      return tm.charge(nameOfBits(falsity, truth));
    }),
  /** Swap and complement: `Charge.conflate`'s `ofSlots ¬a.neg ¬a.pos`. */
  conflate: (value) =>
    chargeCase(value, (name) => {
      const [truth, falsity] = chargeBits[name];
      return tm.charge(nameOfBits(!falsity, !truth));
    }),
  /** Complement only (negate ∘ conflate): `ofSlots ¬a.pos ¬a.neg`. */
  negConf: (value) =>
    chargeCase(value, (name) => {
      const [truth, falsity] = chargeBits[name];
      return tm.charge(nameOfBits(!truth, !falsity));
    }),
  /** Knowledge join: componentwise OR — `Charge.joinK`. */
  joinK: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.charge(nameOfBits(lt || rt, lf || rf));
      }),
    ),
  /** Knowledge meet: componentwise AND — `Charge.meetK`. */
  meetK: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.charge(nameOfBits(lt && rt, lf && rf));
      }),
    ),
  /** Truth join: truth side OR, falsity side AND — `Charge.joinT`. */
  joinT: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.charge(nameOfBits(lt || rt, lf && rf));
      }),
    ),
  /** Truth meet: truth side AND, falsity side OR — `Charge.meetT`. */
  meetT: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.charge(nameOfBits(lt && rt, lf || rf));
      }),
    ),
  /** Knowledge order `left ≤_k right` — `Charge.leK`. */
  leK: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.bool((!lt || rt) && (!lf || rf));
      }),
    ),
  /** Truth order `left ≤_t right` — `Charge.leT`. */
  leT: (left, right) =>
    chargeCase(left, (ln) =>
      chargeCase(right, (rn) => {
        const [lt, lf] = chargeBits[ln];
        const [rt, rf] = chargeBits[rn];
        return tm.bool((!lt || rt) && (!rf || lf));
      }),
    ),
  /** `settleOverValue(chargeJoinVClosure(target), seed) = joinKnowledgeValue(target, seed)`,
   *  unfolded — exactly `joinK`, not a distinct operation. `joinK` is commutative, so
   *  argument order doesn't even matter here. */
  settle: (target, seed) => tm.joinK(target, seed),
  /**
   * An assoc-list search over `fold` — the object's entries are `pair(mark(key), value)`
   * spine elements; `coincide` compares keys, `cond` picks. A missing key folds to
   * `mark("null")`, not a stuck redex.
   */
  field: (key, object) =>
    tm.fold(
      tm.lam(
        tm.lam(
          tm.cond(
            tm.coincide(tm.fst(tm.var(0)), tm.mark(JSON.stringify(key))),
            tm.snd(tm.var(0)),
            tm.var(1),
          ),
        ),
      ),
      tm.mark(JSON.stringify(null)),
      object,
    ),
  /** Prepend one element to an array term's spine — O(1), no `fold`: just a `pair` in
   *  front of the existing spine, reusing `array`'s OWN tag (`fst`) rather than a
   *  freshly hardcoded mark. This and `reverseArray` are the two array-combination
   *  primitives this kernel has; `append` (below) is not a third — there is no general
   *  two-arbitrary-list concatenation law in Obsmetrologia's proven math for it to
   *  answer to, so it is only ever the call-site composition of these two. */
  consArray: (elem, array) =>
    tm.pair(tm.fst(array), tm.pair(elem, tm.snd(array))),
  /** Reverse an array term — the one real `fold` either of these needs. */
  reverseArray: (array) =>
    tm.pair(
      tm.fst(array),
      tm.fold(tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1)))), tm.star(), array),
    ),
  /**
   * Concatenate two array terms, `left` then `right` in order — not a third kernel
   * primitive with its own `fold` shape (metroplat's own kernel comment: no
   * `Cell`/`Valuation`/`Charge`/`Articulating` law anywhere concatenates two lists,
   * so there is nothing for a dedicated opcode to be sound against), but exactly the
   * call-site composition its comment prescribes: `reverseArray(left)` once, then a
   * single `fold` that `consArray`s each of its elements onto `right`. Reversed-left
   * yields left's elements last-to-first, so consing them onto `right` in that order
   * rebuilds left's original order in front of right; the result carries `right`'s
   * tag, since `right` is the accumulator being grown.
   */
  append: (left, right) =>
    tm.fold(
      tm.lam(tm.lam(tm.consArray(tm.var(0), tm.var(1)))),
      right,
      tm.reverseArray(left),
    ),
  coincide: (left, right) => Object.freeze(["coincide", left, right]),
  /** The `eq`/`cond` elementary pair (McCarthy): dispatch by comparing an opaque mark. */
  cond: (test, then, otherwise) =>
    Object.freeze(["cond", test, then, otherwise]),
  /** Left fold over an array-encoded list: `fold f init [x₀..xₙ] = f (… (f init x₀) …) xₙ`,
   *  with `f` a curried `λacc.λelem.…`. The one structural recursion. */
  fold: (combine, init, list) => Object.freeze(["fold", combine, init, list]),
};

// ── canonical grammar traversal and de Bruijn operations ────────────────────

function rmnFail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function rmnTagged(value, kind) {
  if (!Array.isArray(value) || typeof value[0] !== "string")
    rmnFail("malformed-rmn", `${kind} must be a tagged RMN sequence`);
  return value;
}
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/u;
const EFFECT_KEYS = [
  "caller",
  "evidenceRoot",
  "measures",
  "outcome",
  "parent",
  "provider",
];

function exactKeys(value, keys) {
  return (
    value &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000")
  );
}

/** Admit the effect record carried by the one `effect` term form. */
export function validateEffectCell(cell) {
  if (!exactKeys(cell, EFFECT_KEYS))
    rmnFail(
      "malformed-effect",
      `effect cell must expose exactly ${EFFECT_KEYS.join(", ")}`,
    );
  if (
    !NI.test(cell.evidenceRoot) ||
    (cell.parent !== null && !NI.test(cell.parent))
  )
    rmnFail("malformed-effect", "effect identities must be SHA-256 ni URIs");
  if (!CAIP10.test(cell.caller) || !CAIP10.test(cell.provider))
    rmnFail(
      "malformed-effect",
      "caller and provider must be CAIP-10 account identifiers",
    );
  if (
    !exactKeys(cell.outcome, ["positiveEvidence", "negativeEvidence"]) ||
    !Object.values(cell.outcome).every((value) => typeof value === "boolean")
  )
    rmnFail("malformed-effect", "effect outcome must be a FOUR record");
  if (!Array.isArray(cell.measures))
    rmnFail("malformed-effect", "measures must be a typed measure sequence");
  const dimensions = new Set();
  for (const measure of cell.measures) {
    if (
      !exactKeys(measure, ["dimension", "quantity", "unit"]) ||
      ![measure.dimension, measure.quantity, measure.unit].every(
        (part) => typeof part === "string" && part.length > 0,
      )
    )
      rmnFail(
        "malformed-effect",
        "each measure requires dimension, quantity, and unit text",
      );
    if (!DECIMAL.test(measure.quantity) || dimensions.has(measure.dimension))
      rmnFail(
        "malformed-effect",
        `invalid or duplicate measure ${measure.dimension}`,
      );
    dimensions.add(measure.dimension);
  }
  return cell;
}

function validateAtom(constraint, value) {
  if (constraint === "natural" && Number.isInteger(value) && value >= 0) return;
  if (constraint === "text" && typeof value === "string") return;
  if (constraint === "boolean" && typeof value === "boolean") return;
  if (
    constraint === "ni-sha-256" &&
    typeof value === "string" &&
    NI.test(value)
  )
    return;
  if (constraint === "effect-cell") {
    validateEffectCell(value);
    return;
  }
  rmnFail("malformed-rmn", `invalid RMN ${constraint} atom`);
}

export function validateRmnType(type) {
  rmnTagged(type, "type");
  const form = RMN_TYPE_FORMS[type[0]];
  const arity = type.length === 1 + (form?.types?.length ?? 0);
  if (!form || !arity)
    rmnFail(
      "malformed-rmn",
      `unknown or malformed RMN type ${JSON.stringify(type)}`,
    );
  for (const index of form.types ?? []) validateRmnType(type[index]);
  return type;
}

export function validateRmnTerm(term) {
  const pending = [term];
  while (pending.length > 0) {
    const current = pending.pop();
    rmnTagged(current, "term");
    const form = RMN_FORMS[current[0]];
    if (!form)
      rmnFail("malformed-rmn", `unknown or malformed RMN term tag ${current[0]}`);
    const expected = 1 + Object.keys(form.atoms ?? {}).length + (form.terms?.length ?? 0) + (form.types?.length ?? 0);
    if (form.termLists) {
      if (current.length !== 3 || !Array.isArray(current[2])) rmnFail("malformed-rmn", `malformed RMN ${current[0]}`);
    } else if (current.length !== expected) rmnFail("malformed-rmn", `malformed RMN ${current[0]}`);
    for (const [index, constraint] of Object.entries(form.atoms ?? {})) validateAtom(constraint, current[index]);
    if (current[0] === "witness") {
      const before = current[2], after = current[3];
      if (before[0] !== "four" || after[0] !== "four" || (before[1] === after[1] && before[2] === after[2]) || (before[1] && !after[1]) || (before[2] && !after[2]) || (before[1] !== after[1] && before[2] !== after[2])) rmnFail("not-one-wit", "witness must carry one FOUR knowledge cover");
    }
    for (const index of form.types ?? []) validateRmnType(current[index]);
    for (const index of [...(form.termLists ?? [])].reverse()) for (const child of [...current[index]].reverse()) pending.push(child);
    for (const index of [...(form.terms ?? [])].reverse()) pending.push(current[index]);
  }
  return term;
}

/** The sole binding-aware traversal used by validation consumers, substitution, and reduction. */
export function mapRmnTerm(term, visit, depth = 0) {
  validateRmnTerm(term);
  const go = (node, nodeDepth) => {
    const form = RMN_FORMS[node[0]],
      out = [...node];
    for (const index of form.terms ?? [])
      out[index] = go(
        node[index],
        nodeDepth + (form.binders?.includes(index) ? 1 : 0),
      );
    for (const index of form.termLists ?? [])
      out[index] = node[index].map((child) => go(child, nodeDepth));
    return visit(out, nodeDepth);
  };
  return go(term, depth);
}

/** Rebuild one term after mapping every immediate term-bearing child slot. */
export function mapRmnImmediate(term, mapper) {
  const form = RMN_FORMS[term[0]],
    out = [...term];
  for (const index of form.terms ?? []) out[index] = mapper(term[index], index);
  for (const index of form.termLists ?? [])
    out[index] = term[index].map((child, childIndex) =>
      mapper(child, index, childIndex),
    );
  return out;
}

/** Canonical structural values, independent of any JSON carrier lowering. */
export function isRmnValue(term, depth = 0) {
  if (term[0] === "var") return term[1] < depth;
  const form = RMN_FORMS[term[0]];
  if (
    !form ||
    ["app", "fst", "snd", "coincide", "cond", "fold"].includes(term[0])
  )
    return false;
  return (
    (form.terms ?? []).every((index) => isRmnValue(term[index], depth + (form.binders?.includes(index) ? 1 : 0))) &&
    (form.termLists ?? []).every((index) => term[index].every((child) => isRmnValue(child, depth)))
  );
}

/** View the canonical `nil`/`cons` list constructors without JSON lowering. */
export function rmnListHeadTail(term) {
  if (term[0] === "nil") return "empty";
  if (term[0] === "cons") return { head: term[1], tail: term[2] };
  if (term[0] === "pair" && term[1][0] === "mark") {
    const spine = term[2];
    if (spine[0] === "star") return "empty";
    if (spine[0] === "pair")
      return { head: spine[1], tail: ["pair", term[1], spine[2]] };
  }
  return undefined;
}

export function shiftRmn(delta, cutoff, term) {
  return mapRmnTerm(term, (node, depth) =>
    node[0] === "var" && node[1] >= cutoff + depth
      ? ["var", node[1] + delta]
      : node,
  );
}
export function substituteRmn(index, replacement, term) {
  return mapRmnTerm(term, (node, depth) =>
    node[0] === "var" && node[1] === index + depth
      ? shiftRmn(depth, 0, replacement)
      : node,
  );
}
export function instantiateRmn(body, value) {
  return shiftRmn(-1, 0, substituteRmn(0, shiftRmn(1, 0, value), body));
}
export function rename(rho, term) {
  return mapRmnTerm(term, (node, depth) =>
    node[0] !== "var" || node[1] < depth
      ? node
      : ["var", rho(node[1] - depth) + depth],
  );
}
export function subst(sigma, term) {
  return mapRmnTerm(term, (node, depth) =>
    node[0] !== "var" || node[1] < depth
      ? node
      : shiftRmn(depth, 0, sigma(node[1] - depth)),
  );
}
export function inst(body, value) {
  return subst((index) => (index === 0 ? value : tm.var(index - 1)), body);
}
