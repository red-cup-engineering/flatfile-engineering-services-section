import assert from 'node:assert/strict';
import test from 'node:test';
import { tm, ty, SEN_FORMS, mapSenTerm, validateSenTerm, rename, subst, inst } from '../src/semiotic-expression-notation/notation.mjs';
import { isClosed } from '../src/semiotic-expression-notation/typing.mjs';

function recursiveMap(node, visit, depth = 0) {
  const form = SEN_FORMS[node[0]], out = [...node];
  for (const index of form.terms ?? []) out[index] = recursiveMap(node[index], visit,
    depth + (form.binders?.includes(index) ? 1 : 0));
  return visit(out, depth);
}
const complex = () => tm.case(tm.inl(tm.mark('subject'), ty.unit()),
  tm.lam(tm.pair(tm.var(0), tm.var(1))),
  tm.cond(tm.mark('test'), tm.prim('p', tm.var(0)), tm.abort(tm.var(0), ty.base())));

test('every form retains left-to-right postorder and binder depth for arbitrary visitor outputs', () => {
  for (const [tag, form] of Object.entries(SEN_FORMS)) {
    const node = [tag];
    for (const [index, kind] of Object.entries(form.atoms ?? {})) node[index] = kind === 'natural' ? 3 : 'atom';
    for (const index of form.terms ?? []) node[index] = complex();
    for (const index of form.types ?? []) node[index] = ty.sum(ty.base(), ty.unit());
    validateSenTerm(node);
    for (const mode of ['tree', 'undefined', 'scalar']) {
      const trace = [];
      const visit = (out, depth) => {
        trace.push([out[0], depth]);
        if (mode === 'undefined') return undefined;
        if (mode === 'scalar') return `${out[0]}:${depth}:${trace.length}`;
        return {out, depth, sequence: trace.length};
      };
      const expected = recursiveMap(node, visit, 7), expectedTrace = [...trace]; trace.length = 0;
      const actual = mapSenTerm(node, visit, 7);
      assert.deepEqual(actual, expected, `${tag}/${mode}`);
      assert.deepEqual(trace, expectedTrace, `${tag}/${mode} visit order`);
    }
  }
});

test('shared input nodes are visited once per occurrence; source and type slots are unchanged', () => {
  const shared = tm.mark('same'), type = ty.unit(), input = tm.inl(tm.pair(shared, shared), type);
  const seen = [];
  const actual = mapSenTerm(input, (out, depth) => {seen.push([out[0], depth]); return Object.freeze(out);});
  assert.deepEqual(seen, [['mark',0],['mark',0],['pair',0],['inl',0]]);
  assert.notEqual(actual[1][1], actual[1][2]); assert.equal(actual[2], type);
  assert.equal(input[1][1], shared); assert.deepEqual(actual, input);
});

test('visitor exceptions stop at the same node and malformed terms never invoke the visitor', () => {
  const input = complex(), error = new Error('stop'), trace = [];
  assert.throws(() => mapSenTerm(input, out => {trace.push(out[0]); if (out[0] === 'var') throw error; return out;}), e => e === error);
  assert.deepEqual(trace, ['mark', 'inl', 'var']);
  for (const bad of [null, [], ['unknown'], ['var', -1], ['pair', ['star']], ['inl', ['star'], ['bad-type']]]) {
    let calls = 0; assert.throws(() => mapSenTerm(bad, () => calls++), error => error.code === 'malformed-sen'); assert.equal(calls, 0);
  }
});

test('de Bruijn operations keep capture avoidance and case-branch depths', () => {
  const input = tm.case(tm.var(0), tm.pair(tm.var(0), tm.var(1)), tm.lam(tm.var(2)));
  assert.deepEqual(rename(n => n + 2, input), tm.case(tm.var(2), tm.pair(tm.var(0), tm.var(3)), tm.lam(tm.var(4))));
  assert.deepEqual(subst(n => tm.mark(String(n)), input), tm.case(tm.mark('0'), tm.pair(tm.var(0), tm.mark('0')), tm.lam(tm.mark('0'))));
  assert.deepEqual(inst(tm.lam(tm.var(1)), tm.var(0)), tm.lam(tm.var(1)));
});

for (const depth of [8132, 20000]) test(`traversal and closedness preserve ${depth} binder levels without recursion`, () => {
  let term = tm.var(0);
  for (let n = 0; n < depth; n++) term = tm.lam(term);
  let calls = 0;
  const mapped = mapSenTerm(term, (out, nodeDepth) => {
    assert.equal(nodeDepth, depth - calls++); return Object.freeze(out);
  });
  assert.equal(calls, depth + 1); assert.equal(isClosed(mapped), true);
  let leaf = mapped;
  for (let n = 0; n < depth; n++) {assert.ok(Object.isFrozen(leaf));leaf = leaf[1];}
  assert.deepEqual(leaf, ['var', 0]);
});
