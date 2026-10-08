// The seven operation-kinds a witness can be tagged with: observation,
// guard, accounting, query, mutation, analysis, learning. observation
// records what happened; guard produces an admissibility value without
// performing the action; accounting updates a ledger predication; query
// is read-only and witness-free in well-disciplined code; mutation
// transforms substrate state and is the default for unknown operators;
// analysis is a composed query producing aggregate output; learning is
// self-modification of the substrate's own closure-rule system.
export const OPERATION_KINDS = Object.freeze([
  "observation",
  "guard",
  "accounting",
  "query",
  "mutation",
  "analysis",
  "learning",
]);

// Operator -> kind registry. Every operator FARS emits a witness for is
// named here.
export const OPERATOR_KIND = Object.freeze({
  commit: "observation",
  tick: "observation",
  wavefront_layer: "observation",
  wavefront_quiesced: "observation",
  wavefront_fuel_exhausted: "observation",
  wavefront_h1_obstruction: "observation",
  federation_envelope_emitted: "observation",
  federation_envelope_admitted: "observation",
  federation_envelope_deduplicated: "observation",
  federation_envelope_rejected: "observation",
  session: "observation",
  dispatch: "guard",
  command_ship: "mutation",
  receive_message: "mutation",
  set_fm_field: "mutation",
  fm_set: "mutation",
  fm_add: "mutation",
  fm_remove: "mutation",
  insert_fm_item: "mutation",
  insert_flatfile: "mutation",
  insertion: "mutation",
  remove_fm_item: "mutation",
  remove_fm_key: "mutation",
  delete_flatfile: "mutation",
  retraction: "mutation",
  move_flatfile: "mutation",
  rename_fm_key: "mutation",
  rewrite_body_link: "mutation",
  relocation: "mutation",
  federation_cell_merged: "mutation",
  diagnose: "learning",
  lesson: "learning",
  closure_rule_extend: "learning",
  closure_rule_replace: "learning",
  closure_rule_retract: "learning",
  promote_observation_to_instinct: "learning",
  promote_instinct_to_skill: "learning",
  promote_skill_to_tool: "learning",
  promote_idea_to_plan: "learning",
  promote_rejected: "learning",
  claude_session_start: "observation",
  claude_user_prompt: "observation",
  claude_tool_use: "guard",
  claude_tool_result: "observation",
  claude_stop: "observation",
  governance_secret_match: "guard",
});

// Channel -> kind fallback, consulted only when the operator itself is
// unregistered. Lets a new operator that follows the channel discipline
// classify correctly before it is individually registered above.
export const CHANNEL_KIND = Object.freeze({
  learning: "learning",
  heartbeat: "observation",
  session: "observation",
  substrate: "mutation",
  command: "mutation",
  dispatch: "guard",
  governance: "guard",
  ledger: "accounting",
  audit: "analysis",
});

function ownKind(registry, key) {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
}

// Resolve a witness's operation kind from its operator + channel: registry
// lookup on operator first, channel fallback second, "mutation" otherwise
// — the conservative default, since a wrong "mutation" tag fails loud
// (mutations carry the strictest audit shape) while a wrong "query" tag
// would silently understate cost and audit coverage.
export function classify(operator, channel = null) {
  const byOperator = ownKind(OPERATOR_KIND, operator);
  if (byOperator !== undefined) return byOperator;
  const byChannel = ownKind(CHANNEL_KIND, channel);
  if (byChannel !== undefined) return byChannel;
  return "mutation";
}

export function isValidKind(value) {
  return OPERATION_KINDS.includes(value);
}


