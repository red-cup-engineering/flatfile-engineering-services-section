#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { admitTriageSpec, triage } from "../src/triage.mjs";

/**
 * Streams the spec's source (or --file) once and prints the triage record as JSON.
 *
 *   triage-csv --spec <spec.json> [--file <local.csv>] [--out <record.json>]
 *
 * With --file the spec's URL is recorded but not fetched. Without it the URL
 * is streamed with fetch and never held whole in memory. Keyless: no
 * credential is read or sent.
 */
const { values } = parseArgs({ options: { spec: { type: "string" }, file: { type: "string" }, out: { type: "string" } } });
if (!values.spec) throw new TypeError("--spec is required");
const spec = admitTriageSpec(JSON.parse(await readFile(values.spec, "utf8")));

let chunks;
let source = {};
if (values.file) {
  chunks = createReadStream(values.file);
  source = { file: values.file };
} else {
  const response = await fetch(spec.source.url, { headers: { "user-agent": "csv-stream-triage-service" } });
  if (!response.ok) throw new Error(`source answered HTTP ${response.status}`);
  chunks = response.body;
  source = { contentLength: Number(response.headers.get("content-length")) || null, lastModified: response.headers.get("last-modified") };
}
const record = await triage(chunks, spec, { source });
const json = `${JSON.stringify(record, null, 2)}\n`;
if (values.out) await writeFile(values.out, json, { flag: "wx" });
else process.stdout.write(json);
