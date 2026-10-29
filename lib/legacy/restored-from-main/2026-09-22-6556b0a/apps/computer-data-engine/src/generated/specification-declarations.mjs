/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "../schema-type.mjs";
const actorSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://561.group/schema/computer-data/actor",
    "title": "Actor",
    "description": "The single Actor carrier. Actor identity is an EAVT constitution whose address is actor:<RFC6920 digest>; all office, principal, credential, resource, session, and application relations remain separate EAVT rows addressed to that Actor.",
    "oneOf": [
        {
            "$ref": "#/$defs/genesis"
        },
        {
            "$ref": "#/$defs/record"
        }
    ],
    "$defs": {
        "address": {
            "type": "string",
            "pattern": "^actor:[A-Za-z0-9_-]+$"
        },
        "row": {
            "type": "object",
            "required": [
                "e",
                "a",
                "v",
                "t"
            ],
            "additionalProperties": false,
            "properties": {
                "e": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "a": {
                    "type": "string"
                },
                "v": {},
                "t": {}
            }
        },
        "genesis": {
            "allOf": [
                {
                    "$ref": "#/$defs/row"
                },
                {
                    "properties": {
                        "e": {
                            "$ref": "#/$defs/address"
                        },
                        "a": {
                            "const": "constituted"
                        },
                        "v": {
                            "type": "object"
                        }
                    }
                }
            ]
        },
        "record": {
            "type": "object",
            "required": [
                "address",
                "genesisRow",
                "attributes",
                "t",
                "names",
                "supersedes"
            ],
            "additionalProperties": false,
            "properties": {
                "address": {
                    "$ref": "#/$defs/address"
                },
                "genesisRow": {
                    "$ref": "#/$defs/genesis"
                },
                "attributes": {
                    "type": "object"
                },
                "t": {},
                "names": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
                },
                "supersedes": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
                }
            }
        }
    }
});
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
    }
});
export const receiptSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/receipt.schema.json",
    "title": "Receipt",
    "description": "Receiver-produced evidence that a named effect or delivery condition occurred. A provider's report is not a receipt.",
    "type": "object",
    "required": [
        "kind",
        "effect",
        "receiver",
        "evidence"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "receipt"
        },
        "effect": {
            "type": "string",
            "minLength": 1
        },
        "receiver": {
            "$ref": "https://561.group/schema/computer-data/actor#/$defs/address"
        },
        "evidence": {
            "$ref": "evidence.schema.json"
        }
    }
});
export const refusalSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/refusal.schema.json",
    "title": "Refusal",
    "description": "A typed non-admission or non-delivery outcome naming the condition and its evidence. It never becomes an exception-shaped hidden state.",
    "type": "object",
    "required": [
        "kind",
        "code",
        "message",
        "evidence"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "refusal"
        },
        "code": {
            "type": "string",
            "minLength": 1
        },
        "message": {
            "type": "string",
            "minLength": 1
        },
        "evidence": {
            "$ref": "evidence.schema.json"
        }
    }
});
export const resourceSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/resource.schema.json",
    "title": "Resource",
    "description": "An addressable, classed, provenance-carrying resource. Resource observations, reservations, allocations, consumption, and release are relations over this one term.",
    "type": "object",
    "required": [
        "kind",
        "address",
        "resourceClass",
        "provenance"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "resource"
        },
        "address": {
            "type": "string",
            "minLength": 1
        },
        "resourceClass": {
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
    }
});
export const ruleSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/rule.schema.json",
    "title": "Rule",
    "description": "A source-provenanced normative constraint applied conjunctively with every non-superseded, in-scope Founder Direction.",
    "type": "object",
    "required": [
        "kind",
        "statement",
        "provenance"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "rule"
        },
        "statement": {
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
    }
});
export const cellType = defineSchemaType(cellSchema);
export const claimType = defineSchemaType(claimSchema);
export const evidenceType = defineSchemaType(evidenceSchema);
export const receiptType = defineSchemaType(receiptSchema, [actorSchema, evidenceSchema]);
export const refusalType = defineSchemaType(refusalSchema, [evidenceSchema]);
export const resourceType = defineSchemaType(resourceSchema);
export const ruleType = defineSchemaType(ruleSchema);
export const statementType = defineSchemaType(statementSchema, [evidenceSchema]);
