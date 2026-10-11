import { registerSchema, unregisterSchema, validate, getAllRegisteredSchemaUris, setMetaSchemaOutputFormat, setShouldValidateFormat } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-2019-09";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema/draft-06";
import "@hyperjump/json-schema/draft-04";
import "@hyperjump/json-schema/formats";
import { removeUriSchemePlugin } from "@hyperjump/browser";
import { requireJsonValue } from "@red-cup-engineering/json-services-section/require-json-value";

// This receiver operates over the caller's explicit corpus, never ambient HTTP or files.
for (const scheme of ["http", "https", "file"]) removeUriSchemePlugin(scheme);
setMetaSchemaOutputFormat("BASIC");

const dialects = {
  "2020-12": "https://json-schema.org/draft/2020-12/schema",
  "2019-09": "https://json-schema.org/draft/2019-09/schema",
  "7": "http://json-schema.org/draft-07/schema#",
  "6": "http://json-schema.org/draft-06/schema#",
  "4": "http://json-schema.org/draft-04/schema#",
};
const MAXIMUM_BYTES = 65536;
const MAXIMUM_ERRORS = 64;
let compilation = Promise.resolve();

function boundedJson(body) {
  const pending = [[body, 0]];
  let nodes = 0;
  while (pending.length) {
    const [value, depth] = pending.pop();
    if (++nodes > 8192 || depth > 64) throw new RangeError("request exceeds 8192 JSON nodes or depth 64");
    if (value !== null && typeof value === "object") for (const child of Object.values(value)) pending.push([child, depth + 1]);
  }
  requireJsonValue(body, "schema evaluation request");
  if (new TextEncoder().encode(JSON.stringify(body)).length > MAXIMUM_BYTES) throw new RangeError(`request exceeds ${MAXIMUM_BYTES} JSON bytes`);
}

/** Envelope admission only: invalid schemas and instances are useful paid diagnostics. */
export function admitSchemaEvaluation(body, { instance = false } = {}) {
  const allowed = ["schema", "schemas", "dialect", "baseUri", "assertFormats", ...(instance ? ["value"] : [])];
  if (!body || typeof body !== "object" || Array.isArray(body) || !Object.hasOwn(body, "schema") || (instance && !Object.hasOwn(body, "value")) || Object.keys(body).some(key => !allowed.includes(key))) throw new TypeError(`request requires schema${instance ? " and value" : ""}`);
  boundedJson(body);
  if (typeof body.schema !== "boolean" && (body.schema === null || typeof body.schema !== "object" || Array.isArray(body.schema))) throw new TypeError("schema must be an object or boolean");
  if (body.dialect !== undefined && (typeof body.dialect !== "string" || !Object.hasOwn(dialects, body.dialect))) throw new TypeError("dialect must be 4, 6, 7, 2019-09 or 2020-12");
  if (body.assertFormats !== undefined && typeof body.assertFormats !== "boolean") throw new TypeError("assertFormats must be boolean");
  if (body.baseUri !== undefined) {
    if (typeof body.baseUri !== "string" || body.baseUri.length > 2048) throw new TypeError("baseUri must be a bounded absolute URI");
    const url = new URL(body.baseUri);
    if (!["http:", "https:", "urn:"].includes(url.protocol) || url.hash || url.username || url.password) throw new TypeError("baseUri must be an absolute HTTP(S) or URN document identifier without credentials or fragment");
  }
  if (body.schemas !== undefined && (!Array.isArray(body.schemas) || body.schemas.length > 16 || body.schemas.some(schema => !schema || typeof schema !== "object" || Array.isArray(schema) || typeof (schema.$id ?? schema.id) !== "string"))) throw new TypeError("schemas must contain at most 16 identified schema objects");
  return body;
}

export function admitInstanceEvaluation(body) { return admitSchemaEvaluation(body, { instance: true }); }

function output(result) {
  const errors = result.errors ?? [];
  return { valid: result.valid, errors: errors.slice(0, MAXIMUM_ERRORS), errorsTruncated: errors.length > MAXIMUM_ERRORS };
}

async function evaluate(body, instance) {
  admitSchemaEvaluation(body, { instance });
  // The supplier's registry is global. Compile in a scoped critical section so
  // concurrent callers may use the same identifiers without sharing documents.
  const previous = compilation;
  let release;
  compilation = new Promise(resolve => { release = resolve; });
  await previous;
  const retained = new Set(getAllRegisteredSchemaUris());
  try {
    const defaultDialect = dialects[body.dialect ?? "2020-12"];
    const retrievalUri = body.baseUri ?? `https://market.561.group/v1/data/json-schema-${instance ? "validate" : "check"}`;
    setShouldValidateFormat(body.assertFormats ?? false);
    for (const schema of body.schemas ?? []) registerSchema(schema, undefined, defaultDialect);
    registerSchema(body.schema, retrievalUri, defaultDialect);
    const validator = await validate(retrievalUri);
    if (!instance) return { evaluated: true, ...output({ valid: true }), formatAssertion: body.assertFormats ?? false };
    return { evaluated: true, ...output(validator(body.value, "BASIC")), formatAssertion: body.assertFormats ?? false };
  } catch (error) {
    // An incomplete graph or failed compilation is not an invalid instance.
    const diagnostic = { name: error.name, message: String(error.message).slice(0, 2048) };
    if (error.output) diagnostic.output = output(error.output);
    return { evaluated: false, diagnostic, formatAssertion: body.assertFormats ?? false };
  } finally {
    try {
      for (const uri of getAllRegisteredSchemaUris()) if (!retained.has(uri)) unregisterSchema(uri);
    } finally {
      setShouldValidateFormat(undefined);
      release();
    }
  }
}

/** Compile, meta-validate and resolve the supplied schema corpus with the native engine. */
export function checkSchema(body) { return evaluate(body, false); }

/** Preserve native BASIC output, including instance and absolute keyword locations. */
export function evaluateSchemaInstance(body) { return evaluate(body, true); }
