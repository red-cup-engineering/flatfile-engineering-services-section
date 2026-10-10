#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { searchPathForSchema } from "../src/search-path-for-schema.mjs";

// `search-path-for-schema <path>`, or the path as a JSON string on stdin.
const args = process.argv.slice(2);
if (args.length > 1) {
  process.stderr.write("usage: search-path-for-schema <path>\n");
  process.exitCode = 64;
} else {
  try {
    const path = args.length === 1 ? args[0] : JSON.parse(readFileSync(0, "utf8"));
    process.stdout.write(`${JSON.stringify(await searchPathForSchema(path), null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
