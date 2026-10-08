#!/usr/bin/env node
// list-actors — the effect: read an actor register off disk and list its actor summaries. Thin:
// the law (read, genesis re-verification) lives in src/actor.mjs.
import { readActorRegister } from "../src/actor.mjs";

export default function listActorsScript(registerPath) {
  return readActorRegister(registerPath).actors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [registerPath] = process.argv.slice(2);
  if (!registerPath) {
    console.error("usage: list-actors.mjs <register-path>");
    process.exit(1);
  }
  console.log(JSON.stringify(listActorsScript(registerPath), null, 2));
}
