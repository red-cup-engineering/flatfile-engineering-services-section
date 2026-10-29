#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { crossFeedReading } from "../src/index.mjs";

const { values } = parseArgs({ options: { root: { type: "string" }, at: { type: "string" }, feeds: { type: "string" }, situation: { type: "string" }, help: { type: "boolean" } } });
if (values.help) { console.log("Usage: cross-feed-reading --root <journal-root> --at <witness-time> [--feeds feed-a,feed-b] [--situation file.json]"); process.exit(0); }
if (!values.root || !values.at) { console.error("error: --root and --at are required"); process.exit(2); }
const feeds = values.feeds === undefined ? undefined : values.feeds.split(",").map((feed) => feed.trim()).filter(Boolean);
const situation = values.situation === undefined ? undefined : JSON.parse(readFileSync(values.situation, "utf8"));
process.stdout.write(`${JSON.stringify(crossFeedReading(values.root, values.at, situation, feeds))}\n`);
