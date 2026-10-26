const ATTRIBUTES = new Set(["operation-witness.recorded", "operations-manifold.operation.recorded"]);
const KINDS = new Set(["tool-use", "mcp-call", "command", "file-read", "file-write", "token-cost", "http-call", "record-hook-event", "note"]);

function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null; }
function text(value, fallback = null) { return typeof value === "string" && value.length > 0 ? value : fallback; }
function strings(value) { return Object.freeze(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []); }
function number(value, fallback = 0) { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback; }
function money(value) { return Math.round(number(value) * 1_000_000) / 1_000_000; }
function bounded(value, min, max, fallback) { const parsed = Number.parseInt(String(value ?? ""), 10); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback; }

function operationScore(value) {
  const evidence = strings(value.evidence).length;
  const base = value.event === "note" ? 4 : value.event === "token-cost" ? 8 : value.event === "file-write" ? 12 : 10;
  const score = base + (evidence === 0 ? -4 : Math.min(18, evidence * 4)) + (value.trace === "global" ? -2 : 5) + (number(value.tokens) > 0 || number(value.costUsd) > 0 ? 6 : 0) + (strings(value.paths).length > 0 ? 4 : 0);
  return Math.max(1, Math.min(40, score));
}

function entryFrom(row, log) {
  if (!Array.isArray(row) || row.length !== 4 || !ATTRIBUTES.has(row[1])) return null;
  const value = record(row[2]);
  if (value === null || text(value.eventId) === null || text(value.at) === null || text(value.trace) === null || text(value.subject) === null || text(value.predicate) === null || text(value.object) === null) return null;
  const event = KINDS.has(value.event) ? value.event : "tool-use";
  const budgetBand = ["ok", "watch", "over", "huge"].includes(value.budgetBand) ? value.budgetBand : "ok";
  return Object.freeze({
    kind: "operation-ledger.entry", id: String(row[0]), eventId: value.eventId, at: value.at, event, trace: value.trace,
    layer: value.layer === "saturated" || value.layer === "stable" ? value.layer : "asserted",
    nucleus: value.nucleus === "saturation" ? "saturation" : "translation",
    subject: value.subject, predicate: value.predicate, object: value.object,
    valueOld: text(value.valueOld, "bot|bot"), valueNew: text(value.valueNew, "t|t"), tool: text(value.tool),
    paths: strings(value.paths), tokens: number(value.tokens), estimatedTokens: number(value.estimatedTokens), inputBytes: number(value.inputBytes), outputBytes: number(value.outputBytes), totalBytes: number(value.inputBytes) + number(value.outputBytes),
    budgetLimitTokens: number(value.budgetLimitTokens, 12_000), budgetBand, budgetWarnings: strings(value.budgetWarnings), costUsd: money(value.costUsd), durationMs: value.durationMs === undefined ? null : number(value.durationMs), agent: text(value.agent), source: text(value.source, "operation-witness-admission-service"),
    evidence: Object.freeze([`${log}#${value.eventId}`, ...strings(value.evidence)]), note: text(value.note), score: operationScore({ ...value, event }),
  });
}

function grouped(entries, keyOf) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyOf(entry); const current = groups.get(key) ?? { count: 0, tokens: 0, costUsd: 0 };
    current.count += 1; current.tokens += entry.tokens; current.costUsd += entry.costUsd; groups.set(key, current);
  }
  return Object.freeze([...groups].map(([key, value]) => Object.freeze({ key, count: value.count, tokens: value.tokens, costUsd: money(value.costUsd) })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 24));
}

function totals(entries) {
  return Object.freeze({
    entries: entries.length, tokens: entries.reduce((n, item) => n + item.tokens, 0), estimatedTokens: entries.reduce((n, item) => n + item.estimatedTokens, 0), inputBytes: entries.reduce((n, item) => n + item.inputBytes, 0), outputBytes: entries.reduce((n, item) => n + item.outputBytes, 0),
    overBudgetEntries: entries.filter(({ budgetBand }) => budgetBand === "over" || budgetBand === "huge").length, hugeEntries: entries.filter(({ budgetBand }) => budgetBand === "huge").length, costUsd: money(entries.reduce((n, item) => n + item.costUsd, 0)),
    tools: entries.filter(({ event }) => event === "tool-use").length, fileReads: entries.filter(({ event }) => event === "file-read").length, fileWrites: entries.filter(({ event }) => event === "file-write").length, commands: entries.filter(({ event }) => event === "command").length, mcpCalls: entries.filter(({ event }) => event === "mcp-call").length, httpCalls: entries.filter(({ event }) => event === "http-call").length, hookEvents: entries.filter(({ event }) => event === "record-hook-event").length,
  });
}

function game(entries, sum) {
  const experience = entries.reduce((n, item) => n + item.score, 0), level = Math.max(1, Math.floor(Math.sqrt(experience / 24)) + 1);
  const evidenceBearing = entries.filter(({ evidence }) => evidence.length > 1).length;
  const missingEvidence = entries.filter(({ evidence, event }) => evidence.length <= 1 && event !== "note").length;
  const recent = entries.slice(0, 8), average = recent.length === 0 ? 0 : recent.reduce((n, item) => n + item.score, 0) / recent.length;
  return Object.freeze({ kind: "operation-ledger.game", experience, level, mode: sum.entries === 0 ? "paidia" : missingEvidence > evidenceBearing ? "mimicry" : sum.tools + sum.mcpCalls > sum.fileReads + sum.fileWrites ? "agon" : "ludus", flow: average === 0 ? "bored" : average > 95 ? "strained" : average >= 58 ? "flow" : "bored", badges: Object.freeze([...(sum.entries ? ["first-filing"] : []), ...(sum.tools + sum.mcpCalls >= 5 ? ["tool-ledger"] : []), ...(sum.fileReads + sum.fileWrites >= 5 ? ["file-sensor"] : []), ...(sum.tokens ? ["token-bookkeeper"] : []), ...(sum.costUsd ? ["cost-visible"] : [])]), friction: Object.freeze([...(missingEvidence ? [`${missingEvidence} operation(s) only cite their own log witness`] : []), ...(sum.overBudgetEntries ? [`${sum.overBudgetEntries} operation(s) exceed context budget`] : [])]), challenges: Object.freeze([...(sum.fileReads === 0 ? ["Book a file-read event with path evidence."] : []), ...(sum.fileWrites === 0 ? ["Book the next file-write event with its path."] : []), ...(sum.mcpCalls === 0 ? ["Book the next MCP call."] : [])]) });
}

/** Fold supplied EAVT rows; no journal is read or written. */
export function foldOperationWitnessEvents(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array");
  const generatedAt = text(options.generatedAt) ?? new Date().toISOString();
  const log = text(options.log, "sites/bare-cedar-fog.561.group/data/logs/operations.jsonl"), state = text(options.state, "sites/bare-cedar-fog.561.group/data/state/operations.json");
  const entries = Object.freeze(events.map((row) => entryFrom(row, log)).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at)));
  const sum = totals(entries);
  return Object.freeze({ kind: "operation-ledger.snapshot", generatedAt, log, state, cycle: Object.freeze(["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"]), eventCount: events.length, totals: sum, byPredicate: grouped(entries, (entry) => entry.predicate), byTrace: grouped(entries, (entry) => entry.trace), byTool: grouped(entries.filter(({ tool }) => tool !== null), (entry) => entry.tool), entries, game: game(entries, sum) });
}

export function summarizeOperationLedger(snapshot) {
  const { entries, ...rest } = snapshot;
  return Object.freeze({ ...rest, kind: "operation-ledger.snapshot-summary", entryCount: entries.length });
}

function entrySummary(entry) { const { valueOld, valueNew, evidence, ...visible } = entry; return Object.freeze({ ...visible, kind: "operation-ledger.entry-summary", subject: entry.subject.slice(0, 600), object: entry.object.slice(0, 600), paths: Object.freeze(entry.paths.slice(0, 12)), note: entry.note?.slice(0, 600) ?? null, valueOldBytes: valueOld.length, valueNewBytes: valueNew.length, evidenceCount: evidence.length }); }

export function projectOperationLedger(snapshot, params = {}) {
  if (params.detail === "full") return snapshot;
  if (["entries", "page"].includes(params.detail) || params.limit !== undefined || params.offset !== undefined || params.focus !== undefined) {
    const focus = text(params.focus), offset = bounded(params.offset, 0, Number.MAX_SAFE_INTEGER, 0), limit = bounded(params.limit, 1, 100, 25);
    const filtered = focus === null ? snapshot.entries : snapshot.entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(focus.toLowerCase()));
    const entries = Object.freeze(filtered.slice(offset, offset + limit).map(entrySummary));
    return Object.freeze({ kind: "operation-ledger.snapshot-page", summary: summarizeOperationLedger(snapshot), focus, offset, limit, entryCount: filtered.length, returned: entries.length, entries });
  }
  return summarizeOperationLedger(snapshot);
}
