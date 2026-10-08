#!/usr/bin/env node
import { readFileSync } from "node:fs";
export const inputSchema = {
  type: "object",
  required: ["e", "a", "v", "tx", "op"],
  additionalProperties: false,
  properties: {
    e: {
      type: "string",
      pattern: "^[A-Za-z][A-Za-z0-9+.-]*:[^<>\\u0000-\\u0020]*$",
    },
    a: {
      type: "string",
      pattern: "^[A-Za-z][A-Za-z0-9+.-]*:[^<>\\u0000-\\u0020]*$",
    },
    v: {
      oneOf: [
        {
          type: "object",
          required: ["kind", "value"],
          additionalProperties: false,
          properties: {
            kind: {
              const: "iri",
            },
            value: {
              type: "string",
              pattern: "^[A-Za-z][A-Za-z0-9+.-]*:[^<>\\u0000-\\u0020]*$",
            },
          },
        },
        {
          type: "object",
          required: ["kind", "value"],
          additionalProperties: false,
          properties: {
            kind: {
              const: "literal",
            },
            value: {
              type: "string",
            },
            datatype: {
              type: "string",
              pattern: "^[A-Za-z][A-Za-z0-9+.-]*:[^<>\\u0000-\\u0020]*$",
            },
            language: {
              type: "string",
              pattern: "^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$",
            },
          },
          not: {
            required: ["datatype", "language"],
          },
        },
      ],
    },
    tx: {
      type: "string",
      format: "date-time",
    },
    op: {
      enum: ["assert", "retract"],
    },
  },
};
export const outputSchema = inputSchema;
export function admitRdfDatom(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "a,e,op,tx,v"
  )
    throw new TypeError("RDF Datom must be exactly {e,a,v,tx,op}");
  if (value.op !== "assert" && value.op !== "retract")
    throw new TypeError("datom op must be assert or retract");
  if (typeof value.tx !== "string" || !Number.isFinite(Date.parse(value.tx)))
    throw new TypeError("datom tx must be an ISO timestamp");
  const object = value.v;
  if (!object || typeof object !== "object" || Array.isArray(object))
    throw new TypeError("datom v must be an RDF object");
  const iris = [
    [value.e, "datom e"],
    [value.a, "datom a"],
  ];
  let normalized;
  if (
    object.kind === "iri" &&
    Object.keys(object).sort().join(",") === "kind,value"
  ) {
    iris.push([object.value, "datom IRI value"]);
    normalized = { kind: "iri", value: object.value };
  } else {
    if (object.kind !== "literal" || typeof object.value !== "string")
      throw new TypeError("datom v must be an RDF IRI or string literal");
    if (object.datatype !== undefined && object.language !== undefined)
      throw new TypeError(
        "datom literal cannot have both datatype and language",
      );
    if (
      !Object.keys(object).every((key) =>
        ["kind", "value", "datatype", "language"].includes(key),
      )
    )
      throw new TypeError("datom literal has unsupported fields");
    if (object.datatype !== undefined)
      iris.push([object.datatype, "datom literal datatype"]);
    if (
      object.language !== undefined &&
      (typeof object.language !== "string" ||
        !/^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$/u.test(object.language))
    )
      throw new TypeError("datom literal language must be a BCP 47 tag");
    normalized = {
      kind: "literal",
      value: object.value,
      ...(object.datatype === undefined ? {} : { datatype: object.datatype }),
      ...(object.language === undefined
        ? {}
        : { language: object.language.toLowerCase() }),
    };
  }
  for (const [iri, name] of iris) {
    if (
      typeof iri !== "string" ||
      !/^(?:[A-Za-z][A-Za-z0-9+.-]*):[^<>\u0000-\u0020]*$/u.test(iri)
    )
      throw new TypeError(`${name} must be an RDF IRI`);
    try {
      new URL(iri);
    } catch {
      throw new TypeError(`${name} must be an RDF IRI`);
    }
  }
  return Object.freeze({
    e: value.e,
    a: value.a,
    v: Object.freeze(normalized),
    tx: value.tx,
    op: value.op,
  });
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(admitRdfDatom(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
