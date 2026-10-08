import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../scripts/canonical-json.mjs";
import { formCloudEvent } from "../scripts/form-cloudevent.mjs";
import { parseJson } from "../scripts/parse-json.mjs";
import { projectJsonRecordKeys } from "../scripts/project-json-record-keys.mjs";
import { validateCloudEvent } from "../scripts/validate-cloudevent.mjs";
import { isJsonText } from "../scripts/is-json-text.mjs";
import { writeJsonText } from "../scripts/write-json-text.mjs";

test("JSON scripts retain parsing, canonicalization, and key projection", () => {
  assert.deepEqual(parseJson({ text: '{"a":1}' }), {
    ok: true,
    value: { a: 1 },
  });
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.deepEqual(
    projectJsonRecordKeys({ record: { a: 1, b: 2 }, keys: ["b"] }),
    { b: 2 },
  );
});

test("direct JSON text effects replace the retired resource descriptor", () => {
  assert.equal(isJsonText('{"a":1}'), true);
  assert.equal(isJsonText("not JSON"), false);
  assert.equal(writeJsonText([{ b: 2, a: 1 }]), '{"a":1,"b":2}\n');
  assert.equal(writeJsonText([]), "");
});

test("CloudEvent scripts form and validate an event through JSON-line command boundaries", () => {
  const event = formCloudEvent({
    id: "a-1",
    source: "urn:example:source",
    type: "example.made",
    data: { a: 1 },
  });
  assert.equal(validateCloudEvent({ event }).ok, true);
  const command = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../scripts/validate-cloudevent.mjs", import.meta.url),
      ),
    ],
    {
      input: `${JSON.stringify({ event })}\n`,
      encoding: "utf8",
    },
  );
  assert.equal(command.status, 0, command.stderr);
  assert.deepEqual(JSON.parse(command.stdout), validateCloudEvent({ event }));
});


test("canonical command returns the exact serialized value without an embedded newline", () => {
  const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/canonical-json.mjs", import.meta.url))], {input:'{"z":2,"a":1}\n',encoding:"utf8"});
  assert.equal(command.status,0,command.stderr);
  assert.equal(JSON.parse(command.stdout),'{"a":1,"z":2}');
});
