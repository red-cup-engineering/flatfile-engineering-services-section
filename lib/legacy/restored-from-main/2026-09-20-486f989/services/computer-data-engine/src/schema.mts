/**
 * Type-level JSON Schema reading paired with the runtime source generator.
 *
 * `FromJsonSchema<S>` interprets a JSON Schema literal at compile time. It is
 * not runtime validation machinery; use `transformJsonSchemaToTypescript` to
 * produce TypeScript source from the same supported subset.
 */

/** Collapse an intersection of property maps into one object type. */
type Simplify<T> = { readonly [K in keyof T]: T[K] } & {};

type FromTypeName<T> =
  T extends "string" ? string :
  T extends "integer" | "number" ? number :
  T extends "boolean" ? boolean :
  T extends "null" ? null :
  T extends "array" ? readonly unknown[] :
  unknown;

type RequiredKey<P, R> = R extends readonly (infer K extends keyof P)[] ? K : never;

type FromObject<S, Root> =
  S extends { readonly properties: infer P }
    ? S extends { readonly required: infer R }
      ? Simplify<
          { readonly [K in RequiredKey<P, R>]: FromJsonSchema<P[K], Root> }
          & { readonly [K in Exclude<keyof P, RequiredKey<P, R>>]?: FromJsonSchema<P[K], Root> }
        >
      : { readonly [K in keyof P]?: FromJsonSchema<P[K], Root> }
    : Record<string, unknown>;

type ResolveRef<Ref, Root> =
  Ref extends "#"
    ? unknown :
  Ref extends `#/$defs/${infer Name}`
    ? Root extends { readonly $defs: infer D }
      ? Name extends keyof D ? FromJsonSchema<D[Name], Root> : unknown
      : unknown
    : unknown;

type MinimumItems<S> = S extends { readonly minItems: infer N extends number } ? N : 0;

type PrefixTuple<
  Items extends readonly unknown[],
  Minimum extends number,
  Root,
  Position extends readonly unknown[] = [],
  Index extends readonly unknown[] = [],
  Optional extends boolean = false,
> = Items extends readonly [infer Head, ...infer Tail]
  ? Optional extends true
    ? PrefixTuple<Tail, Minimum, Root, [...Position, FromJsonSchema<Head, Root>?], [...Index, unknown], true>
    : Index["length"] extends Minimum
      ? PrefixTuple<Tail, Minimum, Root, [...Position, FromJsonSchema<Head, Root>?], [...Index, unknown], true>
      : PrefixTuple<Tail, Minimum, Root, [...Position, FromJsonSchema<Head, Root>], [...Index, unknown]>
  : Position;

type TupleWithTail<
  Items extends readonly unknown[],
  Minimum extends number,
  Tail,
  Root,
> = Tail extends false
  ? readonly [...PrefixTuple<Items, Minimum, Root>]
  : readonly [...PrefixTuple<Items, Minimum, Root>, ...FromJsonSchema<Tail, Root>[]];

type FromArraySchema<S, Root> =
  S extends { readonly prefixItems: infer Prefix extends readonly unknown[] }
    ? TupleWithTail<Prefix, MinimumItems<S>, S extends { readonly items: infer Tail } ? Tail : true, Root>
    : S extends { readonly items: infer Items extends readonly unknown[] }
      ? TupleWithTail<Items, MinimumItems<S>, S extends { readonly additionalItems: infer Tail } ? Tail : true, Root>
      : S extends { readonly items: false }
        ? readonly []
      : S extends { readonly items: infer Item }
        ? readonly FromJsonSchema<Item, Root>[]
        : readonly unknown[];

/**
 * Derive the TypeScript type of a JSON Schema literal authored `as const`.
 * Supports the same small schema subset as the runtime source generator.
 */
type IntersectSchemas<S extends readonly unknown[], Root> = S extends readonly [infer Head, ...infer Tail]
  ? FromJsonSchema<Head, Root> & IntersectSchemas<Tail, Root> : unknown;

export type FromJsonSchema<S, Root = S> =
  S extends false ? never :
  S extends true ? unknown :
  S extends { readonly allOf: infer Members extends readonly unknown[] } ? FromJsonSchema<Omit<S, "allOf">, Root> & IntersectSchemas<Members, Root> :
  S extends { readonly $ref: infer R } ? ResolveRef<R, Root> :
  S extends { readonly const: infer C } ? C :
  S extends { readonly enum: readonly (infer E)[] } ? E :
  S extends { readonly anyOf: readonly (infer U)[] } ? FromJsonSchema<U, Root> :
  S extends { readonly oneOf: readonly (infer U)[] } ? FromJsonSchema<U, Root> :
  S extends { readonly type: "object" } ? FromObject<S, Root> :
  S extends { readonly type: "array" } ? FromArraySchema<S, Root> :
  S extends { readonly type: readonly (infer T)[] } ? FromTypeName<T> :
  S extends { readonly type: infer T } ? FromTypeName<T> :
  unknown;
