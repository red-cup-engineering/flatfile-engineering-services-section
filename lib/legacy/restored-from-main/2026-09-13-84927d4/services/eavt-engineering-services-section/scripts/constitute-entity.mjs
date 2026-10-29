#!/usr/bin/env node
// constitute-entity — the effect: birth an entity by its ONE constituting utterance, a genesis
// row, and return {address, genesisRow}. Thin: the law (the <kind>:<ni-digest> address rule)
// lives in src/eavt.mjs.
import { constituteEntity } from "../src/eavt.mjs";

export default function constituteEntityScript(kind, attributes, t) {
  return constituteEntity({ kind, attributes, t });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [kind, attributesJson, tJson] = process.argv.slice(2);
  if (!kind || !attributesJson || tJson === undefined) {
    console.error("usage: constitute-entity.mjs <kind> <attributes-json> <t-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(constituteEntityScript(kind, JSON.parse(attributesJson), JSON.parse(tJson)), null, 2));
}
