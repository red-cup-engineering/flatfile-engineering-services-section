import type { FromJsonSchema } from "../src/schema.mts";

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Value extends true> = Value;

const closed = {
  type: "array",
  prefixItems: [{ type: "string" }, { type: "null" }],
  items: false,
  minItems: 2,
} as const;

const legacyClosed = {
  type: "array",
  items: [{ type: "string" }, { type: "null" }],
  additionalItems: false,
  minItems: 2,
} as const;

const optional = {
  type: "array",
  prefixItems: [{ type: "string" }, { type: "null" }],
  items: false,
  minItems: 1,
} as const;

const open = {
  type: "array",
  prefixItems: [{ type: "string" }, { type: "null" }],
  items: { type: "boolean" },
  minItems: 2,
} as const;

const allOptional = {
  type: "array",
  prefixItems: [{ type: "string" }, { type: "null" }, { type: "boolean" }],
  items: false,
  minItems: 0,
} as const;

const unionTail = {
  type: "array",
  prefixItems: [{ type: "string" }],
  items: { type: ["boolean", "number"] },
  minItems: 1,
} as const;

const empty = { type: "array", items: false } as const;

type _Closed = Assert<Equal<FromJsonSchema<typeof closed>, readonly [string, null]>>;
type _LegacyClosed = Assert<Equal<FromJsonSchema<typeof legacyClosed>, readonly [string, null]>>;
type _Optional = Assert<Equal<FromJsonSchema<typeof optional>, readonly [string, null?]>>;
type _Open = Assert<Equal<FromJsonSchema<typeof open>, readonly [string, null, ...boolean[]]>>;
type _AllOptional = Assert<Equal<FromJsonSchema<typeof allOptional>, readonly [string?, null?, boolean?]>>;
type _UnionTail = Assert<Equal<FromJsonSchema<typeof unionTail>, readonly [string, ...(boolean | number)[]]>>;
type _Empty = Assert<Equal<FromJsonSchema<typeof empty>, readonly []>>;

const optionalAccepted: FromJsonSchema<typeof allOptional> = ["x", null, true];
const tailAccepted: FromJsonSchema<typeof unionTail> = ["x", false, 2];
// @ts-expect-error closed tuples reject an item after the third prefix position
const optionalRejected: FromJsonSchema<typeof allOptional> = ["x", null, true, false];
// @ts-expect-error open tails still require their prefix
const tailRejected: FromJsonSchema<typeof unionTail> = [];
void [optionalAccepted, tailAccepted, optionalRejected, tailRejected];

type _Bottom = Assert<Equal<FromJsonSchema<false>, never>>;
type _Top = Assert<Equal<FromJsonSchema<true>, unknown>>;
const intersection = { allOf: [{ type: "string" }, { enum: ["a", "b"] }] } as const;
type _Intersection = Assert<Equal<FromJsonSchema<typeof intersection>, "a" | "b">>;

import { admit, defineType, specializeType } from "../dist/index.mjs";
const named = defineType({
  id: "Named", name: "Named", description: "A value with a name.", parents: [],
  schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
});
if (named.ok) {
  const counted = specializeType([named.value], {
    id: "Counted", name: "Counted", description: "A named value with a count.",
    schema: { type: "object", properties: { count: { type: "number" } }, required: ["count"] },
  });
  if (counted.ok) {
    const result = admit(counted.value, { name: "example", count: 1 });
    if (result.ok) {
      const name: string = result.value.name;
      const count: number = result.value.count;
      // @ts-expect-error the parent contract survives specialization
      const wrongName: number = result.value.name;
      // @ts-expect-error the local contract survives admission
      const wrongCount: string = result.value.count;
    }
  }
}
