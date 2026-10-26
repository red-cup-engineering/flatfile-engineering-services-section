# Specification of observability: SEAVT

Behavioral specification, traced to the unabridged request in `content/text/documents/sources/2026-10-19-observability-request.md` of the SignCell repository (digest `sha256:a5cf9927eac848483d9b9a2886ac48ae0f880248b2ba2e582951138ad20d8e69`). The requirements, whole specification and design are version 2 candidates of `admitArtifactFabricationSpecification` held in `data/records/artifact-fabrication/` of SignCell:

- requirements: admitted, `ni:///sha-256;9AhC_Wht51SJ_ogDdmVyIMeLsLnBoHx63m51BA1Heho`, 16 measured, 5 derived and 2 conjectured claims.
- specification: admitted, `ni:///sha-256;fEMhW34f1plxlRDkVNE4afjKyVWv72BerhnHrPTL__U`, 16 measured, 5 derived and 2 conjectured claims.
- design: admitted, `ni:///sha-256;63fvJdKjTjxOcxEZQAO8sZkvNvP7BY_F2umw5UQICic`, 16 measured, 5 derived and 2 conjectured claims.

Shall is used as in BCP 14. Every statement has a positive, an alternate and a refusal example, each a test of the same name.

## Standards

- IETF, RFC 6920 (2013) and RFC 8949 section 4.2 (2020): https://www.rfc-editor.org/rfc/rfc6920 ; https://www.rfc-editor.org/rfc/rfc8949#section-4.2.
- W3C, Trace Context Recommendation: https://www.w3.org/TR/trace-context/.
- OpenTelemetry, specification v1.61.0, context/env-carriers.md (release candidate): specification/context/env-carriers.md.
- OpenTelemetry, semantic-conventions v1.44.0: docs/exceptions/exceptions-logs.md ; docs/registry/attributes/{process,error,exception,test,vcs,cicd,service,deployment}.md.
- OpenTelemetry, opentelemetry-proto v1.11.1, OTLP JSON Protobuf encoding: opentelemetry/proto/logs/v1/logs.proto ; https://opentelemetry.io/docs/specs/otlp/.
- Test Anything Protocol, version 13: https://testanything.org/tap-version-13-specification.html.
- JUnit, XML report format of the JUnit and Ant tooling, as emitted by node:test: https://github.com/testmoapp/junitxml.

## Statements

- SV1. The telemetry store shall keep each blob under its content address, return the same address for the same bytes, and refuse on read bytes that do not hash to the address asked.
  - Positive: Putting ten thousand bytes returns an RFC 6920 address; getting that address returns the same bytes.
  - Alternate: Putting the same bytes again returns the same address and writes nothing new.
  - Refusal: A blob file altered after writing is refused on read with a corruption error; an address that is not an RFC 6920 name is refused.
  - Traces to: r-whole-output; claims: seavt-lacks-blobs-and-telemetry.

- SV2. The telemetry store shall keep each message as a SEAVT record on a thread named by its trace id, whose causes are the thread's frontier, so that one trace is one thread, and shall keep each channel as a record.
  - Positive: Two messages of one trace on two channels are one thread, the second caused by the first, and the record address of each equals its SignCell message address.
  - Alternate: Messages of two traces are two threads; a message without a trace id goes to the thread named `untraced` for its day.
  - Refusal: A record over the store's record bound is refused; a trace id that is not thirty-two lowercase hexadecimal characters is refused.
  - Traces to: r-one-trace, r-signcell-substrate; claims: seavt-store-threads.

- SV3. A telemetry handle shall continue the trace in the process's `TRACEPARENT` when it is valid and otherwise start a new root, shall give every child process a fresh span of that trace through the environment, and shall take its clock and entropy from the caller's ports.
  - Positive: A handle opened in an environment whose `TRACEPARENT` names trace T records under T, and childEnvironment gives a copy whose `TRACEPARENT` names T with a new parent-id.
  - Alternate: A handle opened with no `TRACEPARENT` starts a root and says so in the record; an invalid `TRACEPARENT` starts a root and records the reason.
  - Refusal: A handle with no root path, no service name or no clock port is refused.
  - Traces to: r-one-trace; claims: otel-env-carrier, w3c-trace-context-v00.

- SV4. Recording a finished command shall store its blobs, then its record, and shall return the record's address and, for a failure, the failure's headline; a command that succeeded shall be recorded as information.
  - Positive: A command that fails with ten thousand bytes of stderr is recorded: the record is in its trace's thread, the stderr blob is in the blob store, and the returned headline names the command, the exit code and the last stderr line.
  - Alternate: A command killed by a signal is recorded with its signal and no exit code; a success is recorded at information severity.
  - Refusal: A result that is not an executor's result is refused, and a store that cannot be written is reported to the caller rather than hidden.
  - Traces to: r-failure-record, r-whole-output, r-diagnosable; claims: case-1-receiver-drops-context, owner-reuse-is-feasible.

- SV5. The telemetry store shall export a trace, or every trace of a day, as one OTLP ExportLogsServiceRequest per line, each line a packet of one channel.
  - Positive: Exporting a trace of two channels gives two lines, each parsing as JSON with resourceLogs, scopeLogs and logRecords whose trace ids equal the trace.
  - Alternate: Exporting an empty store gives no lines and success; exporting by day gives every trace that day.
  - Refusal: Exporting a trace id the store does not hold gives no lines and a nonzero exit from the script.
  - Traces to: r-otlp-export, r-signcell-substrate; claims: collector-ingests-the-export, otel-logs-data-model.

- SV6. Recording a test run shall keep the report as a blob, summarize it, and carry the summary, the report's address and `test.suite.run.status` on the command's record.
  - Positive: A test run whose TAP report has one failure is recorded with the report blob's address, the counts and status failure.
  - Alternate: A JUnit report is recorded the same way.
  - Refusal: A report that cannot be read is recorded as unreadable with its blob, never as passing.
  - Traces to: r-test-reports; claims: case-4-lagoon-keeps-log-on-builder.

