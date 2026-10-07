import { defineType } from "./type-system.mjs";
/** Declare an executable type directly from its shipped schema document. */
export function defineSchemaType(schema, references = []) {
    if (schema === true || schema === false || typeof schema.$id !== "string" || typeof schema.title !== "string" || typeof schema.description !== "string") {
        throw new TypeError("schema declarations require $id, title, and description");
    }
    const result = defineType({
        id: schema.$id,
        name: schema.title,
        description: schema.description,
        schema,
        references,
        parents: [],
    });
    if (!result.ok)
        throw new TypeError(`schema declaration refused: ${JSON.stringify(result.refusal)}`);
    return result.value;
}
