import assert from "node:assert/strict";
import test from "node:test";
import { admitHookEventWitness, normalizeHookEvent } from "../src/hook-event-witness.mjs";

test("normalizes a hook payload and admits one bounded operation witness", () => {
  const params = { harness: "claude-code", stdin: JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s1", cwd: "/repo", prompt: "Do work" }) };
  const hook = normalizeHookEvent(params);
  assert.equal(hook.trace, "claude.hook:s1");
  const result = admitHookEventWitness(params, { at: "2026-08-30T00:00:00.000Z" });
  assert.equal(result.admission.value.event, "record-hook-event");
  assert.equal(result.admission.value.object, "UserPromptSubmit");
  assert.deepEqual(result.admission.value.paths, ["/repo"]);
});
