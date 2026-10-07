// verb-refusal-schema — the uniform refusal envelope every verb server reply carries on error:
// {id, ok: false, error: <message>}, so every verb's own declared refusal schema is this one
// shape. Lives on its own (not inside scripts/serve-verbs-over-stdio.mjs, the executable server
// entry) so a verbs module can import it without a circular dependency back onto the very script
// that will dynamically import that verbs module at runtime.
export const REFUSAL_SCHEMA = Object.freeze({
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
});
