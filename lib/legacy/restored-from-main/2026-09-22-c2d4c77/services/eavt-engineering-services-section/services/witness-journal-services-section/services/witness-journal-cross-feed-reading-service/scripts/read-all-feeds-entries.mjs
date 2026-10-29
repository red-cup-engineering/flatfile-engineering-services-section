#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readAllFeedsEntries } from "../src/index.mjs";

const { values } = parseArgs({ options: { root: { type: "string" }, at: { type: "string" }, feeds: { type: "string" }, help: { type: "boolean" } } });
if (values.help) { console.log("Usage: read-all-feeds-entries --root <journal-root> --at <witness-time> [--feeds feed-a,feed-b]"); process.exit(0); }
if (!values.root || !values.at) { console.error("error: --root and --at are required"); process.exit(2); }
const feeds = values.feeds === undefined ? undefined : values.feeds.split(",").map((feed) => feed.trim()).filter(Boolean);
process.stdout.write(`${JSON.stringify(readAllFeedsEntries(values.root, values.at, feeds))}\n`);
