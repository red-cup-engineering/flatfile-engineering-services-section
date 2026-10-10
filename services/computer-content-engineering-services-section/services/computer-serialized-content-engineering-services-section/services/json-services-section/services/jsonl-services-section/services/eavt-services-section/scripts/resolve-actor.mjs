#!/usr/bin/env node
// resolve-actor — the effect: read an actor register off disk and resolve one reference against
// it (address, name, or superseded id). Thin: the law lives in src/actor.mjs.
import { readActorRegister, resolveActor } from "../src/actor.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function resolveActorScript(registerPath, ref) {
  return resolveActor(readActorRegister(registerPath), ref);
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [registerPath, ref] = process.argv.slice(2);
  if (!registerPath || !ref) {
    console.error("usage: resolve-actor.mjs <register-path> <ref>");
    process.exit(1);
  }
  console.log(JSON.stringify(resolveActorScript(registerPath, ref), null, 2));
}
