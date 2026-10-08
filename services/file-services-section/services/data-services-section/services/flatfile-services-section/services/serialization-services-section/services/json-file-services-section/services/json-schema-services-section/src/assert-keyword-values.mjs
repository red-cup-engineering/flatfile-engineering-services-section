export function assertKeywordValues(node, at) {
    if (node.type !== undefined) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      const allowed = new Set(["array", "boolean", "integer", "null", "number", "object", "string"]);
      if (!types.length || new Set(types).size !== types.length || types.some((type) => !allowed.has(type)))
        throw new TypeError(`${at}/type must name distinct JSON Schema types`);
    }
    for (const key of ["$id", "$ref", "$comment", "title", "description"])
      if (node[key] !== undefined && typeof node[key] !== "string")
        throw new TypeError(`${at}/${key} must be a string`);
    for (const key of ["uniqueItems", "deprecated", "readOnly", "writeOnly"])
      if (node[key] !== undefined && typeof node[key] !== "boolean")
        throw new TypeError(`${at}/${key} must be a boolean`);
    for (const key of ["minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties"])
      if (node[key] !== undefined && (!Number.isInteger(node[key]) || node[key] < 0))
        throw new TypeError(`${at}/${key} must be a non-negative integer`);
    for (const key of ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"])
      if (node[key] !== undefined && (typeof node[key] !== "number" || !Number.isFinite(node[key]) || (key === "multipleOf" && node[key] <= 0)))
        throw new TypeError(`${at}/${key} must be a finite${key === "multipleOf" ? " positive" : ""} number`);
    if (node.required !== undefined && (!Array.isArray(node.required) || node.required.some((key) => typeof key !== "string") || new Set(node.required).size !== node.required.length))
      throw new TypeError(`${at}/required must be an array of distinct strings`);
    for (const key of ["enum", "examples", "allOf", "anyOf", "oneOf", "prefixItems"])
      if (node[key] !== undefined && (!Array.isArray(node[key]) || (["allOf", "anyOf", "oneOf", "prefixItems"].includes(key) && node[key].length === 0)))
        throw new TypeError(`${at}/${key} must be ${["allOf", "anyOf", "oneOf", "prefixItems"].includes(key) ? "a non-empty" : "an"} array`);
}
