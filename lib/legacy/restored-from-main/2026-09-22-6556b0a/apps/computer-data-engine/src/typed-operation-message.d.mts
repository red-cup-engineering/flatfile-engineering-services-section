import { type TypeValue } from "./type-system.mjs";
/** The versioned messages exchanged when a typed operation crosses a wire. */
export declare const TYPED_OPERATION_MESSAGE_VERSION = 1;
export declare const TYPED_OPERATION_REQUEST_KIND = "typed-operation-request";
export declare const TYPED_OPERATION_RESULT_KIND = "typed-operation-result";
export declare const TYPED_OPERATION_REFUSAL_KIND = "typed-operation-refusal";
/** One operation invocation with explicitly coded input and expected output. */
export declare const typedOperationRequestType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly required: readonly ["version", "kind", "requestId", "operationId", "inputCodec", "input", "outputCodec", "actorResourceCatalog"];
        readonly properties: {
            readonly version: {
                readonly const: 1;
            };
            readonly kind: {
                readonly const: "typed-operation-request";
            };
        } & {
            readonly requestId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly operationId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly inputCodec: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly input: {
                readonly type: "string";
            };
            readonly outputCodec: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly actorResourceCatalog: {
                readonly type: "object";
            };
        };
    };
    references: readonly import("./validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("./type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "typed-operation-request";
        readonly version: 1;
        readonly requestId: string;
        readonly operationId: string;
        readonly inputCodec: string;
        readonly input: string;
        readonly outputCodec: string;
        readonly actorResourceCatalog: Record<string, unknown>;
    } | undefined;
}>;
/** A successfully executed operation output. */
export declare const typedOperationResultType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly required: readonly ["version", "kind", "requestId", "outputCodec", "output"];
        readonly properties: {
            readonly version: {
                readonly const: 1;
            };
            readonly kind: {
                readonly const: "typed-operation-result";
            };
        } & {
            readonly requestId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly outputCodec: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly output: {
                readonly type: "string";
            };
        };
    };
    references: readonly import("./validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("./type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "typed-operation-result";
        readonly version: 1;
        readonly requestId: string;
        readonly outputCodec: string;
        readonly output: string;
    } | undefined;
}>;
/** A refused operation invocation, including its stable request identity. */
export declare const typedOperationRefusalType: Readonly<{
    id: string;
    name: string;
    description: string;
    schema: {
        readonly type: "object";
        readonly additionalProperties: false;
        readonly required: readonly ["version", "kind", "requestId", "code", "message"];
        readonly properties: {
            readonly version: {
                readonly const: 1;
            };
            readonly kind: {
                readonly const: "typed-operation-refusal";
            };
        } & {
            readonly requestId: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly code: {
                readonly type: "string";
                readonly minLength: 1;
            };
            readonly message: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
    references: readonly import("./validation.mjs").JsonSchema[];
    parentIds: readonly string[];
    parents: readonly import("./type-system.mjs").DataType[];
    readonly __value?: {
        readonly kind: "typed-operation-refusal";
        readonly message: string;
        readonly version: 1;
        readonly requestId: string;
        readonly code: string;
    } | undefined;
}>;
export type TypedOperationRequest = TypeValue<typeof typedOperationRequestType>;
export type TypedOperationResult = TypeValue<typeof typedOperationResultType>;
export type TypedOperationRefusal = TypeValue<typeof typedOperationRefusalType>;
