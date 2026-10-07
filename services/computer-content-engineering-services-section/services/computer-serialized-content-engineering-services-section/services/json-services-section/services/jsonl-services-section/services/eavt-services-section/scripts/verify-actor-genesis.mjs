#!/usr/bin/env node
// verify-actor-genesis — the effect: read a {address, genesisRow} JSON file and verify the
// genesis row actually births the claimed address. Thin: the law lives in src/actor.mjs.
import { readFileSync } from "node:fs";
import { verifyActorGenesis } from "../src/actor.mjs";

export default function verifyActorGenesisScript(path) {
  const { address, genesisRow } = JSON.parse(readFileSync(path, "utf8"));
  return verifyActorGenesis({ address, genesisRow });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: verify-actor-genesis.mjs <path-to-{address,genesisRow}-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(verifyActorGenesisScript(path)));
}
