#!/usr/bin/env node
import { closeSync, fsyncSync, openSync, writeSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { execute } from "../src/eavt.mjs";
export const fileStore = { read: (path) => existsSync(path) ? readFileSync(path, "utf8").split("\n") : [], append: (path, line) => { mkdirSync(dirname(path), { recursive: true }); const fd = openSync(path, "a"); try {
        writeSync(fd, `${line}\n`);
        fsyncSync(fd);
    }
    finally {
        closeSync(fd);
    } } };
/** NDJSON command boundary for every EAVT effect. */
export async function main(input, output) { let text = ""; for await (const chunk of input)
    text += chunk.toString(); for (const line of text.split("\n").filter(Boolean)) {
    try {
        output.write(`${JSON.stringify({ ok: true, value: execute(JSON.parse(line), fileStore) })}\n`);
    }
    catch (error) {
        output.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`);
    }
} }
if (import.meta.main)
    await main(process.stdin, process.stdout);
