#!/usr/bin/env node
// actor-cli — the composed face over the Actor operations only.
import constituteActorScript from "../scripts/constitute-actor.mjs";
import verifyActorGenesisScript from "../scripts/verify-actor-genesis.mjs";
import appendActorRowsScript from "../scripts/append-actor-rows.mjs";
import listActorsScript from "../scripts/list-actors.mjs";
import resolveActorScript from "../scripts/resolve-actor.mjs";
import { readFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

function usage() {
  console.error(
    "usage: actor-cli.mjs <constitute|verify|append|list|resolve> ...",
  );
  process.exit(1);
}

function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case "constitute": {
      const [attributesJson, tJson] = rest;
      if (!attributesJson || tJson === undefined) usage();
      return constituteActorScript(JSON.parse(attributesJson), JSON.parse(tJson));
    }
    case "verify": {
      const [path] = rest;
      if (!path) usage();
      return verifyActorGenesisScript(path);
    }
    case "append": {
      const [registerPath, rowsFile] = rest;
      if (!registerPath || !rowsFile) usage();
      return appendActorRowsScript(registerPath, JSON.parse(readFileSync(rowsFile, "utf8")));
    }
    case "list": {
      const [registerPath] = rest;
      if (!registerPath) usage();
      return listActorsScript(registerPath);
    }
    case "resolve": {
      const [registerPath, ref] = rest;
      if (!registerPath || !ref) usage();
      return resolveActorScript(registerPath, ref);
    }
    default:
      return usage();
  }
}

if ((process.argv[1] !== undefined && (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })())) {
  const result = main(process.argv.slice(2));
  console.log(typeof result === "string" ? result : JSON.stringify(result, null, 2));
}

export default main;
