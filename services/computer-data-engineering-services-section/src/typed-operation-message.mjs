import { admit, defineType } from "./type-system/type-system.mjs";
/** The versioned messages exchanged when a typed operation crosses a wire. */
export const TYPED_OPERATION_MESSAGE_VERSION = 1;
export const TYPED_OPERATION_REQUEST_KIND = "typed-operation-request";
export const TYPED_OPERATION_RESULT_KIND = "typed-operation-result";
export const TYPED_OPERATION_REFUSAL_KIND = "typed-operation-refusal";
function messageType(id, name, properties, required) {
    const declared = defineType({
        id,
        name,
        description: `Version ${TYPED_OPERATION_MESSAGE_VERSION} ${name} message.`,
        parents: [],
        schema: {
            type: "object", additionalProperties: false,
            required: ["version", "kind", ...required],
            properties: { version: { const: TYPED_OPERATION_MESSAGE_VERSION }, kind: { const: name }, ...properties },
        },
    });
    if (!declared.ok)
        throw new Error(`cannot declare ${id}: ${declared.refusal.message}`);
    return declared.value;
}
/** One operation invocation with explicitly coded input and expected output. */
export const typedOperationRequestType = messageType("typed-operation-message.request.v1", TYPED_OPERATION_REQUEST_KIND, {
    requestId: { type: "string", minLength: 1 }, operationId: { type: "string", minLength: 1 }, inputCodec: { type: "string", minLength: 1 }, input: { type: "string" }, outputCodec: { type: "string", minLength: 1 }, actorResourceCatalog: { type: "object" },
}, ["requestId", "operationId", "inputCodec", "input", "outputCodec", "actorResourceCatalog"]);
/** A successfully executed operation output. */
export const typedOperationResultType = messageType("typed-operation-message.result.v1", TYPED_OPERATION_RESULT_KIND, {
    requestId: { type: "string", minLength: 1 }, outputCodec: { type: "string", minLength: 1 }, output: { type: "string" },
}, ["requestId", "outputCodec", "output"]);
/** A refused operation invocation, including its stable request identity. */
export const typedOperationRefusalType = messageType("typed-operation-message.refusal.v1", TYPED_OPERATION_REFUSAL_KIND, {
    requestId: { type: "string", minLength: 1 }, code: { type: "string", minLength: 1 }, message: { type: "string", minLength: 1 },
}, ["requestId", "code", "message"]);
