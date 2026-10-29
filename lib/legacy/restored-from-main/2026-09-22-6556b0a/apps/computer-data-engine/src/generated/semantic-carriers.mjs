/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "../schema-type.mjs";
export const chargeValueNameSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/charge-value-name.schema.json",
  "title": "Charge value name",
  "description": "Names for independent truth and falsity evidence coordinates in the FOUR bilattice. Coordinate order is truth, falsity; knowledge order is componentwise inclusion.",
  "type": "string",
  "oneOf": [
    {
      "const": "absurd",
      "x-coordinates": [
        "absent",
        "absent"
      ]
    },
    {
      "const": "potential",
      "x-coordinates": [
        "present",
        "absent"
      ]
    },
    {
      "const": "active",
      "x-coordinates": [
        "absent",
        "present"
      ]
    },
    {
      "const": "stable",
      "x-coordinates": [
        "present",
        "present"
      ]
    }
  ],
  "x-codegen": {
    "exportName": "chargeValueNameSchema",
    "typeName": "ChargeValueName",
    "runtimeName": "chargeValueNameType"
  }
});

export const semanticCellSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-cell.schema.json",
  "title": "Semantic cell",
  "description": "An immutable, content-addressed value admitted by a named data type. Its address is derived from kind, declared type, and content.",
  "type": "object",
  "required": [
    "kind",
    "id",
    "type",
    "content"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "sign.cell"
    },
    "id": {
      "type": "string",
      "pattern": "^ni:"
    },
    "type": {
      "type": "string",
      "minLength": 1
    },
    "content": true
  },
  "x-codegen": {
    "exportName": "semanticCellSchema",
    "typeName": "SemanticCell",
    "runtimeName": "semanticCellType"
  }
});

export const semanticClaimSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-claim.schema.json",
  "title": "Semantic claim",
  "description": "A typed subject-predicate-object assertion whose charge retains independent positive and negative evidence.",
  "type": "object",
  "required": [
    "kind",
    "subject",
    "predicate",
    "object",
    "charge"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "sign.claim"
    },
    "subject": {
      "$ref": "semantic-reference.schema.json"
    },
    "predicate": {
      "type": "string",
      "minLength": 1
    },
    "object": {
      "$ref": "semantic-reference.schema.json"
    },
    "charge": {
      "$ref": "charge-value-name.schema.json"
    }
  },
  "x-codegen": {
    "exportName": "semanticClaimSchema",
    "typeName": "SemanticClaim",
    "runtimeName": "semanticClaimType"
  }
});

export const semanticGraphSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-graph.schema.json",
  "title": "Semantic graph",
  "description": "A closed set of content-addressed cells with declared typed predicates and witnessed edges. Endpoint membership is checked by semantic graph admission.",
  "type": "object",
  "required": [
    "kind",
    "id",
    "cells",
    "relations",
    "edges"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "sign.graph"
    },
    "id": {
      "type": "string",
      "pattern": "^ni:"
    },
    "cells": {
      "type": "array",
      "items": {
        "$ref": "semantic-cell.schema.json"
      }
    },
    "relations": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/relation"
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/edge"
      }
    }
  },
  "$defs": {
    "relation": {
      "type": "object",
      "required": [
        "id",
        "subjectTypes",
        "objectTypes",
        "witnessTypes"
      ],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "minLength": 1
        },
        "subjectTypes": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "objectTypes": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "witnessTypes": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "type": "string",
            "minLength": 1
          }
        }
      }
    },
    "edge": {
      "type": "object",
      "required": [
        "id",
        "edge"
      ],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^ni:"
        },
        "edge": {
          "type": "object",
          "required": [
            "subject",
            "predicate",
            "object",
            "witness"
          ],
          "additionalProperties": false,
          "properties": {
            "subject": {
              "$ref": "semantic-reference.schema.json"
            },
            "predicate": {
              "type": "string",
              "minLength": 1
            },
            "object": {
              "$ref": "semantic-reference.schema.json"
            },
            "witness": {
              "$ref": "semantic-reference.schema.json"
            }
          }
        }
      }
    }
  },
  "x-codegen": {
    "exportName": "semanticGraphSchema",
    "typeName": "SemanticGraph",
    "runtimeName": "semanticGraphType"
  }
});

export const semanticReferenceSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-reference.schema.json",
  "title": "Semantic cell reference",
  "description": "The typed content address used at every semantic relation position.",
  "type": "object",
  "required": [
    "id",
    "type"
  ],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^ni:"
    },
    "type": {
      "type": "string",
      "minLength": 1
    }
  },
  "x-codegen": {
    "exportName": "semanticReferenceSchema",
    "typeName": "SemanticReference",
    "runtimeName": "semanticReferenceType"
  }
});

export const chargeValueNameType = defineSchemaType(chargeValueNameSchema);
export const semanticCellType = defineSchemaType(semanticCellSchema);
export const semanticClaimType = defineSchemaType(semanticClaimSchema, [chargeValueNameSchema, semanticReferenceSchema]);
export const semanticGraphType = defineSchemaType(semanticGraphSchema, [semanticCellSchema, semanticReferenceSchema]);
export const semanticReferenceType = defineSchemaType(semanticReferenceSchema);
