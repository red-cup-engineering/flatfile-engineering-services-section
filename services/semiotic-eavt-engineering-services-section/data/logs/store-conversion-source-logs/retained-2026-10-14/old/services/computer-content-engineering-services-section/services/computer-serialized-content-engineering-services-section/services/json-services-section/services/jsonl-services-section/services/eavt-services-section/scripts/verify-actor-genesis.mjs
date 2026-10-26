#!/usr/bin/env node
// verify-actor-genesis — the effect: read a {address, genesisRow} JSON file and verify the
// genesis row actually births the claimed address. Thin: the law lives in src/actor.mjs.
import { readFileSync } from "node:fs";
import { verifyActorGenesis } from "../src/actor.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function verifyActorGenesisScript(path) {
  const { address, genesisRow } = JSON.parse(readFileSync(path, "utf8"));
  return verifyActorGenesis({ address, genesisRow });
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: verify-actor-genesis.mjs <path-to-{address,genesisRow}-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(verifyActorGenesisScript(path)));
}
