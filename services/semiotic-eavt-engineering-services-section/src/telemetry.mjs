/**
 * The telemetry handle: one process's part in a trace, and the recorder of what its commands and errors did.
 *
 * A handle continues the trace in the process's `TRACEPARENT` or starts a root, gives every child process a fresh span of that
 * trace through the environment (OpenTelemetry's environment-variable carrier), and records finished commands, errors and test
 * runs as SignCell messages in the telemetry store (telemetry-store.mjs). It never spawns: the producer runs its command with the
 * executor it already has and hands the handle the result. The clock, the entropy and the environment are the producer's ports;
 * `systemPorts()` is the kernel-edge default.
 */
import { randomBytes } from "node:crypto";
import { channel as makeChannel } from "@red-cup-engineering/signcell/signal";
import { childTraceContext, newTraceContext, traceContextFromEnvironment, traceContextToEnvironment } from "@red-cup-engineering/signcell/trace-context";
import { commandLog, environmentIdentity, errorLog } from "@red-cup-engineering/signcell/failure";
import { suiteRunStatus, summarizeTestReport } from "@red-cup-engineering/signcell/test-report";
import { cellEventMessage, cellEventOfMessage } from "@red-cup-engineering/signcell/cloud-events";
import { StoreError } from "./layout.mjs";
import { otlpLogRecord } from "@red-cup-engineering/signcell/observability";
import { appendMessage, exportTrace, putBlob, putChannel } from "./telemetry-store.mjs";

/** The ambient ports of a process: its clock, its entropy and its environment. Only a kernel edge calls this. */
export const systemPorts = (environment = process.env) => ({ now: () => new Date().toISOString(), entropy: (count) => new Uint8Array(randomBytes(count)), env: environment });

const FAILURES_KEPT = 50;
const REPORT_ATTRIBUTES = [
  "test.suite.name", "test.suite.run.status", "semioverse.test.report.id", "semioverse.test.report.format",
  "semioverse.test.tests", "semioverse.test.pass", "semioverse.test.fail", "semioverse.test.skipped",
  "semioverse.test.failures", "semioverse.test.report.unreadable", "semioverse.test.report.junit_count_basis",
];
const lastLine = (text) => text.split("\n").map((line) => line.trimEnd()).filter((line) => line !== "").at(-1);

function resourceOf(service) {
  const { name, version, namespace, instanceId, attributes = {} } = service;
  return { ...attributes, "service.name": name, ...(version === undefined ? {} : { "service.version": version }), ...(namespace === undefined ? {} : { "service.namespace": namespace }), ...(instanceId === undefined ? {} : { "service.instance.id": instanceId }) };
}

/**
 * Open a handle. `root` is the store; `service` is `{name, version?, namespace?, instanceId?, attributes?}`, the OpenTelemetry Resource of the process;
 * `ports` are `{now, entropy, env}`; `channel` names the channel (default the service name); `traceparent` overrides the environment's.
 */
export function openTelemetry({ root, service, channel: channelName, ports, traceparent } = {}) {
  if (typeof root !== "string" || root === "") throw new StoreError("telemetry", "a telemetry handle needs a store root");
  if (typeof service?.name !== "string" || service.name === "") throw new StoreError("telemetry", "a telemetry handle needs a service name");
  if (typeof ports?.now !== "function" || typeof ports?.entropy !== "function") throw new StoreError("telemetry", "a telemetry handle needs the clock and entropy ports of its caller");
  const { now, entropy } = ports;
  const env = ports.env ?? {};
  const received = traceContextFromEnvironment(traceparent === undefined ? env : { ...env, TRACEPARENT: traceparent });
  const context = received.ok ? childTraceContext(received.context, { bytes: entropy(8) }) : newTraceContext({ bytes: entropy(24) });
  const origin = received.ok ? { joined: true } : { joined: false, rootReason: received.reason, ...(received.message ? { rootMessage: received.message } : {}) };
  const line = makeChannel({ name: channelName ?? service.name, resource: resourceOf(service) });
  putChannel(root, line);

  function handleOf(current) {
    const traceContext = { traceId: current.traceId, spanId: current.spanId, traceFlags: current.traceFlags, ...(current.tracestate === undefined ? {} : { tracestate: current.tracestate }) };
    const deposit = (build) => {
      let log = build(undefined);
      for (const tailBytes of [undefined, 256, 0]) {
        log = tailBytes === undefined ? log : build(tailBytes);
        for (const blob of log.blobs ?? []) putBlob(root, blob.bytes);
        try { return { message: appendMessage(root, { channel: line.id, traceId: current.traceId, observedAt: log.observedAt, body: log.record }), log }; }
        catch (error) { if (!(error instanceof StoreError) || error.code !== "record-size") throw error; }
      }
      throw new StoreError("record-size", "a telemetry record exceeded the store bound even without inline tails");
    };
    const handle = {
      traceId: current.traceId, spanId: current.spanId, parentSpanId: current.parentSpanId, traceFlags: current.traceFlags, ...origin, channel: line, root,
      get traceparent() { return traceContextToEnvironment(traceContext).TRACEPARENT; },
      /** A copy of `base` for a child process, carrying this trace with a span of the child's own. */
      childEnvironment(base = env) { return traceContextToEnvironment(childTraceContext(traceContext, { bytes: entropy(8) }), base); },
      /** A handle for a sub-operation: the same trace, a span of its own. */
      span() { return handleOf(childTraceContext(traceContext, { bytes: entropy(8) })); },
      /** Record a finished command. `result` is the executor's `{status, signal, stdout, stderr, error}`. */
      recordCommand({ operation, command, args, cwd, result, startedAt, durationMs, inputs, environment, revealEnvironment, attributes } = {}) {
        const observedAt = now();
        const identity = environment === undefined ? undefined : environmentIdentity(environment, { reveal: revealEnvironment });
        const { message, log } = deposit((tailBytes) => ({ ...commandLog({ operation, command, args, cwd, result, startedAt, durationMs, observedAt, traceContext, environment: identity, inputs, attributes, ...(tailBytes === undefined ? {} : { tailBytes }) }), observedAt }));
        // The receipt is a reading of the same sanitized, bounded record. Raw
        // executor streams must not reintroduce credentials or bypass its tail bound.
        const body = new Map(log.record.body.kvlistValue.values.map(({ key, value }) => [key, value]));
        const retainedTail = (stream) => body.get(stream).kvlistValue.values.find(({ key }) => key === "tail").value.stringValue;
        const tail = lastLine(retainedTail("stderr")) ?? lastLine(retainedTail("stdout"));
        const what = body.get("message").stringValue;
        return Object.freeze({ ok: log.ok, address: message.id, traceId: current.traceId, exitCode: log.exitCode, signal: log.signal, headline: log.ok ? what : `${what}${tail ? `: ${tail}` : ""}`, blobs: log.blobs.map(({ id, stream, size }) => ({ id, stream, size })), record: message });
      },
      /** Record an explicitly supplied observation; the caller owns disclosure policy. */
      recordEvent({ operation, body, attributes = {}, severityNumber = 9 } = {}) {
        if (typeof operation !== "string" || operation.trim() === "")
          throw new TypeError("recordEvent: operation must be nonempty text");
        const observedAt = now();
        const record = otlpLogRecord({ observedAt, eventName: operation, body, attributes, severityNumber, traceContext });
        // One publication attempt: no tail reduction, retry or replacement journal.
        const message = appendMessage(root, { channel: line.id, traceId: current.traceId, observedAt, body: record });
        return Object.freeze({ address: message.id, traceId: current.traceId, record: message });
      },
      /** Observe an existing native claim event. Receipt preserves custody, not an additional witness or a truth judgment. */
      recordCellEvent(options = {}) {
        const supplied = options !== null && typeof options === "object" && !Array.isArray(options)
          ? Object.getOwnPropertyDescriptor(options, "event") : undefined;
        if (!supplied?.enumerable || !Object.hasOwn(supplied, "value"))
          throw new TypeError("recordCellEvent: event must be supplied as an enumerable data property");
        const expected = Object.getOwnPropertyDescriptor(options, "expect");
        if ("expect" in options && (!expected?.enumerable || !Object.hasOwn(expected, "value")))
          throw new TypeError("recordCellEvent: expect must be supplied as an enumerable data property");
        const observation = cellEventMessage({ event: supplied.value, channel: line, observedAt: now(), traceContext });
        // The pure observation supplies the admitted body. Only the existing
        // locked append owns the causal frontier and the final message address.
        const message = appendMessage(root, { channel: line.id, traceId: current.traceId, observedAt: observation.observedAt, body: observation.body, expect: expected?.value });
        const retained = cellEventOfMessage(message);
        return Object.freeze({ address: message.id, traceId: message.body.traceId, eventId: retained.id, eventSource: retained.source, record: message });
      },
      /** Record an error (with its cause chain and detail) that is not a command's result. */
      recordError({ operation, error, detail, attributes, severityNumber } = {}) {
        const observedAt = now();
        const { message, log } = deposit(() => ({ ...errorLog({ operation, error, observedAt, traceContext, detail, attributes, severityNumber }), blobs: [], observedAt }));
        return Object.freeze({ address: message.id, traceId: current.traceId, headline: log.chain.map((item) => item.message).join(" <- "), record: message });
      },
      /** Record a test run: the command's record carrying the report's blob address, its counts and `test.suite.run.status`. */
      recordTestRun({ format, report, reportOptions, suite, ...command } = {}) {
        const input = report === undefined ? command.result?.stdout ?? "" : report;
        const bytes = typeof input === "string" ? new TextEncoder().encode(input) : Buffer.from(input);
        let text;
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch { /* Invalid UTF-8 remains an unreadable observation of the original bytes. */ }
        const summary = text === undefined ? { ok: false, format, reason: "report is not valid UTF-8" } : summarizeTestReport(format, text, reportOptions);
        const reportId = putBlob(root, bytes);
        const context = { ...(command.attributes ?? {}) };
        for (const key of REPORT_ATTRIBUTES) delete context[key];
        const attributes = {
          ...context,
          "test.suite.name": suite ?? command.command, "test.suite.run.status": suiteRunStatus(summary),
          "semioverse.test.report.id": reportId, "semioverse.test.report.format": format,
          ...(summary.ok && summary.junitCountBasis ? { "semioverse.test.report.junit_count_basis": summary.junitCountBasis } : {}),
          ...(summary.ok ? { "semioverse.test.tests": summary.tests, "semioverse.test.pass": summary.pass, "semioverse.test.fail": summary.fail, "semioverse.test.skipped": summary.skipped, ...(summary.failures.length ? { "semioverse.test.failures": summary.failures.slice(0, FAILURES_KEPT) } : {}) } : { "semioverse.test.report.unreadable": summary.reason }),
        };
        const recorded = handle.recordCommand({ ...command, operation: command.operation ?? "test.run", attributes });
        return Object.freeze({ ...recorded, report: { id: reportId, format, summary } });
      },
      /** This trace as OTLP `ExportLogsServiceRequest` objects, one per channel. */
      export() { return exportTrace(root, current.traceId); },
    };
    return Object.freeze(handle);
  }
  return handleOf(context);
}
