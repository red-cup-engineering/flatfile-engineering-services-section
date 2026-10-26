#!/usr/bin/env node
// list-actors — the effect: read an actor register off disk and list its actor summaries. Thin:
// the law (read, genesis re-verification) lives in src/actor.mjs.
import { readActorRegister } from "../src/actor.mjs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function listActorsScript(registerPath) {
  return readActorRegister(registerPath).actors;
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const [registerPath] = process.argv.slice(2);
  if (!registerPath) {
    console.error("usage: list-actors.mjs <register-path>");
    process.exit(1);
  }
  console.log(JSON.stringify(listActorsScript(registerPath), null, 2));
}
