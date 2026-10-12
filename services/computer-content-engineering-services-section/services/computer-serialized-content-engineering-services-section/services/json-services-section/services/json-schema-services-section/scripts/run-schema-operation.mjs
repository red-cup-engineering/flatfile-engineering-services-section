#!/usr/bin/env node
// One runner for every schema operation's stdin-JSON-in/stdout-JSON-out CLI boundary, replacing
// nineteen near-identical run-<name>.mjs tails (one dispatch table is one implementation of that
// shared capability, not nineteen copies of it). Each operation stays its own pure function in its
// own module; this file only reads stdin, dispatches by name, and writes stdout.
//
//   node run-schema-operation.mjs <operation-name>   < request.json
//   node run-schema-operation.mjs                    (operation name taken from the invoked bin's
//                                                      own basename, e.g. a package.json "bin"
//                                                      entry named after the operation)
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { admitSchemaAssertion } from "./admit-schema-assertion.mjs";
import { admitSchema } from "./admit-schema.mjs";
import { assertSchema } from "./assert-schema.mjs";
import { censusSchemaArtifacts } from "./census-schema-artifacts.mjs";
import { cohereSchemaAssertions } from "./cohere-schema-assertions.mjs";
import { foldSchemaAssertions } from "./fold-schema-assertions.mjs";
import { identifySchemaAssertion } from "./identify-schema-assertion.mjs";
import { inspectSchemaCorpus } from "./inspect-schema-corpus.mjs";
import { mergeSchemaAssertions } from "./merge-schema-assertions.mjs";
import { parseSchemaAssertions } from "./parse-schema-assertions.mjs";
import { projectSchemaAssertions } from "./project-schema-assertions.mjs";
import { resolveSchemaPointer } from "./resolve-schema-pointer.mjs";
import { resolveSchemaReference } from "./resolve-schema-reference.mjs";
import { schemaAssertionEavt } from "./schema-assertion-eavt.mjs";
import { schemaAssertionTriple } from "./schema-assertion-triple.mjs";
import { schemaChildren } from "./schema-children.mjs";
import { serializeSchemaAssertions } from "./serialize-schema-assertions.mjs";
import { unfoldSchema } from "./unfold-schema.mjs";
import { validateSchemaInstance } from "./validate-schema-instance.mjs";
import { checkSchema, evaluateSchemaInstance } from "../src/schema-evaluation.mjs";

/** Every schema operation this runner dispatches, keyed by the same name its own module's basename, its package.json export subpath, and its package.json "bin" entry all share. */
export const operations = Object.freeze({
  "admit-schema-assertion": admitSchemaAssertion,
  "admit-schema": admitSchema,
  "assert-schema": assertSchema,
  "census-schema-artifacts": censusSchemaArtifacts,
  "cohere-schema-assertions": cohereSchemaAssertions,
  "fold-schema-assertions": foldSchemaAssertions,
  "identify-schema-assertion": identifySchemaAssertion,
  "inspect-schema-corpus": inspectSchemaCorpus,
  "merge-schema-assertions": mergeSchemaAssertions,
  "parse-schema-assertions": parseSchemaAssertions,
  "project-schema-assertions": projectSchemaAssertions,
  "resolve-schema-pointer": resolveSchemaPointer,
  "resolve-schema-reference": resolveSchemaReference,
  "schema-assertion-eavt": schemaAssertionEavt,
  "schema-assertion-triple": schemaAssertionTriple,
  "schema-children": schemaChildren,
  "serialize-schema-assertions": serializeSchemaAssertions,
  "unfold-schema": unfoldSchema,
  "validate-schema-instance": validateSchemaInstance,
  "check-json-schema": checkSchema,
  "evaluate-json-schema": evaluateSchemaInstance,
});

export const schemaOperationNames = Object.freeze(Object.keys(operations));

/** Invoke one named schema operation with its already-parsed JSON request. */
export async function runSchemaOperation(name, request) {
  if (typeof name !== "string" || !(name in operations)) throw new TypeError(`unknown schema operation ${name}`);
  return operations[name](request);
}

if (import.meta.main) {
  const name = process.argv[2] ?? basename(process.argv[1]).replace(/\.mjs$/u, "");
  process.stdout.write(`${JSON.stringify(await runSchemaOperation(name, JSON.parse(readFileSync(0, "utf8"))))}\n`);
}
