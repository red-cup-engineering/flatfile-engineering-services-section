import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";
// scratch, not math: random finite index sets, morphisms, and fibers so the hyperdoctrine's proof
// witnesses run on real (if small) fibrations instead of one hand-picked example.
import { randomBytes } from "node:crypto";

export const randInt = (n) => randomBytes(4).readUInt32BE(0) % n;
export const rbool = () => (randomBytes(1)[0] & 1) === 1;
export const pick = (arr) => arr[randInt(arr.length)];

/** A small finite index set with a fixed prefix, so J/I/L never collide across a pullback square. */
export const keys = (n, prefix) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

/** A random FOUR reading. */
export const randReading = () => pick(readingFamilies.knowledge);

/** A random complete fiber over `ks`. */
export const randFiber = (ks) => new Map(ks.map((k) => [k, randReading()]));

/** A random total function `source → target` (a random `IndexMorphism`, unconstrained — not injective,
 * not surjective, exercising both fan-in and unhit target cells). */
export function randMorphism(source, target) {
  const table = new Map(source.map((j) => [j, pick(target)]));
  return { source, target, map: (j) => table.get(j) };
}
