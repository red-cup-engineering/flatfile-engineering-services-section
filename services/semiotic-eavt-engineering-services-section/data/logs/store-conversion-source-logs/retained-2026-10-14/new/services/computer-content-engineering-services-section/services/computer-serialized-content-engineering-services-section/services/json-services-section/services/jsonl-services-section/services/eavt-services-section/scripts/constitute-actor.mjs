#!/usr/bin/env node
// constitute-actor — the effect: birth an actor by its ONE constituting utterance, a genesis row,
// and return {address, genesisRow}. Thin: the law lives in src/actor.mjs.
import { constituteActor } from "../src/actor.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function constituteActorScript(attributes, t) {
  return constituteActor({ attributes, t });
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [attributesJson, tJson] = process.argv.slice(2);
  if (!attributesJson || tJson === undefined) {
    console.error("usage: constitute-actor.mjs <attributes-json> <t-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(constituteActorScript(JSON.parse(attributesJson), JSON.parse(tJson)), null, 2));
}
