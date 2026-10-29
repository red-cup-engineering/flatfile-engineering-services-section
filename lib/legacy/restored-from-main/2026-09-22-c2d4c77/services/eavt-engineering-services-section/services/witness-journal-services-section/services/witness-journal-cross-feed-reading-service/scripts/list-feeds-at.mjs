#!/usr/bin/env node
import { parseArgs } from "node:util";
import { listFeedsAt } from "../src/index.mjs";

const { values } = parseArgs({ options: { root: { type: "string" }, at: { type: "string" }, help: { type: "boolean" } } });
if (values.help) { console.log("Usage: list-feeds-at --root <journal-root> --at <witness-time>"); process.exit(0); }
if (!values.root || !values.at) { console.error("error: --root and --at are required"); process.exit(2); }
process.stdout.write(`${JSON.stringify(listFeedsAt(values.root, values.at))}\n`);
