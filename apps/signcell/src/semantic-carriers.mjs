/** The semantic carrier schemas, in the specification shape they were first generated in; the
 *  specifications themselves are retired, so this module is their source. */
import { readingSchema } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
export const cellSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/cell.schema.json",
  "title": "Cell",
  "description": "An addressable position in a relational field; a cell does not itself decide truth or mutate a Thing.",
  "type": "object",
  "required": [
    "kind",
    "address",
    "provenance"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "cell"
    },
    "address": {
      "type": "string",
      "minLength": 1
    },
    "provenance": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "x-codegen": {
    "exportName": "cellSchema",
    "typeName": "Cell",
    "runtimeName": "cellType"
  }
});

export const knowledgeReadingSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/knowledge-reading.schema.json",
  "title": "Knowledge reading",
  "description": "The knowledge-family name of the point told evidence lands on: which of for and against have been told (Dunn's subset of {T, F}), in side order (0,0) (1,0) (0,1) (1,1).",
  "type": "string",
  ...readingSchema("knowledge"),
  "x-codegen": {
    "exportName": "knowledgeReadingSchema",
    "typeName": "KnowledgeReading",
    "runtimeName": "knowledgeReadingType"
  }
});

export const claimSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/claim.schema.json",
  "title": "Claim",
  "description": "A proposition with provenance, held separate from evidence, truth valuation, authority, and effect.",
  "type": "object",
  "required": [
    "kind",
    "subject",
    "predicate",
    "object",
    "provenance"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "claim"
    },
    "subject": {
      "type": "string",
      "minLength": 1
    },
    "predicate": {
      "type": "string",
      "minLength": 1
    },
    "object": {},
    "provenance": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "x-codegen": {
    "exportName": "claimSchema",
    "typeName": "Claim",
    "runtimeName": "claimType"
  }
});

export const evidenceSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/evidence.schema.json",
  "title": "Evidence",
  "description": "An observed or sourced carrier. Evidence supports a claim or relation witness; it never silently establishes truth or authority.",
  "type": "object",
  "required": [
    "kind",
    "source",
    "observedAt",
    "content",
    "provenance"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "evidence"
    },
    "source": {
      "type": "string",
      "minLength": 1
    },
    "observedAt": {
      "type": "string",
      "format": "date-time"
    },
    "content": {
      "type": "object"
    },
    "provenance": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  },
  "x-codegen": {
    "exportName": "evidenceSchema",
    "typeName": "Evidence",
    "runtimeName": "evidenceType"
  }
});

export const typedMarkSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-cell.schema.json",
  "title": "Typed mark",
  "description": "A mark interpreted by a named data type: its content is what the type admitted, in canonical form, and its address is derived from kind, declared type, and content. The kind sign.cell is a wire tag kept because stored addresses include it.",
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
    "exportName": "typedMarkSchema",
    "typeName": "TypedMark",
    "runtimeName": "typedMarkType"
  }
});

export const semanticClaimSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/semantic-claim.schema.json",
  "title": "Semantic claim",
  "description": "A SignCell cell over typed semantic references: a subject-predicate-object assertion with the witnesses told for and against it, and its knowledge value only where that is not what the witnesses show.",
  "type": "object",
  "required": [
    "subject",
    "predicate",
    "object",
    "for",
    "against"
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
    "for": {
      "type": "array"
    },
    "against": {
      "type": "array"
    },
    "value": {
      "$ref": "knowledge-reading.schema.json"
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

export const statementSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.561.group/computer/statement.schema.json",
  "title": "Statement",
  "description": "The portable four-place assertion (subject, predicate, object, witness). EAVT is its durable row representation; neither suppresses contradictory witnessed assertions.",
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
      "type": "object"
    },
    "predicate": {
      "type": "string",
      "minLength": 1
    },
    "object": {
      "type": "object"
    },
    "witness": {
      "$ref": "evidence.schema.json"
    }
  },
  "x-codegen": {
    "exportName": "statementSchema",
    "typeName": "Statement",
    "runtimeName": "statementType"
  }
});

export const cellType = defineSchemaType(cellSchema);
export const knowledgeReadingType = defineSchemaType(knowledgeReadingSchema);
export const claimType = defineSchemaType(claimSchema);
export const evidenceType = defineSchemaType(evidenceSchema);
export const typedMarkType = defineSchemaType(typedMarkSchema);
export const semanticClaimType = defineSchemaType(semanticClaimSchema, [knowledgeReadingSchema, semanticReferenceSchema]);
export const semanticGraphType = defineSchemaType(semanticGraphSchema, [typedMarkSchema, semanticReferenceSchema]);
export const semanticReferenceType = defineSchemaType(semanticReferenceSchema);
export const statementType = defineSchemaType(statementSchema, [evidenceSchema]);
