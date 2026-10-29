#!/usr/bin/env node
import { admit, defineType } from "@red-cup-engineering/computer-data-engine";
import { runJavascriptNodeOperation } from "../../../../../../../../../../computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/src/operation.mjs";

// CloudEvents 1.0.2 published JSON Schema, verbatim; sha256 e28a6d252d7b7238d176618f6bbf6cde570b26a867bc5241563aed34c9dd1d83.
const CLOUDEVENTS_SCHEMA = {"$schema":"http://json-schema.org/draft-07/schema#","description":"CloudEvents Specification JSON Schema","type":"object","properties":{"id":{"description":"Identifies the event.","$ref":"#/definitions/iddef","examples":["A234-1234-1234"]},"source":{"description":"Identifies the context in which an event happened.","$ref":"#/definitions/sourcedef","examples":["https://github.com/cloudevents","mailto:cncf-wg-serverless@lists.cncf.io","urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66","cloudevents/spec/pull/123","/sensors/tn-1234567/alerts","1-555-123-4567"]},"specversion":{"description":"The version of the CloudEvents specification which the event uses.","$ref":"#/definitions/specversiondef","examples":["1.0"]},"type":{"description":"Describes the type of event related to the originating occurrence.","$ref":"#/definitions/typedef","examples":["com.github.pull_request.opened","com.example.object.deleted.v2"]},"datacontenttype":{"description":"Content type of the data value. Must adhere to RFC 2046 format.","$ref":"#/definitions/datacontenttypedef","examples":["text/xml","application/json","image/png","multipart/form-data"]},"dataschema":{"description":"Identifies the schema that data adheres to.","$ref":"#/definitions/dataschemadef"},"subject":{"description":"Describes the subject of the event in the context of the event producer (identified by source).","$ref":"#/definitions/subjectdef","examples":["mynewfile.jpg"]},"time":{"description":"Timestamp of when the occurrence happened. Must adhere to RFC 3339.","$ref":"#/definitions/timedef","examples":["2018-04-05T17:31:00Z"]},"data":{"description":"The event payload.","$ref":"#/definitions/datadef","examples":["<much wow=\"xml\"/>"]},"data_base64":{"description":"Base64 encoded event payload. Must adhere to RFC4648.","$ref":"#/definitions/data_base64def","examples":["Zm9vYg=="]}},"required":["id","source","specversion","type"],"definitions":{"iddef":{"type":"string","minLength":1},"sourcedef":{"type":"string","format":"uri-reference","minLength":1},"specversiondef":{"type":"string","minLength":1},"typedef":{"type":"string","minLength":1},"datacontenttypedef":{"type":["string","null"],"minLength":1},"dataschemadef":{"type":["string","null"],"format":"uri","minLength":1},"subjectdef":{"type":["string","null"],"minLength":1},"timedef":{"type":["string","null"],"format":"date-time","minLength":1},"datadef":{"type":["object","string","number","array","boolean","null"]},"data_base64def":{"type":["string","null"],"contentEncoding":"base64"}}};
const cloudEventTypeDefinition = defineType({
  id: "cloudevents-1.0.2",
  name: "CloudEvent 1.0.2",
  description: "A CloudEvents 1.0.2 event satisfying its published JSON Schema.",
  schema: CLOUDEVENTS_SCHEMA,
  parents: [],
});
if (!cloudEventTypeDefinition.ok) throw new TypeError("CloudEvents 1.0.2 schema is not a valid supported JSON Schema document");
const CLOUDEVENT_TYPE = cloudEventTypeDefinition.value;
const CONTEXT = new Set(["specversion", "id", "source", "type", "datacontenttype", "dataschema", "subject", "time", "data", "data_base64"]);
const EXTENSION_NAME = /^[a-z0-9]{1,20}$/u;

/**
 * Validates one candidate CloudEvent against the CloudEvents 1.0.2 published schema and its three unstated rules.
 * @param {object} request A record carrying the candidate event.
 * @returns {object} A CloudEventValidation record.
 * @throws {TypeError} When the event is not an object.
 */
export function validateCloudEvent(request) {
  const event = request?.event;
  if (event === null || typeof event !== "object" || Array.isArray(event)) throw new TypeError("event is required");
  const admitted = admit(CLOUDEVENT_TYPE, event);
  const violations = admitted.ok ? [] : [...admitted.refusal.issues];
  if (event.specversion !== undefined && event.specversion !== "1.0") violations.push({ kind: "instance", path: "/specversion", keyword: "const", message: "must be exactly 1.0" });
  if (event.data !== undefined && event.data_base64 !== undefined) violations.push({ kind: "instance", path: "/data", keyword: "mutuallyExclusive", message: "data and data_base64 must not both be present" });
  for (const name of Object.keys(event)) {
    if (CONTEXT.has(name)) continue;
    if (!EXTENSION_NAME.test(name)) violations.push({ kind: "instance", path: `/${name}`, keyword: "extensionName", message: "extension attribute names are lowercase letters and digits, 1 to 20 characters" });
  }
  return { type: "CloudEventValidation", ok: violations.length === 0, violations, event };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "validate-cloudevent", description: "Validates one candidate CloudEvent against the CloudEvents 1.0.2 published schema and its three unstated rules.", operation: validateCloudEvent }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
