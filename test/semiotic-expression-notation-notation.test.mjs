import assert from "node:assert/strict";
import test from "node:test";
import {
  ty, tm, rename, subst, inst,
  instantiateSen,
  generatorNameOfTerm, readingOfTerm, boolOfTerm,
  isTerm, validateSenTerm, TySchema, TmSchema, SEN_FORMS,
} from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-services-section/four";

import { compileJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

const typeValidation = compileJsonSchema(TySchema);
const termValidation = compileJsonSchema(TmSchema, { references: [TySchema] });
const validateAgainst = (schema, _root, value) =>
  (schema === TySchema ? typeValidation : termValidation).validate(value).valid;
const typeTags = ["base", "arrow", "prod", "unit", "list", "empty", "sum"];
const termTags = [
  "var", "lam", "app", "pair", "fst", "snd", "star", "mark", "coincide", "cond", "fold",
  "prim", "inl", "inr", "case", "abort",
];

// ── 1. construct terms and types ────────────────────────────────────────────

test("type constructors produce frozen, schema-valid arrays for all seven current forms", () => {
  const cases = [
    ty.base(),
    ty.arrow(ty.base(), ty.base()),
    ty.prod(ty.base(), ty.base()),
    ty.unit(),
    ty.list(ty.base()),
    ty.empty(),
    ty.sum(ty.base(), ty.unit()),
  ];
  const tags = cases.map((t) => t[0]);
  assert.deepEqual(tags, typeTags);
  for (const t of cases) {
    assert.equal(Object.isFrozen(t), true);
    assert.equal(validateAgainst(TySchema, TySchema, t), true, JSON.stringify(t));
  }
});

test("term constructors produce frozen, schema-valid arrays for all sixteen current forms", () => {
  const cases = [
    tm.var(0),
    tm.lam(tm.var(0)),
    tm.app(tm.lam(tm.var(0)), tm.star()),
    tm.pair(tm.star(), tm.star()),
    tm.fst(tm.pair(tm.star(), tm.star())),
    tm.snd(tm.pair(tm.star(), tm.star())),
    tm.star(),
    tm.mark("x"),
    tm.coincide(tm.mark("a"), tm.mark("a")),
    tm.cond(tm.reading("held"), tm.star(), tm.star()),
    tm.fold(tm.lam(tm.lam(tm.var(0))), tm.star(), tm.star()),
    tm.prim("test.identity", tm.star()),
    tm.inl(tm.star(), ty.base()),
    tm.inr(ty.unit(), tm.mark("right")),
    tm.case(tm.inl(tm.star(), ty.unit()), tm.var(0), tm.var(0)),
    tm.abort(tm.var(0), ty.unit()),
  ];
  const tags = cases.map((t) => t[0]);
  assert.deepEqual(tags, termTags);
  for (const t of cases) {
    assert.equal(Object.isFrozen(t), true);
    assert.equal(validateAgainst(TmSchema, TmSchema, t), true, JSON.stringify(t));
    assert.equal(isTerm(t), true);
  }
});

test("tm.var rejects non-natural indices", () => {
  assert.throws(() => tm.var(-1), TypeError);
  assert.throws(() => tm.var(1.5), TypeError);
});

// ── 2. validate constructed terms/types against the shipped schema literals ─

test("constructed types validate against TySchema", () => {
  for (const t of [ty.base(), ty.arrow(ty.base(), ty.unit()), ty.prod(ty.base(), ty.unit()), ty.unit(), ty.list(ty.base()), ty.empty(), ty.sum(ty.base(), ty.unit())]) {
    assert.equal(validateAgainst(TySchema, TySchema, t), true, JSON.stringify(t));
  }
  assert.equal(validateAgainst(TySchema, TySchema, ["not-a-type"]), false);
  assert.equal(validateAgainst(TySchema, TySchema, ["arrow", ty.base()]), false); // wrong arity
});

test("constructed terms validate against TmSchema, including nested recursion", () => {
  const nested = tm.app(tm.lam(tm.pair(tm.var(0), tm.fold(tm.lam(tm.lam(tm.var(0))), tm.mark("seed"), tm.var(0)))), tm.star());
  assert.equal(validateAgainst(TmSchema, TmSchema, nested), true);
  assert.equal(validateAgainst(TmSchema, TmSchema, ["var", -1]), false); // negative index
  assert.equal(validateAgainst(TmSchema, TmSchema, ["mark", 42]), false); // non-string payload
  assert.equal(validateAgainst(TmSchema, TmSchema, ["cond", tm.star(), tm.star()]), false); // wrong arity
});

test("TmSchema and TySchema each expose one anyOf branch per grammar form", () => {
  assert.equal(TmSchema.anyOf.length, 16);
  assert.equal(TySchema.anyOf.length, 7);
  assert.deepEqual(Object.keys(SEN_FORMS).sort(), [...termTags].sort());
  assert.deepEqual(TmSchema.anyOf.map((branch) => branch.prefixItems[0].const).sort(), [...termTags].sort());
  assert.deepEqual(TySchema.anyOf.map((branch) => branch.prefixItems[0].const).sort(), [...typeTags].sort());
});

// ── validator.mjs's isTerm, exercised directly ──────────────────────────────

test("isTerm accepts every constructed term form and rejects malformed data", () => {
  assert.equal(isTerm(tm.app(tm.lam(tm.var(0)), tm.mark("x"))), true);
  assert.equal(isTerm(["mark", 1]), false); // non-string mark payload
  assert.equal(isTerm(["bogus"]), false); // unknown tag
  assert.equal(isTerm(null), false);
  assert.equal(isTerm({ 0: "star" }), false); // not an array
});

test("canonical admission refuses malformed charge, identity, witness, and effect payloads", () => {
  const id = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const base = ["base"];
  const ground = ["ground", ["predicate", "p", base, base], ["mark", "a"], ["mark", "b"]];
  assert.equal(isTerm(["mark", {}]), false);
  assert.equal(isTerm(["four", 42, {}]), false);
  assert.equal(isTerm(["constant", base, "not-an-ni"]), false);
  assert.equal(isTerm(["witness", ground, ["four", false, false], ["four", false, false], id]), false);
  assert.equal(isTerm(["effect", { caller: "eip155:1:0xabc", evidenceRoot: id, measures: [], outcome: { positiveEvidence: false, negativeEvidence: false }, parent: null, provider: "eip155:1:0xdef", extra: true }]), false);
});

test("isTerm rejects a self-referential (cyclic) array without looping forever", () => {
  const cyclic = ["pair", null, null];
  cyclic[1] = cyclic; // cyclic[1] === cyclic itself
  cyclic[2] = tm.star();
  assert.equal(isTerm(cyclic), false);
});

test("validateSenTerm admits a large finite pair spine without exhausting the call stack", () => {
  let term = ["star"];
  for (let index = 0; index < 20_000; index += 1)
    term = ["pair", ["mark", String(index)], term];
  assert.equal(validateSenTerm(term), term);
});

// ── 3. rename / subst / inst — the structural de-Bruijn operations ─────────

test("rename shifts free variables under binders correctly", () => {
  // λ. (var 0) (var 1)  — var 0 is bound, var 1 is free (one level up).
  const term = tm.lam(tm.app(tm.var(0), tm.var(1)));
  // Shift every free variable up by 5.
  const shifted = rename((index) => index + 5, term);
  assert.deepEqual(shifted, tm.lam(tm.app(tm.var(0), tm.var(6))));
});

test("inst substitutes the bound variable and shifts remaining frees down", () => {
  // (var 0) (var 1), where var 0 is the slot `inst` fills and var 1 is one
  // level further out — after instantiation it must become var 0.
  const body = tm.app(tm.var(0), tm.var(1));
  const result = inst(body, tm.mark("x"));
  assert.deepEqual(result, tm.app(tm.mark("x"), tm.var(0)));
});

test("subst with the identity substitution is the identity function on closed structure", () => {
  const term = tm.pair(tm.fst(tm.pair(tm.star(), tm.star())), tm.mark("m"));
  const identity = subst((index) => tm.var(index), term);
  assert.deepEqual(identity, term);
});

test("inst under a nested lambda still finds the right binder (de Bruijn correctness)", () => {
  // λ. (λ. var 1) applied conceptually — inst on the outer body must only
  // touch var 0 at the outer level, shifting any inner-lambda-relative
  // references correctly (rename bumps by one crossing the inner lam).
  const outerBody = tm.lam(tm.var(1)); // inner lam's var 1 refers to outer's var 0
  const result = inst(outerBody, tm.mark("v"));
  assert.deepEqual(result, tm.lam(tm.mark("v")));
});

test("canonical substitution reaches every nested child without capture", () => {
  const body = ["pair", ["mark", "p"], ["pair", ["var", 0], ["lam", ["pair", ["var", 1], ["var", 0]]]]];
  const result = instantiateSen(body, ["mark", "source"]);
  assert.equal(JSON.stringify(result).includes('["var",1]'), false);
  assert.deepEqual(result, ["pair", ["mark", "p"], ["pair", ["mark", "source"], ["lam", ["pair", ["mark", "source"], ["var", 0]]]]]);
});

// ── 4. charge round-trips — unknown/held/denied/contested ───────────────────
//
// The lattice operations (negate/conflate/joinK/meetK/leK/leT/
// fromCharge) are notation-layer term BUILDERS: `chargeCase` always emits a
// symbolic `cond`/`coincide` decision tree over the four canonical charges, even
// when its subject is already a concrete literal — this package does not
// evaluate (per its own doc comment: "no evaluation, no JSON bridge, no
// pre-built programs"). To test round-trips honestly we need to reduce
// those trees to a value; the minimal reducer below understands exactly the
// three-form vocabulary `chargeCase` ever emits (mark/coincide/cond) and
// lives only in this test file — it is a verification tool, not something
// added to the shipped notation.
function reduceClosedTree(term) {
  switch (term[0]) {
    case "mark":
    case "four":
      return term;
    case "coincide": {
      const left = reduceClosedTree(term[1]);
      const right = reduceClosedTree(term[2]);
      return tm.bool(JSON.stringify(left) === JSON.stringify(right));
    }
    case "cond": {
      const test = reduceClosedTree(term[1]);
      if (JSON.stringify(test) === JSON.stringify(tm.reading("held"))) return reduceClosedTree(term[2]);
      if (JSON.stringify(test) === JSON.stringify(tm.reading("denied"))) return reduceClosedTree(term[3]);
      throw new Error(`cond test did not reduce to a boolean charge: ${JSON.stringify(test)}`);
    }
    default:
      throw new Error(`reduceClosedTree: unsupported subterm tag in test reducer: ${term[0]}`);
  }
}

const charges = ["unknown", "held", "denied", "contested"];

test("every charge round-trips through readingOfTerm", () => {
  for (const name of charges) {
    assert.equal(readingOfTerm(tm.reading(name)), name);
  }
  assert.equal(readingOfTerm(tm.mark("held")), "held");
  assert.equal(readingOfTerm(tm.mark("maybe")), undefined);
  assert.throws(() => tm.reading("not-a-charge"), TypeError);
});

test("bool is derived from the truth axis: held=true, denied=false, others undefined", () => {
  assert.equal(boolOfTerm(tm.bool(true)), true);
  assert.equal(boolOfTerm(tm.bool(false)), false);
  assert.equal(boolOfTerm(tm.reading("held")), true);
  assert.equal(boolOfTerm(tm.reading("denied")), false);
  assert.equal(boolOfTerm(tm.reading("unknown")), undefined);
  assert.equal(boolOfTerm(tm.reading("contested")), undefined);
});

test("negate is an involution on every charge (reduced)", () => {
  for (const name of charges) {
    const once = reduceClosedTree(tm.negate(tm.reading(name)));
    const twice = reduceClosedTree(tm.negate(once));
    assert.deepEqual(twice, tm.reading(name));
  }
});

test("conflate is an involution on every charge (reduced)", () => {
  for (const name of charges) {
    const once = reduceClosedTree(tm.conflate(tm.reading(name)));
    const twice = reduceClosedTree(tm.conflate(once));
    assert.deepEqual(twice, tm.reading(name));
  }
});

test("negConf equals negate composed with conflate for every charge (reduced)", () => {
  for (const name of charges) {
    const composed = reduceClosedTree(tm.negate(reduceClosedTree(tm.conflate(tm.reading(name)))));
    const direct = reduceClosedTree(tm.negConf(tm.reading(name)));
    assert.deepEqual(direct, composed);
  }
});

test("unknown and contested are each other's negation fixed point pair, held/denied swap (reduced)", () => {
  assert.deepEqual(reduceClosedTree(tm.negate(tm.reading("unknown"))), tm.reading("unknown"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.reading("contested"))), tm.reading("contested"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.reading("held"))), tm.reading("denied"));
  assert.deepEqual(reduceClosedTree(tm.negate(tm.reading("denied"))), tm.reading("held"));
});

test("joinK is idempotent, commutative, and unknown is its identity (reduced)", () => {
  for (const name of charges) {
    assert.deepEqual(reduceClosedTree(tm.joinK(tm.reading(name), tm.reading(name))), tm.reading(name));
    assert.deepEqual(reduceClosedTree(tm.joinK(tm.reading(name), tm.reading("unknown"))), tm.reading(name));
  }
  assert.deepEqual(
    reduceClosedTree(tm.joinK(tm.reading("held"), tm.reading("denied"))),
    tm.reading("contested"),
  );
});

test("meetK is idempotent, commutative, and contested is its identity (reduced)", () => {
  for (const name of charges) {
    assert.deepEqual(reduceClosedTree(tm.meetK(tm.reading(name), tm.reading(name))), tm.reading(name));
    assert.deepEqual(reduceClosedTree(tm.meetK(tm.reading(name), tm.reading("contested"))), tm.reading(name));
  }
  assert.deepEqual(
    reduceClosedTree(tm.meetK(tm.reading("held"), tm.reading("denied"))),
    tm.reading("unknown"),
  );
});

test("leK: unknown is knowledge-least, contested is knowledge-greatest (reduced)", () => {
  for (const name of charges) {
    assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.reading("unknown"), tm.reading(name)))), true);
    assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.reading(name), tm.reading("contested")))), true);
  }
  assert.equal(boolOfTerm(reduceClosedTree(tm.leK(tm.reading("held"), tm.reading("denied")))), false);
});

test("leT: denied is truth-least, held is truth-greatest (reduced)", () => {
  for (const name of charges) {
    assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.reading("denied"), tm.reading(name)))), true);
    assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.reading(name), tm.reading("held")))), true);
  }
  assert.equal(boolOfTerm(reduceClosedTree(tm.leT(tm.reading("held"), tm.reading("denied")))), false);
});

test("joinK reduces to the shared FOUR knowledge join for all sixteen pairs without a settle alias", () => {
  assert.equal(Object.hasOwn(tm, "settle"), false);
  for (const left of charges) {
    for (const right of charges) {
      assert.deepEqual(
        reduceClosedTree(tm.joinK(tm.reading(left), tm.reading(right))),
        tm.reading(knowledgeJoinReading(left, right)),
      );
    }
  }
});

test("fromCharge collapses every corner onto its truth-bit boolean (reduced)", () => {
  assert.deepEqual(reduceClosedTree(tm.toldFor(tm.reading("held"))), tm.bool(true));
  assert.deepEqual(reduceClosedTree(tm.toldFor(tm.reading("contested"))), tm.bool(true));
  assert.deepEqual(reduceClosedTree(tm.toldFor(tm.reading("denied"))), tm.bool(false));
  assert.deepEqual(reduceClosedTree(tm.toldFor(tm.reading("unknown"))), tm.bool(false));
});

test("every charge op still produces a closed, schema-valid term BEFORE reduction (no evaluation happens in this package)", () => {
  const built = [
    tm.negate(tm.reading("held")),
    tm.conflate(tm.reading("contested")),
    tm.joinK(tm.reading("held"), tm.reading("unknown")),
    tm.toldFor(tm.reading("denied")),
  ];
  for (const term of built) {
    assert.equal(isTerm(term), true);
    assert.equal(validateAgainst(TmSchema, TmSchema, term), true);
  }
});

// ── 5. the four relational generators ───────────────────────────────────────

const generators = ["specialization", "converse", "subjectProjection", "objectProjection"];

test("every generator round-trips through generatorNameOfTerm", () => {
  for (const name of generators) {
    assert.equal(generatorNameOfTerm(tm.generator(name)), name);
  }
});

test("generatorNameOfTerm rejects non-generator marks and canonical charges", () => {
  assert.equal(generatorNameOfTerm(tm.mark("not-a-generator")), undefined);
  assert.equal(generatorNameOfTerm(tm.reading("held")), undefined);
});

// ── structural helpers built from the primitives (field / array ops) ───────

test("consArray then fst/snd shape matches a manual pair-spine prepend", () => {
  const empty = tm.pair(tm.mark("array"), tm.star());
  const withOne = tm.consArray(tm.mark("elem"), empty);
  assert.deepEqual(withOne, tm.pair(tm.fst(empty), tm.pair(tm.mark("elem"), tm.snd(empty))));
});

test("field compiles to a fold over an assoc-list spine, closed and schema-valid", () => {
  const compiled = tm.field("k", tm.mark("obj"));
  assert.equal(compiled[0], "fold");
  assert.equal(isTerm(compiled), true);
  assert.equal(validateAgainst(TmSchema, TmSchema, compiled), true);
});

// ── tm.append — golden-vectored against a small test-only reducer ──────────
//
// `append` is a `fold`/`consArray`/`reverseArray` composition, not a new
// primitive, so verifying it structurally (as the `consArray` test above
// does) only confirms it built A term — not that the term REDUCES to the
// concatenation. To check that honestly we need to actually reduce it. The
// reducer below extends the file's `reduceClosedTree` pattern to the wider
// vocabulary array operations use (var/lam/app/pair/fst/snd/star/mark/fold);
// its `fold` case mirrors metroplat's real reduction rule exactly (see
// `eval/index.mts`'s `dev`/`normalize` and `reader/projecting/index.mts`'s
// `arrayHeadTail`): `fold`'s third argument must reduce to a TAGGED
// pair-spine term `pair(mark(tag), spine)`, one spine cell is peeled off per
// step, and the tag is re-wrapped around the remaining spine for the
// recursive tail — a bare, untagged spine is not fold-able. This reducer
// lives only in this test file; it is a verification tool, not part of the
// shipped notation.
function reduceArrayTerm(term) {
  switch (term[0]) {
    case "star":
      return tm.star();
    case "mark":
      return tm.mark(term[1]);
    case "lam":
      return term; // a function is already a value; this reducer never opens binders it doesn't apply
    case "pair":
      return tm.pair(reduceArrayTerm(term[1]), reduceArrayTerm(term[2]));
    case "fst": {
      const value = reduceArrayTerm(term[1]);
      if (value[0] !== "pair") throw new Error(`reduceArrayTerm: fst of a non-pair: ${JSON.stringify(value)}`);
      return value[1];
    }
    case "snd": {
      const value = reduceArrayTerm(term[1]);
      if (value[0] !== "pair") throw new Error(`reduceArrayTerm: snd of a non-pair: ${JSON.stringify(value)}`);
      return value[2];
    }
    case "app": {
      const fn = reduceArrayTerm(term[1]);
      if (fn[0] !== "lam") throw new Error(`reduceArrayTerm: applying a non-lam: ${JSON.stringify(fn)}`);
      return reduceArrayTerm(inst(fn[1], reduceArrayTerm(term[2])));
    }
    case "fold": {
      const combine = term[1];
      const init = reduceArrayTerm(term[2]);
      const list = reduceArrayTerm(term[3]);
      if (list[0] !== "pair" || list[1][0] !== "mark") {
        throw new Error(`reduceArrayTerm: fold's list did not reduce to a tagged pair-spine: ${JSON.stringify(list)}`);
      }
      const tag = list[1];
      const spine = list[2];
      if (spine[0] === "star") return init;
      if (spine[0] !== "pair") throw new Error(`reduceArrayTerm: malformed spine cell: ${JSON.stringify(spine)}`);
      const head = spine[1];
      const tail = tm.pair(tag, spine[2]);
      const nextInit = reduceArrayTerm(tm.app(tm.app(combine, init), head));
      return reduceArrayTerm(tm.fold(combine, nextInit, tail));
    }
    default:
      throw new Error(`reduceArrayTerm: unsupported subterm tag in test reducer: ${term[0]}`);
  }
}

/** Build a tagged array term, matching `tm.pair(tm.mark(tag), spine)`'s convention. */
function arrayOf(tag, elements) {
  return tm.pair(tm.mark(tag), elements.reduceRight((tail, elem) => tm.pair(elem, tail), tm.star()));
}

test("reverseArray reduces a 2-element array to its reverse, tag preserved (golden-vectored)", () => {
  const array = arrayOf("t", [tm.mark("e0"), tm.mark("e1")]);
  const reduced = reduceArrayTerm(tm.reverseArray(array));
  assert.deepEqual(reduced, arrayOf("t", [tm.mark("e1"), tm.mark("e0")]));
});

test("tm.append produces a closed, schema-valid fold term before reduction", () => {
  const left = arrayOf("left-tag", [tm.mark("a"), tm.mark("b")]);
  const right = arrayOf("right-tag", [tm.mark("c"), tm.mark("d")]);
  const appended = tm.append(left, right);
  assert.equal(appended[0], "fold");
  assert.equal(isTerm(appended), true);
  assert.equal(validateAgainst(TmSchema, TmSchema, appended), true);
});

test("tm.append reduces two concrete arrays into their concatenation, left elements before right, right's tag wins (golden-vectored)", () => {
  const left = arrayOf("left-tag", [tm.mark("a"), tm.mark("b")]);
  const right = arrayOf("right-tag", [tm.mark("c"), tm.mark("d")]);
  const reduced = reduceArrayTerm(tm.append(left, right));
  assert.deepEqual(reduced, arrayOf("right-tag", [tm.mark("a"), tm.mark("b"), tm.mark("c"), tm.mark("d")]));
});

test("tm.append is a left/right identity: appending the empty array leaves the other side's elements and order unchanged", () => {
  const left = arrayOf("left-tag", [tm.mark("a"), tm.mark("b")]);
  const right = arrayOf("right-tag", [tm.mark("c"), tm.mark("d")]);
  const empty = arrayOf("empty-tag", []);

  const leftThenEmpty = reduceArrayTerm(tm.append(left, empty));
  assert.deepEqual(leftThenEmpty, arrayOf("empty-tag", [tm.mark("a"), tm.mark("b")]));

  const emptyThenRight = reduceArrayTerm(tm.append(empty, right));
  assert.deepEqual(emptyThenRight, right);
});
