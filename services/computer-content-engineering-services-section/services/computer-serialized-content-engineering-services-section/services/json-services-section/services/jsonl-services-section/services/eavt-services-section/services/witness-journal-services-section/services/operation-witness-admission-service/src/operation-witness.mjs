import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const OPERATION_KINDS = new Set(["tool-use", "mcp-call", "command", "file-read", "file-write", "token-cost", "http-call", "record-hook-event", "note"]);

export function admitOperationWitness(params, options = {}) {
  const at = requiredText(options.at ?? params.at, "at");
  const event = operationKind(params.kind);
  const paths = textList(params.paths);
  const tool = optionalText(params.tool);
  const trace = optionalText(params.trace) ?? defaultTrace(event);
  const subject = optionalText(params.subject) ?? defaultSubject(event, tool);
  const predicate = optionalText(params.predicate) ?? predicateFor(event);
  const object = optionalText(params.object) ?? defaultObject(event, tool, paths, params.tokens);
  const inputBytes = nonNegativeNumber(params.inputBytes);
  const outputBytes = nonNegativeNumber(params.outputBytes);
  const estimatedTokens = optionalNonNegativeNumber(params.estimatedTokens) ?? estimateTokensFromBytes(inputBytes + outputBytes);
  const budgetLimitTokens = optionalNonNegativeNumber(params.budgetLimitTokens) ?? 12_000;
  const budgetBand = budgetBandFor(estimatedTokens, budgetLimitTokens);
  const costUsd = roundMoney(nonNegativeNumber(params.costUsd));
  const source = optionalText(params.source) ?? "operation-witness-admission-service";
  const seed = { at, event, trace, subject, predicate, object, paths, tool, tokens: nonNegativeNumber(params.tokens), costUsd, source };
  const eventId = `operation-event:${hash(seed).slice(0, 24)}`;
  const value = Object.freeze({
    kind: "operation-witness.event",
    eventId, at, event, trace,
    layer: operationLayer(params.layer),
    nucleus: operationNucleus(params.nucleus),
    subject, predicate, object,
    valueOld: optionalText(params.valueOld) ?? "bot|bot",
    valueNew: optionalText(params.valueNew) ?? "t|t",
    ...(tool === null ? {} : { tool }),
    paths,
    tokens: nonNegativeNumber(params.tokens),
    estimatedTokens,
    inputBytes,
    outputBytes,
    budgetLimitTokens,
    budgetBand,
    budgetWarnings: budgetWarningsFor(budgetBand, estimatedTokens, budgetLimitTokens, inputBytes, outputBytes),
    costUsd,
    ...(optionalNonNegativeNumber(params.durationMs) === null ? {} : { durationMs: optionalNonNegativeNumber(params.durationMs) }),
    ...(optionalText(params.agent) === null ? {} : { agent: optionalText(params.agent) }),
    source,
    evidence: textList(params.evidence),
    ...(optionalText(params.note) === null ? {} : { note: budgetedNote(optionalText(params.note)) }),
  });
  const entryId = `operation:${slug(`${event}-${predicate}-${object}`)}:${hash({ eventId }).slice(0, 12)}`;
  return Object.freeze({
    kind: "operation-witness.admission",
    accepted: true,
    entryId,
    value,
    event: Object.freeze([entryId, "operation-witness.recorded", value, Object.freeze({ at, eventId })]),
  });
}

export function operationKind(value) { return typeof value === "string" && OPERATION_KINDS.has(value) ? value : "tool-use"; }
export function operationLayer(value) { return value === "saturated" || value === "stable" ? value : "asserted"; }
export function operationNucleus(value) { return value === "saturation" ? "saturation" : "translation"; }

export function classifyCommand(command) {
  const trimmed = requiredText(command, "command");
  if (/^(cat|sed|awk|grep|rg|find|ls|head|tail|nl|wc|git\s+(show|diff|status|log|ls-files)|node\s+--input-type=module\s+-e)/u.test(trimmed)) return "file-read";
  if (/\b(apply_patch|tee|sed\s+-i|git\s+(add|commit|push|mv|rm)|npm\s+(install|add)|pnpm\s+(install|add)|writeFile|appendFile)\b|>{1,2}/u.test(trimmed)) return "file-write";
  return "command";
}

export function extractCommandPaths(command) {
  const matches = String(command).match(/(?:^|\s|["'`])((?:sites\/|lib\/|apps\/|services\/|dev\/|scripts\/|operations\/|\.gitmodules|AGENTS\.md|package\.json|pnpm-lock\.yaml)[A-Za-z0-9._~/%:@+-]*)/gu) ?? [];
  return Object.freeze([...new Set(matches.map((match) => match.trim().replace(/^["'`]/u, "").replace(/["'`,;:]$/u, "")))].slice(0, 24));
}

function predicateFor(kind) {
  return ({
    "file-read": "operation.read-file", "file-write": "operation.wrote-file", "token-cost": "operation.spent-tokens",
    "mcp-call": "operation.called-mcp", command: "operation.ran-command", "http-call": "operation.called-http",
    "record-hook-event": "operation.received-record-hook-event", note: "operation.noted", "tool-use": "operation.used-tool",
  })[kind];
}
function defaultTrace(kind) {
  if (kind === "file-read" || kind === "file-write") return "execution:file-system";
  if (kind === "token-cost") return "execution:llm";
  if (kind === "mcp-call") return "execution:mcp";
  if (kind === "record-hook-event") return "execution:hook";
  return "execution:tool";
}
function defaultSubject(kind, tool) {
  if (tool !== null) return `tool:${tool}`;
  if (kind === "token-cost") return "agent:llm-session";
  if (kind === "record-hook-event") return "agent:codex-hook";
  return "agent:codex";
}
function defaultObject(kind, tool, paths, tokens) {
  if (kind === "token-cost") return `${nonNegativeNumber(tokens)} tokens`;
  if (paths.length > 0) return paths.join(", ");
  return tool ?? kind;
}
function budgetBandFor(estimated, limit) {
  if (limit <= 0) return "ok";
  if (estimated > limit * 2) return "huge";
  if (estimated > limit) return "over";
  if (estimated > limit * 0.6) return "watch";
  return "ok";
}
function budgetWarningsFor(band, estimated, limit, input, output) {
  return Object.freeze([
    ...(band === "watch" ? [`context estimate ${estimated} tokens is approaching budget ${limit}`] : []),
    ...(band === "over" ? [`context estimate ${estimated} tokens exceeds budget ${limit}`] : []),
    ...(band === "huge" ? [`context estimate ${estimated} tokens is more than double budget ${limit}`] : []),
    ...(output > 0 && output >= input * 4 ? [`output bytes ${output} dominate input bytes ${input}`] : []),
  ]);
}
function budgetedNote(value) {
  if (Buffer.byteLength(value, "utf8") <= 4096) return value;
  return JSON.stringify(Object.freeze({ kind: "context.large-string-summary", bytes: Buffer.byteLength(value, "utf8"), estimatedTokens: estimateTokensFromBytes(Buffer.byteLength(value, "utf8")), sha256: hash(value), preview: value.slice(0, 320) }));
}
function estimateTokensFromBytes(bytes) { return bytes === 0 ? 0 : Math.ceil(bytes / 4); }
function nonNegativeNumber(value) { const number = Number(value ?? 0); return Number.isFinite(number) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, number)) : 0; }
function optionalNonNegativeNumber(value) { return value === undefined || value === null || String(value).trim() === "" ? null : nonNegativeNumber(value); }
function roundMoney(value) { return Math.round(value * 1_000_000) / 1_000_000; }
function textList(value) { const list = typeof value === "string" ? [value] : Array.isArray(value) ? value : []; return Object.freeze(list.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)); }
function optionalText(value) { if (typeof value !== "string") return null; const text = value.trim(); return text === "" ? null : text; }
function requiredText(value, name) { const text = optionalText(value); if (text === null) throw new TypeError(`${name} must be a nonempty string`); return text; }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "operation"; }
function hash(value) { return sha256Hex(typeof value === "string" ? value : JSON.stringify(value)); }
