export type address = string;
export type row = {
    readonly "e": string | null;
    readonly "a": string;
    readonly "v": unknown;
    readonly "t": unknown;
};
export type genesis = (unknown) & (row) & (unknown);
export type record = {
    readonly "address": address;
    readonly "genesisRow": genesis;
    readonly "attributes": Record<string, unknown>;
    readonly "t": unknown;
    readonly "names": readonly string[];
    readonly "supersedes": readonly string[];
};
export type Actor = genesis | record;
export type Cell = {
    readonly "kind": "cell";
    readonly "address": string;
    readonly "provenance": readonly string[];
};
export declare const cellSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/cell.schema.json";
    readonly title: "Cell";
    readonly description: "An addressable position in a relational field; a cell does not itself decide truth or mutate a Thing.";
    readonly type: "object";
    readonly required: readonly ["kind", "address", "provenance"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "cell";
        };
        readonly address: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly provenance: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
}>;
export type Claim = {
    readonly "kind": "claim";
    readonly "subject": string;
    readonly "predicate": string;
    readonly "object": unknown;
    readonly "provenance": readonly string[];
};
export declare const claimSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/claim.schema.json";
    readonly title: "Claim";
    readonly description: "A proposition with provenance, held separate from evidence, truth valuation, authority, and effect.";
    readonly type: "object";
    readonly required: readonly ["kind", "subject", "predicate", "object", "provenance"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "claim";
        };
        readonly subject: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly predicate: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly object: {};
        readonly provenance: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
}>;
export type Evidence = {
    readonly "kind": "evidence";
    readonly "source": string;
    readonly "observedAt": string;
    readonly "content": Record<string, unknown>;
    readonly "provenance": readonly string[];
};
export declare const evidenceSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/evidence.schema.json";
    readonly title: "Evidence";
    readonly description: "An observed or sourced carrier. Evidence supports a claim or relation witness; it never silently establishes truth or authority.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "observedAt", "content", "provenance"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "evidence";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly observedAt: {
            readonly type: "string";
            readonly format: "date-time";
        };
        readonly content: {
            readonly type: "object";
        };
        readonly provenance: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
}>;
export type Receipt = {
    readonly "kind": "receipt";
    readonly "effect": string;
    readonly "receiver": string;
    readonly "evidence": Evidence;
};
export declare const receiptSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/receipt.schema.json";
    readonly title: "Receipt";
    readonly description: "Receiver-produced evidence that a named effect or delivery condition occurred. A provider's report is not a receipt.";
    readonly type: "object";
    readonly required: readonly ["kind", "effect", "receiver", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "receipt";
        };
        readonly effect: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly receiver: {
            readonly $ref: "https://561.group/schema/computer-data/actor#/$defs/address";
        };
        readonly evidence: {
            readonly $ref: "evidence.schema.json";
        };
    };
}>;
export type Refusal = {
    readonly "kind": "refusal";
    readonly "code": string;
    readonly "message": string;
    readonly "evidence": Evidence;
};
export declare const refusalSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/refusal.schema.json";
    readonly title: "Refusal";
    readonly description: "A typed non-admission or non-delivery outcome naming the condition and its evidence. It never becomes an exception-shaped hidden state.";
    readonly type: "object";
    readonly required: readonly ["kind", "code", "message", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "refusal";
        };
        readonly code: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly message: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly evidence: {
            readonly $ref: "evidence.schema.json";
        };
    };
}>;
export type Resource = {
    readonly "kind": "resource";
    readonly "address": string;
    readonly "resourceClass": string;
    readonly "provenance": readonly string[];
};
export declare const resourceSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/resource.schema.json";
    readonly title: "Resource";
    readonly description: "An addressable, classed, provenance-carrying resource. Resource observations, reservations, allocations, consumption, and release are relations over this one term.";
    readonly type: "object";
    readonly required: readonly ["kind", "address", "resourceClass", "provenance"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "resource";
        };
        readonly address: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly resourceClass: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly provenance: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
}>;
export type Rule = {
    readonly "kind": "rule";
    readonly "statement": string;
    readonly "provenance": readonly string[];
};
export declare const ruleSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/rule.schema.json";
    readonly title: "Rule";
    readonly description: "A source-provenanced normative constraint applied conjunctively with every non-superseded, in-scope Founder Direction.";
    readonly type: "object";
    readonly required: readonly ["kind", "statement", "provenance"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "rule";
        };
        readonly statement: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly provenance: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
}>;
export type WitnessedStatement = {
    readonly "subject": Record<string, unknown>;
    readonly "predicate": string;
    readonly "object": Record<string, unknown>;
    readonly "witness": Evidence;
};
export declare const statementSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://schemas.561.group/computer/statement.schema.json";
    readonly title: "Statement";
    readonly description: "The portable four-place assertion (subject, predicate, object, witness). EAVT is its durable row representation; neither suppresses contradictory witnessed assertions.";
    readonly type: "object";
    readonly required: readonly ["subject", "predicate", "object", "witness"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly subject: {
            readonly type: "object";
        };
        readonly predicate: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly object: {
            readonly type: "object";
        };
        readonly witness: {
            readonly $ref: "evidence.schema.json";
        };
    };
}>;
export declare const cellType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/cell.schema.json";
        readonly title: "Cell";
        readonly description: "An addressable position in a relational field; a cell does not itself decide truth or mutate a Thing.";
        readonly type: "object";
        readonly required: readonly ["kind", "address", "provenance"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "cell";
            };
            readonly address: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly provenance: {
                readonly type: "array";
                readonly minItems: 1;
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "cell";
        readonly address: string;
        readonly provenance: readonly string[];
    } | undefined;
}>;
export declare const claimType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/claim.schema.json";
        readonly title: "Claim";
        readonly description: "A proposition with provenance, held separate from evidence, truth valuation, authority, and effect.";
        readonly type: "object";
        readonly required: readonly ["kind", "subject", "predicate", "object", "provenance"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "claim";
            };
            readonly subject: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly predicate: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly object: {};
            readonly provenance: {
                readonly type: "array";
                readonly minItems: 1;
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly object: unknown;
        readonly kind: "claim";
        readonly subject: string;
        readonly predicate: string;
        readonly provenance: readonly string[];
    } | undefined;
}>;
export declare const evidenceType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/evidence.schema.json";
        readonly title: "Evidence";
        readonly description: "An observed or sourced carrier. Evidence supports a claim or relation witness; it never silently establishes truth or authority.";
        readonly type: "object";
        readonly required: readonly ["kind", "source", "observedAt", "content", "provenance"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "evidence";
            };
            readonly source: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly observedAt: {
                readonly type: "string";
                readonly format: "date-time";
            };
            readonly content: {
                readonly type: "object";
            };
            readonly provenance: {
                readonly type: "array";
                readonly minItems: 1;
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "evidence";
        readonly provenance: readonly string[];
        readonly source: string;
        readonly observedAt: string;
        readonly content: Record<string, unknown>;
    } | undefined;
}>;
export declare const receiptType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/receipt.schema.json";
        readonly title: "Receipt";
        readonly description: "Receiver-produced evidence that a named effect or delivery condition occurred. A provider's report is not a receipt.";
        readonly type: "object";
        readonly required: readonly ["kind", "effect", "receiver", "evidence"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "receipt";
            };
            readonly effect: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly receiver: {
                readonly $ref: "https://561.group/schema/computer-data/actor#/$defs/address";
            };
            readonly evidence: {
                readonly $ref: "evidence.schema.json";
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "receipt";
        readonly evidence: unknown;
        readonly effect: string;
        readonly receiver: unknown;
    } | undefined;
}>;
export declare const refusalType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/refusal.schema.json";
        readonly title: "Refusal";
        readonly description: "A typed non-admission or non-delivery outcome naming the condition and its evidence. It never becomes an exception-shaped hidden state.";
        readonly type: "object";
        readonly required: readonly ["kind", "code", "message", "evidence"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "refusal";
            };
            readonly code: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly message: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly evidence: {
                readonly $ref: "evidence.schema.json";
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "refusal";
        readonly message: string;
        readonly code: string;
        readonly evidence: unknown;
    } | undefined;
}>;
export declare const resourceType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/resource.schema.json";
        readonly title: "Resource";
        readonly description: "An addressable, classed, provenance-carrying resource. Resource observations, reservations, allocations, consumption, and release are relations over this one term.";
        readonly type: "object";
        readonly required: readonly ["kind", "address", "resourceClass", "provenance"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "resource";
            };
            readonly address: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly resourceClass: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly provenance: {
                readonly type: "array";
                readonly minItems: 1;
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "resource";
        readonly address: string;
        readonly provenance: readonly string[];
        readonly resourceClass: string;
    } | undefined;
}>;
export declare const ruleType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/rule.schema.json";
        readonly title: "Rule";
        readonly description: "A source-provenanced normative constraint applied conjunctively with every non-superseded, in-scope Founder Direction.";
        readonly type: "object";
        readonly required: readonly ["kind", "statement", "provenance"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly kind: {
                readonly const: "rule";
            };
            readonly statement: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly provenance: {
                readonly type: "array";
                readonly minItems: 1;
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "rule";
        readonly statement: string;
        readonly provenance: readonly string[];
    } | undefined;
}>;
export declare const statementType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: Readonly<{
        readonly $schema: "https://json-schema.org/draft/2020-12/schema";
        readonly $id: "https://schemas.561.group/computer/statement.schema.json";
        readonly title: "Statement";
        readonly description: "The portable four-place assertion (subject, predicate, object, witness). EAVT is its durable row representation; neither suppresses contradictory witnessed assertions.";
        readonly type: "object";
        readonly required: readonly ["subject", "predicate", "object", "witness"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly subject: {
                readonly type: "object";
            };
            readonly predicate: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly object: {
                readonly type: "object";
            };
            readonly witness: {
                readonly $ref: "evidence.schema.json";
            };
        };
    }>;
    references: readonly import("../validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("../type-system.mjs").DataType[];
    readonly __value?: {
        readonly object: Record<string, unknown>;
        readonly witness: unknown;
        readonly subject: Record<string, unknown>;
        readonly predicate: string;
    } | undefined;
}>;
