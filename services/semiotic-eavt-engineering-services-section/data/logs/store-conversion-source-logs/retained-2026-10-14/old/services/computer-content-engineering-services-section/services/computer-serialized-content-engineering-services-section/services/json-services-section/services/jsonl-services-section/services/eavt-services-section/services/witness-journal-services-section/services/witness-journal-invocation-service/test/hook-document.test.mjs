import assert from "node:assert/strict";
import test from "node:test";

import { readEavtDocument, recordHookDocument } from "../src/record-hook-document.mjs";

const at = ["caller", "hook"];

test("hook document recording derives the invocation facts", () => {
  const source = [
    ["hook:1", "operations-manifold.script.action", "scripts.record-hook-document", at],
    ["hook:1", "operations-manifold.hook.event", "UserPromptSubmit", at],
  ].map(JSON.stringify).join("\n");
  const rows = readEavtDocument(recordHookDocument(source));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.result.recorded" && row[2] === true));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.operation.event" && row[2] === "record-hook-event"));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.operation.predicate" && row[2] === "operations-manifold.hook.userpromptsubmit"));
});

test("hook document recording reports a missing event as an obstruction", () => {
  const source = JSON.stringify(["hook:2", "operations-manifold.script.action", "scripts.record-hook-document", at]);
  const rows = readEavtDocument(recordHookDocument(source));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.script.obstruction" && row[2] === "missing-record-hook-event"));
  assert.ok(rows.some((row) => row[1] === "operations-manifold.result.admitted" && row[2] === false));
});

test("hook document recording is idempotent", () => {
  const source = [
    ["hook:3", "operations-manifold.script.action", "scripts.record-hook-document", at],
    ["hook:3", "codex.hook_event_name", "Stop", at],
  ].map(JSON.stringify).join("\n");
  const once = recordHookDocument(source);
  assert.equal(recordHookDocument(once), once);
});
