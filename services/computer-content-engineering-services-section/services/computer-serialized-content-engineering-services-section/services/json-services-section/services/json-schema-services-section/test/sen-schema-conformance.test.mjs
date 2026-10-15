import assert from "node:assert/strict";
import test from "node:test";
import { tm, ty, TmSchema, TySchema } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { compileJsonSchema } from "../src/validation.mjs";

// SEN publishes its grammar as JSON Schema literals (TySchema, TmSchema). This package's compiler
// must accept exactly the types and terms SEN constructs and refuse malformed ones.
const typeValidation = compileJsonSchema(TySchema);
const termValidation = compileJsonSchema(TmSchema, { references: [TySchema] });
const validType = (value) => typeValidation.validate(value).valid;
const validTerm = (value) => termValidation.validate(value).valid;
const arrayOf = (tag, elements) => tm.pair(tm.mark(tag), elements.reduceRight((tail, element) => tm.pair(element, tail), tm.star()));

test("constructed types validate against TySchema", () => {
  for (const t of [ty.base(), ty.arrow(ty.base(), ty.unit()), ty.prod(ty.base(), ty.unit()), ty.unit(), ty.list(ty.base())]) {
    assert.equal(validType(t), true, JSON.stringify(t));
  }
  assert.equal(validType(["not-a-type"]), false);
  assert.equal(validType(["arrow", ty.base()]), false); // wrong arity
});

test("constructed terms validate against TmSchema, including nested recursion", () => {
  const nested = tm.app(tm.lam(tm.pair(tm.var(0), tm.fold(tm.lam(tm.lam(tm.var(0))), tm.mark("seed"), tm.var(0)))), tm.star());
  assert.equal(validTerm(nested), true);
  assert.equal(validTerm(["var", -1]), false); // negative index
  assert.equal(validTerm(["mark", 42]), false); // non-string payload
  assert.equal(validTerm(["cond", tm.star(), tm.star()]), false); // wrong arity
});

test("charge operations, field and append build schema-valid terms before reduction", () => {
  const built = [
    tm.negate(tm.reading("held")),
    tm.conflate(tm.reading("contested")),
    tm.joinK(tm.reading("held"), tm.reading("unknown")),
    tm.toldFor(tm.reading("denied")),
    tm.field("k", tm.mark("obj")),
    tm.append(arrayOf("left-tag", [tm.mark("a"), tm.mark("b")]), arrayOf("right-tag", [tm.mark("c"), tm.mark("d")])),
  ];
  for (const term of built) assert.equal(validTerm(term), true, JSON.stringify(term).slice(0, 80));
});
