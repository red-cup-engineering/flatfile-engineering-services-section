/**
 * Transform a JSON Schema literal into an exported TypeScript type declaration.
 * This is a source generator, not a validator. Unsupported constraints are
 * deliberately omitted rather than represented as unsound TypeScript types.
 */

const isSchema = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function identifier(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value)) {
    throw new TypeError(`${label} must be a valid TypeScript identifier`);
  }
  return value;
}

function quoted(value) {
  return JSON.stringify(value);
}

function renderTypeName(type) {
  switch (type) {
    case "string": return "string";
    case "integer":
    case "number": return "number";
    case "boolean": return "boolean";
    case "null": return "null";
    case "array": return "readonly unknown[]";
    case "object": return "Record<string, unknown>";
    default: return "unknown";
  }
}

function renderTuple(items, minimumItems, tail, root) {
  const required = Math.max(0, Math.min(items.length, Number.isInteger(minimumItems) ? minimumItems : 0));
  const member = (schema) => {
    const rendered = renderSchema(schema, root);
    return (rendered.includes(" | ") || rendered.includes(" & ")) ? `(${rendered})` : rendered;
  };
  const prefix = items.map((item, index) => `${member(item)}${index < required ? "" : "?"}`);
  const suffix = tail === false ? "" : `${prefix.length === 0 ? "" : ", "}...${member(tail ?? true)}[]`;
  return `readonly [${prefix.join(", ")}${suffix}]`;
}

function renderSchema(schema, root) {
  if (schema === true) return "unknown";
  if (schema === false) return "never";
  if (!isSchema(schema)) return "unknown";

  if (Array.isArray(schema.allOf)) {
    const { allOf, ...local } = schema;
    return [local, ...allOf].map((part) => `(${renderSchema(part, root)})`).join(" & ");
  }
  if (typeof schema.$ref === "string") {
    if (schema.$ref === "#") return "unknown";
    const definition = /^#\/\$defs\/([A-Za-z_$][A-Za-z0-9_$]*)$/u.exec(schema.$ref);
    if (definition && isSchema(root.$defs) && Object.hasOwn(root.$defs, definition[1])) return definition[1];
    return "unknown";
  }
  if (Object.hasOwn(schema, "const")) return quoted(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map(quoted).join(" | ") || "never";
  for (const keyword of ["anyOf", "oneOf"]) {
    if (Array.isArray(schema[keyword])) {
      return schema[keyword].map((member) => renderSchema(member, root)).join(" | ") || "never";
    }
  }
  if (schema.type === "object") {
    if (!isSchema(schema.properties)) return "Record<string, unknown>";
    const required = new Set(Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === "string") : []);
    const properties = Object.entries(schema.properties).map(([key, value]) =>
      `readonly ${quoted(key)}${required.has(key) ? "" : "?"}: ${renderSchema(value, root)};`,
    );
    return properties.length === 0 ? "{}" : `{ ${properties.join(" ")} }`;
  }
  if (schema.type === "array") {
    if (Array.isArray(schema.prefixItems)) return renderTuple(schema.prefixItems, schema.minItems, schema.items ?? true, root);
    if (Array.isArray(schema.items)) return renderTuple(schema.items, schema.minItems, schema.additionalItems ?? true, root);
    if (schema.items === false) return "readonly []";
    const item = renderSchema(schema.items ?? true, root);
    return `readonly ${item.includes(" | ") || item.includes(" & ") ? `(${item})` : item}[]`;
  }
  if (Array.isArray(schema.type)) return schema.type.map(renderTypeName).join(" | ") || "unknown";
  return renderTypeName(schema.type);
}

/**
 * Create TypeScript source for a JSON Schema literal.
 *
 * @param {object|boolean} schema The JSON Schema to transform.
 * @param {{ typeName?: string }} [options] The exported root type name.
 * @returns {string} An `export type` declaration, plus `$defs` aliases.
 */
export function transformJsonSchemaToTypescript(schema, options = {}) {
  if (schema !== true && schema !== false && !isSchema(schema)) throw new TypeError("schema must be a JSON Schema object or boolean");
  if (!isSchema(options)) throw new TypeError("options must be an object");
  const typeName = identifier(options.typeName ?? (isSchema(schema) && typeof schema.title === "string" ? schema.title : "Schema"), "typeName");
  const definitions = isSchema(schema) && isSchema(schema.$defs) ? Object.entries(schema.$defs) : [];
  const aliases = definitions.map(([name, definition]) => `export type ${identifier(name, "$defs key")} = ${renderSchema(definition, schema)};`);
  return [...aliases, `export type ${typeName} = ${renderSchema(schema, schema)};`, ""].join("\n");
}
