import assert from "node:assert/strict";
import test from "node:test";
import { validateSchemaInstance } from "../../../../json-schema-services-section/scripts/validate-schema-instance.mjs";
import * as normalize from "../scripts/normalize-row.mjs";
import * as state from "../scripts/latest-state.mjs";
import * as window from "../scripts/situation-window.mjs";
import * as path from "../scripts/journal-path.mjs";

test("declared carriers admit the inputs and actual results of core EAVT operations", () => {
  const row = { e: "subject", a: "attribute", v: 3, t: 1 };
  const examples = [
    [normalize, normalize.normalizeEavtRow, [row.e, row.a, row.v, row.t]],
    [state, state.latestState, { entries: [row] }],
    [window, window.situationWindow, { entries: [row], since: 1 }],
    [
      path,
      path.journalPath,
      { root: "/tmp/journal", feed: "witnesses", at: "2026-09-20" },
    ],
  ];
  for (const [module, operation, input] of examples) {
    assert.deepEqual(
      validateSchemaInstance({ instance: input, schema: module.inputSchema }),
      { ok: true, errors: [] },
      operation.name + " input",
    );
    assert.deepEqual(
      validateSchemaInstance({
        instance: operation(input),
        schema: module.outputSchema,
      }),
      { ok: true, errors: [] },
      operation.name + " output",
    );
  }
  assert.equal(
    validateSchemaInstance({
      instance: { entries: [] },
      schema: state.inputSchema,
    }).ok,
    true,
  );
  assert.equal(
    validateSchemaInstance({
      instance: { entries: [], unrelated: true },
      schema: state.inputSchema,
    }).ok,
    false,
  );
});
