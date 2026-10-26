import { admitOperationWitness } from "./operation-witness.mjs";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const identities = Object.freeze({
  claude: Object.freeze({ harness: "claude", agent: "claude", tracePrefix: "claude.hook" }),
  codex: Object.freeze({ harness: "codex", agent: "codex", tracePrefix: "codex.hook" }),
  agent: Object.freeze({ harness: "agent", agent: "agent", tracePrefix: "agent.hook" }),
});

function text(value) { return typeof value === "string" && value.trim() !== "" ? value.trim() : null; }
function harnessKind(value) { const normalized = text(value)?.toLowerCase(); if (["claude", "claude-code", "claudecode"].includes(normalized)) return "claude"; if (["codex", "openai-codex", "openai"].includes(normalized)) return "codex"; return normalized === "agent" ? "agent" : null; }
function identity(params, payload) { return identities[harnessKind(params.harness) ?? harnessKind(payload.harness) ?? harnessKind(payload.source) ?? "codex"]; }
function digest(value) { return sha256Hex(typeof value === "string" ? value : JSON.stringify(value)); }
function jsonBytes(value) { return Buffer.byteLength(JSON.stringify(value), "utf8"); }
function compactText(value, max) { return value.length <= max ? value : Object.freeze({ kind: "hook.text-summary", chars: value.length, bytes: Buffer.byteLength(value), sha256Prefix: digest(value).slice(0, 16), preview: value.slice(0, max - 1) }); }
function compactPayload(payload) { const scalars = Object.fromEntries(Object.entries(payload).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)).slice(0, 24).map(([key, value]) => [key, typeof value === "string" ? compactText(value, 480) : value])); return Object.freeze({ kind: "hook.payload-summary", keys: Object.keys(payload).sort(), bytes: jsonBytes(payload), estimatedTokens: Math.ceil(jsonBytes(payload) / 4), sha256Prefix: digest(payload).slice(0, 16), scalars: Object.freeze(scalars) }); }

/** Normalize explicit hook input without acquiring environment or filesystem state. */
export function normalizeHookEvent(params = {}) {
  let payload;
  const raw = params.payload ?? params.stdin;
  if (raw !== undefined && raw !== null && typeof raw === "object" && !Array.isArray(raw)) payload = raw;
  else if (text(raw) !== null) { try { const parsed = JSON.parse(text(raw)); payload = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { text: text(raw) }; } catch { payload = { text: text(raw) }; } }
  else payload = Object.fromEntries(Object.entries({ hook_event_name: params.hook_event_name ?? params.event, session_id: params.session_id, transcript_path: params.transcript_path, cwd: params.cwd }).filter(([, value]) => value !== undefined));
  const harness = identity(params, payload);
  const hookEventName = text(payload.hook_event_name) ?? text(params.hook_event_name ?? params.event) ?? "HookEvent";
  const session = text(payload.session_id ?? payload.session ?? params.session_id) ?? "unknown-session";
  const transcriptPath = text(payload.transcript_path ?? params.transcript_path);
  const cwd = text(payload.cwd ?? params.cwd);
  const paths = Object.freeze([...(transcriptPath === null ? [] : [transcriptPath]), ...(cwd === null ? [] : [cwd])]);
  const inputBytes = jsonBytes(payload);
  return Object.freeze({ kind: "hook.event", payload: Object.freeze({ ...payload }), hookEventName, session, transcriptPath, cwd, paths, harness: harness.harness, agent: harness.agent, trace: `${harness.tracePrefix}:${session}`, inputBytes, estimatedTokens: Math.ceil(inputBytes / 4), compactPayload: compactPayload(payload) });
}

/** Transform one normalized hook event into one operation-witness admission. */
export function admitHookEventWitness(params, options = {}) {
  const hook = normalizeHookEvent(params);
  const note = JSON.stringify(Object.freeze({ hook_event_name: hook.hookEventName, session_id: hook.session, ...(hook.transcriptPath === null ? {} : { transcript_path: hook.transcriptPath }), ...(hook.cwd === null ? {} : { cwd: hook.cwd }), payload: hook.compactPayload }));
  const admission = admitOperationWitness({ kind: "record-hook-event", trace: hook.trace, subject: `${hook.harness}.session:${hook.session}`, predicate: "operation.received-hook-event", object: hook.hookEventName, tool: `${hook.harness}.hook.${hook.hookEventName}`, paths: hook.paths, estimatedTokens: hook.estimatedTokens, inputBytes: hook.inputBytes, agent: hook.agent, source: text(params.source) ?? `${hook.harness}.hook`, evidence: hook.paths, note }, options);
  return Object.freeze({ kind: "hook-event-witness.admission", hook, admission });
}
