#!/usr/bin/env node
// check-settling-orbit -- the effect: judge one cell's orbit against the settling-monotonicity
// gate. `m <= n` must imply `orbit[m] <=_k orbit[n]`; the answer is a verdict value, and the
// process exit code is 0 for a monotone orbit and 1 for a violation. Thin: the order and the gate
// are src/settlement.mjs's `readingSettlement`, the wire reading is src/wire.mjs's.
import { readingSettlement } from "../src/settlement.mjs";
import { readOrbit } from "../src/settlement-wire.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function checkSettlingOrbit(wireOrbit, { cell = "" } = {}) {
  const orbit = readOrbit(wireOrbit);
  const monotone = readingSettlement.orbitMonotone(orbit);
  return Object.freeze({ cell, length: orbit.length, monotone });
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [cell = ""] = process.argv.slice(2);
  process.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  const verdict = checkSettlingOrbit(JSON.parse(text), { cell });
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(verdict.monotone ? 0 : 1);
}
