import test from "node:test";
import assert from "node:assert/strict";
import { readingFamilies, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import {
  chuSpace, chuSpaceOfEntries, at, extension, pointWitnesses, sameChuSpace,
  checkChuMap, chuMap, composeChuMaps, idChuMap, dual, withChu, plusChu,
} from "../src/chu.mjs";
import { mark } from "../src/mark.mjs";

test("Chu positive FCA extension is the positive evidence projection over all FOUR charges", () => {
  const states = ["has-standing"];
  const points = readingFamilies.knowledge;
  const space = chuSpace(points, states, (point) => point);
  const included = extension(space, states[0]);

  assert.deepEqual(included, ["potential", "stable"]);
  for (const charge of points) {
    assert.equal(
      included.includes(charge),
      sidesOfReading(charge)[0],
      `positive incidence disagrees with the evidence-for slot of ${charge}`,
    );
  }
  assert.equal(included.includes("active"), false, "against-only is not positive incidence");
  assert.equal(included.includes("absurd"), false, "unknown is not positive incidence");
});

test("opposing reports at the SAME claim retain positive and negative incidence", () => {
  const entries = [
    ["claim", "reports", "potential"],
    ["claim", "reports", "active"],
  ];
  for (const order of [entries, [...entries].reverse()]) {
    const space = chuSpaceOfEntries(["claim"], ["reports"], order);
    assert.equal(at(space, "claim", "reports"), "stable");
    assert.deepEqual(extension(space, "reports"), ["claim"],
      "a contested claim cannot disappear from the positive FCA context");
    assert.deepEqual(pointWitnesses(space, "claim"), {
      settled: "stable",
      for: ["reports"],
      against: ["reports"],
    });
  }
});

test("a Chu map must still preserve BOTH evidence polarities after the incidence repair", () => {
  const original = chuSpace(["claim"], ["reports"], () => "potential");
  const contested = chuSpace(["claim"], ["reports"], () => "stable");
  const ident = (value) => value;
  assert.equal(checkChuMap(original, original, ident, ident).kind, "chu.Map:witness");
  const changed = checkChuMap(original, contested, ident, ident);
  assert.equal(changed.kind, "chu.Map-obstruction",
    "sharing the positive incidence is not FOUR-valued Chu equivalence");
  assert.equal(changed.failures[0].kind, "chu.Map.adjointness-failure");
  assert.deepEqual(extension(original, "reports"), extension(contested, "reports"),
    "Boolean positive FCA projection is intentionally lossy about opposition");
});

test("every FOUR-valued Chu cell is reconstructed from BOTH Boolean incidences", () => {
  const names = readingFamilies.knowledge;
  const space = chuSpace(names, ["left", "right"], (point, state) =>
    state === "left" ? point : names[(names.indexOf(point) + 1) % names.length]);
  const recovered = chuSpace(space.points, space.states, (point, state) => {
    const [positive, negative] = sidesOfReading(at(space, point, state));
    return readingOfSides("knowledge", positive, negative);
  });
  assert.equal(sameChuSpace(space, recovered), true,
    "both incidence relations reconstruct the whole FOUR-valued Chu matrix");
  for (const point of space.points) for (const state of space.states)
    assert.equal(at(space, point, state), at(recovered, point, state));
});

test("all 16 singleton Chu translations require preserving both FCA polarities", () => {
  const names = readingFamilies.knowledge;
  for (const sourceReading of names) for (const targetReading of names) {
    const source = chuSpace(["claim"], ["context"], () => sourceReading);
    const target = chuSpace(["claim"], ["context"], () => targetReading);
    const [sourceFor, sourceAgainst] = sidesOfReading(sourceReading);
    const [targetFor, targetAgainst] = sidesOfReading(targetReading);
    const preservesBoth = sourceFor === targetFor && sourceAgainst === targetAgainst;
    const judgment = checkChuMap(source, target, (v) => v, (v) => v);
    assert.equal(judgment.kind === "chu.Map:witness", preservesBoth,
      `${sourceReading} → ${targetReading}: positive-only agreement is insufficient`);
    if (sourceFor === targetFor && sourceAgainst !== targetAgainst)
      assert.deepEqual(extension(source, "context"), extension(target, "context"),
        "same positive FCA extent can conceal a negative-polarity defect");
  }
});

test("out-of-carrier Chu rows are obstructions rather than discarded source testimony", () => {
  assert.throws(() => chuSpaceOfEntries(["c"], ["s"], [["other", "s", "potential"]]), /undeclared point or state/);
  assert.throws(() => chuSpaceOfEntries(["c"], ["s"], [["c", "other", "active"]]), /undeclared point or state/);
  assert.equal(at(chuSpaceOfEntries(["c"], ["s"], []), "c", "s"), "absurd");
});

test("an admitted finite Chu morphism remains adjoint when the caller changes its callbacks", () => {
  const source = chuSpace(["a", "b"], ["x"], (p) => p === "a" ? "potential" : "active");
  const target = chuSpace(["A", "B"], ["X"], (p) => p === "A" ? "potential" : "active");
  let corrupt = false;
  const proposed = (point) => corrupt ? (point === "a" ? "B" : "A") : (point === "a" ? "A" : "B");
  const admitted = chuMap(source, target, proposed, () => "x");
  corrupt = true;
  assert.deepEqual([admitted.forward("a"), admitted.forward("b")], ["A", "B"]);
  assert.equal(admitted.backward("X"), "x");
  assert.equal(checkChuMap(source, target, admitted.forward, admitted.backward).kind, "chu.Map:witness");
  assert.equal(composeChuMaps(admitted, idChuMap(target)).forward("a"), "A");
  assert.throws(() => admitted.forward("alien"), /outside source carrier/);
  assert.throws(() => admitted.backward("alien"), /outside target carrier/);
});

test("finite Chu admission evaluates each proposed map value once", () => {
  const source = chuSpace(["a", "b"], ["x"], p => p === "a" ? "potential" : "active");
  const target = chuSpace(["A", "B"], ["X"], p => p === "A" ? "potential" : "active");
  const calls = [];
  assert.equal(checkChuMap(source, target,
    point => { calls.push(point); return point === "a" ? "A" : "B"; },
    state => { calls.push(state); return "x"; }).kind, "chu.Map:witness");
  assert.deepEqual(calls, ["a", "b", "X"]);
});

test("Chu coordinates do not identify opaque Mark presentations without an admitted comparison", () => {
  const point = { z: 2, a: 1 }, state = { kind: "observed", n: 1 };
  const space = chuSpace([point], [state], () => "potential");
  assert.equal(at(space, point, state), "potential");
  assert.equal(at(space, { a: 1, z: 2 }, { n: 1, kind: "observed" }), "absurd",
    "equal-looking payloads are not a proved observational identification");
  assert.doesNotThrow(() => chuSpace([{ a: 1, z: 2 }, { z: 2, a: 1 }], ["x"], () => "potential"));

  const samePoint = (left, right) => left.a === right.a && left.z === right.z;
  const sameState = (left, right) => left.kind === right.kind && left.n === right.n;
  const admitted = chuSpace([point], [state], () => "potential", { samePoint, sameState });
  assert.equal(at(admitted, { a: 1, z: 2 }, { n: 1, kind: "observed" }), "potential");
  assert.deepEqual(extension(admitted, { n: 1, kind: "observed" }), [point]);
  assert.throws(() => chuSpace([{ a: 1, z: 2 }, { z: 2, a: 1 }], ["x"],
    () => "potential", { samePoint }), /repeat/);
});

test("Chu additives retain separate Mark occurrences and both evidence polarities", () => {
  const points = [mark({ datum: "same" }), mark({ datum: "same" })];
  const states = [mark({ context: "same" }), mark({ context: "same" })];
  const c = chuSpace(points, states, (point, state) =>
    readingFamilies.knowledge[points.indexOf(point) * 2 + states.indexOf(state)]);
  const d = chuSpace([mark("unit")], [mark("context")], () => "potential");

  const product = withChu(c, d);
  assert.equal(product.points.length, 2);
  assert.equal(product.states.length, 3);
  for (let i = 0; i < points.length; i++) {
    assert.strictEqual(product.points[i][0], points[i]);
    assert.strictEqual(product.points[i][1], d.points[0]);
    for (let j = 0; j < states.length; j++) {
      assert.strictEqual(product.states[j][1], states[j]);
      assert.equal(at(product, [points[i], d.points[0]], ["L", states[j]]), at(c, points[i], states[j]));
    }
    assert.equal(at(product, product.points[i], ["R", d.states[0]]), "potential");
  }

  const sum = plusChu(c, d);
  assert.equal(sum.points.length, 3);
  assert.equal(sum.states.length, 2);
  for (let i = 0; i < points.length; i++) {
    assert.strictEqual(sum.points[i][1], points[i]);
    for (let j = 0; j < states.length; j++) {
      assert.strictEqual(sum.states[j][0], states[j]);
      assert.equal(at(sum, ["L", points[i]], [states[j], d.states[0]]), at(c, points[i], states[j]));
    }
  }
  assert.equal(at(sum, ["R", d.points[0]], sum.states[0]), "potential");
  for (const space of [product, sum]) {
    assert.ok(Object.isFrozen(space.points));
    assert.ok(Object.isFrozen(space.states));
    assert.ok([...space.points, ...space.states].every(Object.isFrozen));
  }
});

test("Chu additive identity lifts the original admitted relations instead of encoding contents", () => {
  const sameLabel = (a, b) => a?.label === b?.label;
  const c = chuSpace([{ label: "c" }], [{ label: "x" }], () => "potential", {
    samePoint: sameLabel, sameState: sameLabel,
  });
  const d = chuSpace([{ label: "d" }], [{ label: "y" }], () => "active", {
    samePoint: sameLabel, sameState: sameLabel,
  });
  const product = withChu(c, d), sum = plusChu(c, d);
  assert.equal(at(product, [{ label: "c" }, { label: "d" }], ["L", { label: "x" }]), "potential");
  assert.equal(at(product, [{ label: "c" }, { label: "d" }], ["R", { label: "y" }]), "active");
  assert.equal(at(sum, ["L", { label: "c" }], [{ label: "x" }, { label: "y" }]), "potential");
  assert.equal(at(sum, ["R", { label: "d" }], [{ label: "x" }, { label: "y" }]), "active");
  assert.equal(at(product, [{ label: "other" }, { label: "d" }], product.states[0]), "absurd");
  assert.equal(at(sum, ["R", { label: "c" }], sum.states[0]), "absurd");
  for (const malformed of [null, "serialized", [], ["L"], ["other", c.points[0]]])
    assert.equal(at(sum, malformed, sum.states[0]), "absurd");

  const shared = mark("shared");
  const left = chuSpace([shared], [shared], () => "potential");
  const right = chuSpace([shared], [shared], () => "active");
  assert.deepEqual(withChu(left, right).matrix, [["potential", "active"]]);
  assert.deepEqual(plusChu(left, right).matrix, [["potential"], ["active"]]);
  assert.ok(sameChuSpace(product, withChu(c, d)));
  assert.ok(sameChuSpace(sum, plusChu(c, d)));
});

test("Chu additive construction accepts uninterpreted contents without invoking serialization hooks", () => {
  let calls = 0;
  const payload = { n: 1n, toJSON() { calls++; throw new Error("contents were interpreted"); } };
  payload.self = payload;
  const a = mark(payload), b = mark(Symbol("opaque"));
  const c = chuSpace([a], [b], () => "stable");
  const product = withChu(c, c), sum = plusChu(c, c);
  assert.deepEqual(product.matrix, [["stable", "stable"]]);
  assert.deepEqual(sum.matrix, [["stable"], ["stable"]]);
  assert.strictEqual(product.points[0][0], a);
  assert.strictEqual(sum.states[0][1], b);
  assert.equal(calls, 0);
});

test("Chu witness readout retains all product coordinates in carrier order", () => {
  const c = chuSpace(["claim"], ["a,b", "a"], () => "stable");
  const d = chuSpace(["other"], ["c", "b,c"], () => "potential");
  const sum = plusChu(c, d);
  const witnesses = pointWitnesses(sum, ["L", "claim"]);
  assert.equal(witnesses.settled, "stable");
  assert.equal(witnesses.for.length, 4);
  assert.equal(witnesses.against.length, 4);
  assert.notDeepEqual(sum.states[0], sum.states[3],
    "[a,b; c] and [a; b,c] are different original coordinates");
  for (const side of ["for", "against"]) {
    assert.ok(Object.isFrozen(witnesses[side]));
    for (let i = 0; i < sum.states.length; i++)
      assert.strictEqual(witnesses[side][i], sum.states[i]);
  }
});

test("Chu witness readout never coerces opaque states into display names", () => {
  let calls = 0;
  const states = Array.from({ length: 4 }, (_, index) => ({
    index, toString() { calls++; throw new Error("state was rendered"); },
  }));
  const space = chuSpace(["claim"], states, (_point, state) =>
    readingFamilies.knowledge[state.index]);
  const witnesses = pointWitnesses(space, "claim");
  assert.deepEqual(witnesses.for, [states[1], states[3]]);
  assert.deepEqual(witnesses.against, [states[2], states[3]]);
  assert.strictEqual(witnesses.for[0], states[1]);
  assert.strictEqual(witnesses.against[1], states[3]);
  assert.equal(calls, 0);
  const names = chuSpace(["claim"], ["z", "a"], () => "potential");
  assert.deepEqual(pointWitnesses(names, "claim").for, ["z", "a"],
    "the original carrier order is retained, independently of display sorting");
});

test("Chu additive duality and projection/injection maps preserve the full FOUR matrix", () => {
  const c = chuSpace([mark("c0"), mark("c1")], [mark("x0"), mark("x1")],
    (p, s) => readingFamilies.knowledge[(p.value === "c1" ? 2 : 0) + (s.value === "x1" ? 1 : 0)]);
  const d = chuSpace([mark("d")], [mark("y")], () => "active");
  const product = withChu(c, d), sum = plusChu(c, d);
  assert.ok(sameChuSpace(dual(product), plusChu(dual(c), dual(d))));
  assert.ok(sameChuSpace(dual(sum), withChu(dual(c), dual(d))));
  for (const [space, side, index] of [[c, "L", 0], [d, "R", 1]]) {
    const projection = chuMap(product, space, pair => pair[index], state => [side, state]);
    const injection = chuMap(space, sum, point => [side, point], pair => pair[index]);
    assert.equal(checkChuMap(product, space, projection.forward, projection.backward).kind, "chu.Map:witness");
    assert.equal(checkChuMap(space, sum, injection.forward, injection.backward).kind, "chu.Map:witness");
  }
  const empty = chuSpace([], [], () => "absurd");
  assert.deepEqual([withChu(c, empty).points.length, withChu(c, empty).states.length], [0, 2]);
  assert.deepEqual([plusChu(c, empty).points.length, plusChu(c, empty).states.length], [2, 0]);
});
