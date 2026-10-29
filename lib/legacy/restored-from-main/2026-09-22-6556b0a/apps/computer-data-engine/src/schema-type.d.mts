import { type DataType } from "./type-system.mjs";
import type { JsonSchema } from "./validation.mjs";
/** Declare an executable type directly from its shipped schema document. */
export declare function defineSchemaType<Schema extends JsonSchema>(schema: Schema, references?: readonly JsonSchema[]): DataType<Schema>;
