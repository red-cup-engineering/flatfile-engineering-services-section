#!/usr/bin/env node
// Print the telemetry a store holds as OTLP/JSON, one ExportLogsServiceRequest per line, the form an OpenTelemetry
// Collector's file receiver reads. A named trace the store does not hold prints nothing and exits 1.
//   export-otlp [--trace TRACE_ID ...] [--since ISO_INSTANT] ROOT
import { parseArgs } from "node:util";
import { exportAll, exportTrace, readTrace } from "../src/telemetry-store.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { trace: { type: "string", multiple: true, default: [] }, since: { type: "string" } } });
if (positionals.length !== 1) { process.stderr.write("export-otlp [--trace TRACE_ID ...] [--since ISO_INSTANT] ROOT\n"); process.exit(2); }
const [root] = positionals;
let missing = 0;
if (values.trace.length === 0) for (const request of exportAll(root, { since: values.since })) process.stdout.write(`${JSON.stringify(request)}\n`);
else {
  for (const traceId of values.trace) {
    if (readTrace(root, traceId).messages.length === 0) { process.stderr.write(`export-otlp: ${root} holds no trace ${traceId}\n`); missing += 1; continue; }
    for (const request of exportTrace(root, traceId)) process.stdout.write(`${JSON.stringify(request)}\n`);
  }
}
process.exitCode = missing === 0 ? 0 : 1;
