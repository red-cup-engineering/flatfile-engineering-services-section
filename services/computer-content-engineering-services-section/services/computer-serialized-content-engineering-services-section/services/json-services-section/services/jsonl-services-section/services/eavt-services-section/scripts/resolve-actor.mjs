#!/usr/bin/env node
// resolve-actor — the effect: read an actor register off disk and resolve one reference against
// it (address, name, or superseded id). Thin: the law lives in src/actor.mjs.
import { readActorRegister, resolveActor } from "../src/actor.mjs";

export default function resolveActorScript(registerPath, ref) {
  return resolveActor(readActorRegister(registerPath), ref);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [registerPath, ref] = process.argv.slice(2);
  if (!registerPath || !ref) {
    console.error("usage: resolve-actor.mjs <register-path> <ref>");
    process.exit(1);
  }
  console.log(JSON.stringify(resolveActorScript(registerPath, ref), null, 2));
}
