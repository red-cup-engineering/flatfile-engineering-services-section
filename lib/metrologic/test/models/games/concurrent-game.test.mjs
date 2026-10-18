import test from 'node:test';
import assert from 'node:assert/strict';
import { concurrentGame, configurationOf, enabledOf, concurrentIn, configurationIsomorphism } from '../src/models/games/concurrent-game.mjs';
const event = (id, polarity = 'player', after = []) => ({ id, polarity, after });

test('independent events are concurrently enabled and causes yield tiers', () => {
  const g = concurrentGame({ events: [event('a'), event('b','opponent'), event('c','player',['a','b'])] });
  assert.deepEqual(g.tiers, [['a','b'],['c']]);
  assert.deepEqual(enabledOf(g), ['a','b']);
  assert.equal(concurrentIn(g,'a','b'), true);
  assert.equal(concurrentIn(g,'a','c'), false);
  assert.deepEqual(enabledOf(g,['a']), ['b']);
  assert.deepEqual(enabledOf(g,['a','b']), ['c']);
  assert.deepEqual(configurationOf(g,['a','b','c']), ['a','b','c']);
});

test('minimal conflict inherits to descendants but does not deny independent evidence', () => {
  const g = concurrentGame({ events: [event('bid'),event('ask'),event('bidFill','player',['bid']),
    event('askFill','player',['ask']),event('reading','opponent')], minimalConflicts: [['bid','ask']] });
  const pairs = g.conflicts.map(p => [...p].sort().join('|'));
  for (const pair of ['ask|bid','ask|bidFill','askFill|bid','askFill|bidFill'])
    assert.ok(pairs.includes(pair), pair + ' inherited');
  assert.equal(concurrentIn(g,'bidFill','askFill'),false);
  assert.equal(concurrentIn(g,'bid','reading'),true);
  assert.deepEqual(enabledOf(g,['bid']),['bidFill','reading']);
  assert.throws(()=>configurationOf(g,['bid','ask']),/incompatible/);
  assert.deepEqual(configurationOf(g,['bid','bidFill','reading']),['bid','bidFill','reading']);
});

test('reject self-inconsistent future, cycles, dangling causes, repeated conflicts, and unclosed plays', () => {
  assert.throws(()=>concurrentGame({ events:[event('a'),event('b'),event('join','player',['a','b'])], minimalConflicts:[['a','b']] }),/itself/);
  assert.throws(()=>concurrentGame({ events:[event('a','player',['b']),event('b','player',['a'])] }),/cycle/);
  assert.throws(()=>concurrentGame({ events:[event('a','player',['missing'])] }),/unknown/);
  assert.throws(()=>concurrentGame({ events:[event('a')], minimalConflicts:[['a','a']] }),/different/);
  assert.throws(()=>concurrentGame({ events:[event('a'),event('b')], minimalConflicts:[['a','b'],['b','a']] }),/duplicate/);
  assert.throws(()=>configurationOf(concurrentGame({events:[event('a'),event('b','player',['a'])]}),['b']),/causally closed/);
});

test('configuration isomorphism preserves polarity and induced causal order without authority', () => {
  const g = concurrentGame({ events:[event('a','opponent'),event('b','player',['a']),
    event('x','opponent'),event('y','player',['x']),event('p','player')] });
  const iso=configurationIsomorphism(g,[['a','x'],['b','y']]);
  assert.deepEqual(iso.domain,['a','b']);
  assert.deepEqual(iso.codomain,['x','y']);
  assert.ok(Object.isFrozen(iso.pairs[0]));
  assert.throws(()=>configurationIsomorphism(g,[['a','p']]),/polarity/);
  assert.throws(()=>configurationIsomorphism(g,[['a','x'],['b','p']]),/causal order/);
  assert.throws(()=>configurationIsomorphism(g,[['a','x'],['b','x']]),/distinct/);
});

test('pure readout retains immutable, caller-independent math', () => {
  const input={events:[event('a'),event('b')]}, original=JSON.stringify(input);
  const g=concurrentGame(input);
  assert.equal(JSON.stringify(input), original);
  assert.ok(Object.isFrozen(g.events[0]));
  assert.ok(Object.isFrozen(g.tiers[0]));
  assert.throws(()=>g.events[0].after.push('c'),TypeError);
});
