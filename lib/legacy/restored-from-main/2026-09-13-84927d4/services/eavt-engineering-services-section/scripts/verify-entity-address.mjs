#!/usr/bin/env node
// verify-entity-address — the effect: recompute a genesis row's address (entityAddress) and
// report whether it matches the row's own `e`. Thin: the law lives in src/eavt.mjs.
import { entityAddress } from "../src/eavt.mjs";

export default function verifyEntityAddressScript(genesisRow) {
  const recomputed = entityAddress(genesisRow);
  return { address: recomputed, verified: recomputed === genesisRow.e };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [genesisRowJson] = process.argv.slice(2);
  if (!genesisRowJson) {
    console.error("usage: verify-entity-address.mjs <genesis-row-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(verifyEntityAddressScript(JSON.parse(genesisRowJson)), null, 2));
}
