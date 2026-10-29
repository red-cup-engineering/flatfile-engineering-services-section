import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderJsonSchemaModule } from "@red-cup-engineering/javascript-node-code-fabrication-services-section/transform-json-schema-to-typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaFiles = ["charge-value-name.schema.json", "semantic-reference.schema.json", "semantic-cell.schema.json", "semantic-claim.schema.json", "semantic-graph.schema.json"];
const entries = await Promise.all(schemaFiles.map(async (file) => {
  const schema = JSON.parse(await readFile(resolve(root, "specifications", file), "utf8"));
  const codegen = schema["x-codegen"];
  if (!codegen || typeof codegen.exportName !== "string" || typeof codegen.typeName !== "string" || typeof codegen.runtimeName !== "string") throw new TypeError(`${file} needs x-codegen names`);
  return { schema, ...codegen };
}));
const binding = { name: "defineSchemaType", from: "../schema-type.mjs", genericSchema: true };
const outputs = new Map([
  [resolve(root, "src/generated/semantic-carriers.mjs"), renderJsonSchemaModule(entries, { format: "javascript", runtimeBinding: binding }) + "\n"],
  [resolve(root, "src/generated/semantic-carriers.d.mts"), renderJsonSchemaModule(entries, { format: "declaration", runtimeBinding: binding }) + "\n"],
]);
const check = process.argv.includes("--check");
for (const [file, rendered] of outputs) {
  let current;
  try { current = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (check) { if (current !== rendered) throw new Error(`${file} is not generated from semantic carrier schemas`); }
  else if (current !== rendered) await writeFile(file, rendered);
}
