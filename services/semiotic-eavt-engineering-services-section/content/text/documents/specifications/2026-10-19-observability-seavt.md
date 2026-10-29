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
- CloudEvents 1.0.2, through SignCell's native claim profile: https://github.com/cloudevents/spec/tree/v1.0.2/cloudevents ; OpenTelemetry semantic-conventions v1.44.0 CloudEvents attributes (development): https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloudevents/.
- Test Anything Protocol, version 13: https://testanything.org/tap-version-13-specification.html.
- JUnit, XML report format of the JUnit and Ant tooling, as emitted by node:test: https://github.com/testmoapp/junitxml.

## Statements

- SV1. The telemetry store shall keep each blob under its content address, return the same address for the same bytes, and refuse on read bytes that do not hash to the address asked.
  - Positive: Putting ten thousand bytes returns an RFC 6920 address; getting that address returns the same bytes.
  - Alternate: Putting the same bytes again returns the same address and writes nothing new.
  - Refusal: A blob file altered after writing is refused on read with a corruption error; an address that is not an RFC 6920 name is refused.
  - Traces to: r-whole-output; claims: seavt-lacks-blobs-and-telemetry.
  - Full-address custody, 2026-10-27: Whole raw blobs shall use all 43 characters of their SHA-256 digest, through the existing NI owner's `niPathSegments(address, [2, 41])`: `data/blobs/telemetry/sha-256/<first 2>/<remaining 41>`. The 4096 `ni-path-v1` record buckets are shared containers for addressed rows and cannot serve as individual raw blob identities. Distinct blobs sharing a two-character prefix shall both be independently readable, even when written in either order.
  - Duplicate and concurrent publication: New writes shall use the shared File owner's atomic exclusive-create operation. A currently occupied address, including an `EEXIST` result from a concurrent publisher, shall be read and verified against the requested NI address before success. Corruption and other I/O failures shall propagate before command/report record publication. The writer shall neither overwrite conflicting evidence nor return success for unavailable bytes; no retry, secondary journal or replacement hash algorithm is introduced.
  - Historical receiving: Existing `data/blobs/telemetry/sha-256/<first 2>.jsonl` files shall remain read-only fallback inputs. Only an absent current full-address file permits fallback; its bytes must match the requested digest. A mismatching historical occupant is explicit `StoreCorruption`, never evidence that the requested blob was stored. A valid historical copy cannot hide a corrupt current file. Readers shall not migrate state. A later explicit put with the actual source bytes may create a current full-address copy while retaining the historical file unchanged; absent lost bytes cannot be reconstructed from the old bucket name.
  - Metadata scope: `hasBlob` and `blobSize` retain their current full-address existence/size behavior without reading that file's bytes; `getBlob` establishes byte/digest custody. Historical shared paths require byte verification before any existence or size answer. This preserves fast current metadata reads without treating an unrelated legacy bucket occupant as the requested blob.

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
  - Wire flags: Native custody shall retain admitted incoming uint32 LogRecord flags, including reserved high bits, without rewriting the message or its identity. A newly constructed OTLP request shall refuse any record whose high 24 flag bits are nonzero through the owning SignCell exporter. Refusal shall leave the complete native trace, original record bytes and head readable and unchanged; it shall not mask the retained flags or return a successful subset. A low-byte value such as `0x81` remains exportable unchanged.
  - Traces to: r-otlp-export, r-signcell-substrate; claims: collector-ingests-the-export, otel-logs-data-model.

- SV6. Recording a test run shall keep the report as a blob, summarize it, and carry the summary, the report's address and `test.suite.run.status` on the command's record.
  - Positive: A test run whose TAP report has one failure is recorded with the report blob's address, the counts and status failure.
  - Alternate: A JUnit report is recorded the same way.
  - Refusal: A report that cannot be read is recorded as unreadable with its blob, never as passing.
  - Traces to: r-test-reports; claims: case-4-lagoon-keeps-log-on-builder.
  - Completion receiving, 2026-10-26: use SignCell's complete report reader. A missing TAP completion plan, a plan/count conflict or truncated XML remains an unreadable observation with the exact original blob and status `aborted`, even if the command exited zero. Do not emit successful test counts for that reading. Command evidence and report evidence remain separate claims; a command's exit status alone cannot qualify a test selection.
  - Producer projection: forward caller `reportOptions` to the same pure SignCell reader. JUnit defaults to the original Node reporter's immediate-child suite counts; a producer that totals descendant testcases explicitly selects `{junitCountBasis: "leaves"}`. Record the admitted basis as `semioverse.test.report.junit_count_basis` on the existing message. Do not guess a basis until counts happen to match, rewrite the source report or construct another ledger.
  - Byte custody: preserve explicit byte reports and byte stdout fallback exactly in the existing blob store. Decode UTF-8 separately for reading; malformed UTF-8 is unreadable and cannot be repaired by replacement characters before addressing. String reports are encoded as UTF-8.
  - Attribute custody: the report projection owns its suite identity/status, report identity/format/basis, counts, failures and unreadability attributes. Replace those fields from caller context with the actual reading, including their absence. Preserve unrelated command context and the original caller object.


- SV7. A telemetry handle shall record a caller-supplied event through the existing OTLP LogRecord and telemetry message producer, with its own clock, trace/span and channel, and return the actual addressed message. It shall attempt the write once, retaining the current store bound and refusal.
  - Positive: An event is readable under the returned address in the handle's trace, with event name, attributes, observed instant and original body value; later input mutation does not rewrite it.
  - Alternate: Two observations share the same caller clock but have distinct supplied sequences and a causal edge; a supplied JSON event text retains null without inventing an OTLP null encoding.
  - Refusal: A missing event name, unsupported body, over-bound record or unwritable store refuses to the caller, with no silent truncation, retry, fallback journal, or fabricated success receipt.
  - Traces to: the 2026-10-24 legacy revival job of optional full-app lifecycle observations; generic event policy belongs to the producer, not the telemetry substrate.

## Source-complete knowledge receiving (2026-10-26)

The Leader's logging and ledger unification request requires the existing common store's records to be usable as source knowledge. SignCell remains the owner of Channel/Message/Packet identity; the native SEAVT store remains custody. A source-complete trace is complete only relative to its captured, explicitly returned frontier. This does not assert that a reported event happened, confer actor rights, authenticate financial settlement, or claim a snapshot containing later appends.

- SV8. `readTrace` shall return admitted messages with each available cause before its effect, preserving the original cause edges and observed instants independently. Source clock rollback or equal clocks shall not reverse causality. A shared ancestor shall appear once even with multiple heads or fan-in.
  - Positive: A root, two branches sharing that root, and a joined effect have decreasing observed clocks; every source cause precedes its effect and all four messages remain.
  - Alternate: One trace crosses two channels; each channel's OTLP transport array preserves this causal reading while the original SignCell packet/message identities and body values remain unchanged. Independent siblings have no inferred time or causal relation.
  - Refusal: Missing or hash-invalid causes remain explicit unavailable evidence. A reader can inspect the valid partial result but cannot export it as a complete trace.
  - Traces to: r-one-trace, r-signcell-substrate and the 2026-10-26 log-as-knowledge receiving request. Cases live in `test/telemetry-trace-integrity.test.mjs`.

- SV9. `readTrace` shall retain its `messages` and `truncated` members and add `coverage: {status, frontier, issues}`. Status is `complete`, `incomplete`, or `absent`; the original captured frontier identifies the source cut. Issues name missing/hash-invalid records (`unavailable-record`), unresolved causes, foreign record types, invalid causal references or failed source admission. A bounded walk must report incomplete coverage rather than silently omit its remainder.
  - Positive: A limit of one on a two-message trace returns the tip, the actual frontier, `truncated: true`, unresolved cause identity and `incomplete`; the existing complete `exportTrace` API throws `StoreError` code `incomplete-trace`, carrying the same coverage and truncation state.
  - Alternate: An absent trace has status `absent`, distinct from an existing empty head with a complete empty frontier. Empty-store `exportAll` remains empty; explicit absent-trace export refuses.
  - Refusal: A typed cross-store reference cannot be read as a telemetry Message, even if its content-addressed record exists. A malformed causal reference or non-Message record is explicit incomplete evidence. `exportTrace` shall return its existing request-array shape only for a complete source cut, never a silently successful subset.
  - Limits: The underlying `walk` may identify either an absent record or no hash-valid record at an address; `unavailable-record` makes precisely that claim. Ordinary unreadable-head and filesystem failures still throw rather than being disguised as absence. Discovery of trace heads uses the native store's strict mode.

- SV10. Channel and Message reads shall pass the owning SignCell admission and canonical constructors. The resulting nested values belong to that source, and mutable caller objects cannot rewrite the returned observations. Observation clocks must name real instants. A message's declared OTLP trace, when present, must agree with the selected thread; omission remains omission.
  - Positive: A source-owned message and channel are read with their original identities and deeply immutable body/resource values.
  - Alternate: A message with no declared OTLP trace retains that omission and can still belong to its native thread; no trace identity is synthesized into its body.
  - Refusal: An unavailable/malformed channel, malformed Message, impossible calendar instant or contradictory trace identity is explicit incomplete evidence. New malformed caller fields refuse before `appendMessage` publishes or advances a head. Existing store I/O failures propagate; the reader does not catch arbitrary exceptions as record defects.
  - Limits: This validates content and the declared SignCell carrier. The native store's individual record/head publication guarantees remain those in `store.md`; this change adds no multi-record transaction, crash fence, semantic truth judgment or alternate journal. Transport export uses the exact selected SignCell projection and preserves its identity attributes; independent protocol/collector receiving remains a separate qualification.

## Shared handle projection and propagation (2026-10-26)

- SV11. A command receipt's headline shall be derived only from the original SignCell command record's message and bounded, sanitized output tails. The handle shall not reread raw executor output to construct a second disclosure path. A nonempty stderr tail takes precedence over stdout; a successful command uses its recorded message without a tail. If the existing record-size policy omits inline tails, the headline shall omit them too, while retaining the original blob references.
  - Positive: A real child process writes a recognized credential to stderr and fails; the returned headline, retained output tail and referenced blob contain the supplier's redacted value rather than the credential.
  - Alternate: With empty stderr, the headline uses the sanitized stdout tail; an overlong last line remains bounded by the actual retained tail rather than expanding from the raw stream.
  - Refusal: A failed command without output has no invented tail; command/store refusal remains refusal, and no fallback journal or extra publication is introduced.
  - Scope: SignCell owns the redaction vocabulary. This requirement prevents the shared handle from undoing that owner's projection; it does not independently certify arbitrary caller attributes or older supplier redaction semantics.

- SV12. A telemetry handle shall retain an admitted incoming W3C tracestate through its sub-operation spans and child-process environments, using the existing SignCell trace-context provider. Creating a new Level 1 span shall preserve the trace ID, sampled bit and vendor state while retaining the current span as its parent; newly constructed contexts and traceparent headers shall zero reserved flag bits under W3C Trace Context Level 1 section 3.2.2.5.2. Received raw flag evidence shall remain unchanged. Environment injection shall preserve unrelated caller variables and shall not mutate the caller's object.
  - Positive: A valid incoming traceparent and tracestate survive multiple nested span and child-environment handoffs, with fresh span IDs and the same ordered vendor state.
  - Positive: An incoming traceparent ending in `81` remains `81` in the original carrier and parsed evidence, while the newly observing context, its retained telemetry records and child-process environment carry only the sampled bit `01`.
  - Alternate: An incoming traceparent with no admitted tracestate creates no vendor state, even when a caller supplies stale TRACESTATE in an environment used as an injection base.
  - Refusal: Invalid incoming tracestate remains discarded by the original provider; invalid traceparent starts a fresh trace and cannot carry the rejected parent's vendor state into it.
  - Scope: This repairs propagation at the effectful handle. Trace grammar and validation remain owned by SignCell; this change creates neither an alternative propagator nor synthetic vendor state.

- SV13. `recordCellEvent({ event })` shall record a preexisting native claim CloudEvent through SignCell's `cellEventMessage` and the existing `appendMessage` custody path. The handle supplies its actual channel, one observation from its clock and its current trace context; the store supplies the current causal frontier under its existing append lock. The returned frozen receipt shall be `{ address, traceId, eventId, eventSource, record }`, derived from the actual appended message and its retained event. It shall preserve the domain event's source, occurrence ID, optional time, complete claim payload, both witness lanes and explicit valuation. A receipt establishes stored observation custody, not truth, authorization or an additional witness.
  - Positive: A native claim with both for and against witnesses is encoded as a claim CloudEvent, observed twice at an equal clock, then forwarded by a second channel in the same trace. Three distinct outer message addresses retain the same original event ID and source; their actual append causes form one complete trace. The original `readTrace` and `exportTrace` paths retain all observations, and `cellEventOfMessage` with `cellFromCloudEvent` recovers the unchanged claim and both witness lanes.
  - Alternate: A claim with no witnesses and no domain event time remains unwitnessed and has no invented event time after recording. The handle's trace/span describe the observation, while any original event trace context remains part of the unchanged envelope. Later caller mutation cannot rewrite the retained event or receipt.
  - Refusal: A malformed or inconsistent claim envelope, missing event, or accessor in the supplied event refuses before record publication or head advancement. Over-bound records and unwritable stores propagate the existing store refusal without tail reduction, automatic retry, event replacement or a success receipt. Supplied event accessors are not invoked.
  - Providers and scope: SignCell owns the claim profile, payload admission and OTLP representation; SEAVT owns publication, causal frontier and complete-cut reading. The handle adds no store, exporter, domain-event deduplication policy, fabricated evidence or knowledge judgment. Receiving cases live in `test/telemetry-cell-events.test.mjs` and execute only against the selected, actually received SignCell package exporting `./cloud-events`.

- SV14. `appendMessage` and `recordCellEvent({event, expect})` shall forward an explicitly supplied expected frontier to the existing store's conditional `extend`. `null` requires an absent trace head; an array requires the existing normalized frontier set; omission retains ordinary new-observation behavior. `recordCellEvent` shall receive `expect` only as an own enumerable data property and refuse inherited/accessor-backed guards without invoking a getter. A mismatch shall refuse before storing another message or publishing a head. The message's cause list still comes from the actual guarded frontier, while the original event, both witness lanes and claim valuation remain unchanged.
  - Positive: record an original opposing-witness claim with `expect: null`, observe the persisted frontier, and record a later observation under that frontier. Both observations retain the exact original event and evidence and form the ordinary causal trace. The receiving case uses the selected SignCell provider's admitted RFC 3986 IPvFuture source; a malformed percent escape remains a refusal through that same owner and cannot move the journal head.
  - Refusal: repeat the absent-only attempt or reuse the prior frontier after a successor was recorded; both shall raise `HeadConflict`, leave records and head unchanged, and return no success receipt.
  - Limits: this is an explicit source-cut condition, not domain-event deduplication, an extra witness, a source-authenticity judgment or exactly-once business effects. Ordinary repeated and forwarded observations remain permitted without `expect`. Fresh-process, competing-writer and uncertain-publication receiving belongs to `test/store-conditional-extend.test.mjs` under the original store's lock and durability assumptions.
