import eavtSchema from "../data/records/schema/glossary/terms/eavt.schema.json" with { type: "json" };

/** Generic admission is defined by the EAVT schema's exact JSON object law.
 * Tuple spelling is an explicit compatibility projection; SEAVT narrows only
 * E/A/V to direct closed SEN terms and leaves T as witness material. */
const coordinates = Object.freeze([...eavtSchema.required]);
export const EAVT_ROW_PROFILE = Object.freeze({
  schema: eavtSchema,
  name: eavtSchema.$id,
  coordinates,
  required: coordinates,
  additionalProperties: eavtSchema.additionalProperties,
  representation: "json-object-or-four-tuple",
});
