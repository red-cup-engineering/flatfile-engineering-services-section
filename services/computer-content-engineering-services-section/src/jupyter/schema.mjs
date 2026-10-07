import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const jsonValueSchema = {};

export const jupyterOutputSchema = {
  $id: "metroplat/codecs/text/json/ipynb/output",
  title: "JupyterOutput",
  description: "A normalized Jupyter code-cell output carried as JSON.",
  type: "object",
  required: ["output_type"],
  properties: {
    output_type: { enum: ["stream", "execute_result", "display_data", "error"] },
    name: { type: "string" },
    text: {},
    data: {},
    metadata: {},
    execution_count: { type: ["integer", "null"], minimum: 0 },
    ename: { type: "string" },
    evalue: { type: "string" },
    traceback: { type: "array", items: { type: "string" } },
  },
  additionalProperties: true,
};

export const jupyterCodeCellSchema = {
  $id: "metroplat/codecs/text/json/ipynb/code-cell",
  title: "JupyterCodeCell",
  description: "A Jupyter nbformat code cell as execution/statement material.",
  type: "object",
  required: ["cell_type", "metadata", "source", "outputs", "execution_count"],
  properties: {
    cell_type: { const: "code" },
    id: { type: "string", minLength: 1 },
    metadata: { type: "object", additionalProperties: true },
    source: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
    outputs: { type: "array", items: jupyterOutputSchema },
    execution_count: { type: ["integer", "null"], minimum: 0 },
  },
  additionalProperties: true,
};

export const jupyterNotebookSchema = {
  $id: "metroplat/codecs/text/json/ipynb/notebook",
  title: "JupyterNotebook",
  description: "A minimal Jupyter nbformat notebook schema with ordered cells.",
  type: "object",
  required: ["nbformat", "nbformat_minor", "metadata", "cells"],
  properties: {
    nbformat: { type: "integer", minimum: 4 },
    nbformat_minor: { type: "integer", minimum: 0 },
    metadata: { type: "object", additionalProperties: true },
    cells: {
      type: "array",
      items: {
        type: "object",
        required: ["cell_type", "metadata", "source"],
        properties: {
          cell_type: { enum: ["code", "markdown", "raw"] },
          id: { type: "string", minLength: 1 },
          metadata: { type: "object", additionalProperties: true },
          source: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          outputs: { type: "array", items: jupyterOutputSchema },
          execution_count: { type: ["integer", "null"], minimum: 0 },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

export const jupyterExecuteRequestSchema = {
  $id: "metroplat/codecs/text/json/ipynb/execute-request",
  title: "JupyterExecuteRequest",
  description: "The kernel execute_request content admitted from a code cell.",
  type: "object",
  required: ["code", "silent"],
  properties: {
    code: { type: "string" },
    silent: { type: "boolean" },
    store_history: { type: "boolean" },
    user_expressions: { type: "object", additionalProperties: jsonValueSchema },
    allow_stdin: { type: "boolean" },
    stop_on_error: { type: "boolean" },
  },
  additionalProperties: false,
};

export const jupyterExecuteReplySchema = {
  $id: "metroplat/codecs/text/json/ipynb/execute-reply",
  title: "JupyterExecuteReply",
  description: "The kernel execute_reply content settled from a code-cell execution.",
  type: "object",
  required: ["status", "execution_count", "outputs"],
  properties: {
    status: { enum: ["ok", "error", "abort"] },
    execution_count: { type: ["integer", "null"], minimum: 0 },
    outputs: { type: "array", items: jupyterOutputSchema },
  },
  additionalProperties: true,
};

export const jupyterIopubMessageSchema = {
  $id: "metroplat/codecs/text/json/ipynb/iopub-message",
  title: "JupyterIopubMessage",
  description: "A normalized IOPub observation emitted from a code-cell output.",
  type: "object",
  required: ["msg_type", "content"],
  properties: {
    msg_type: { enum: ["status", "stream", "execute_result", "display_data", "error"] },
    content: jsonValueSchema,
  },
  additionalProperties: false,
};

export const jupyterExecutionRecordSchema = {
  $id: "metroplat/codecs/text/json/ipynb/witness-record",
  title: "JupyterExecutionRecord",
  description: "The record-tier projection of one Jupyter code cell. The $id and kind retain frozen legacy wire names.",
  type: "object",
  required: ["kind", "cellId", "index", "source", "executionCount", "outputs"],
  properties: {
    kind: { const: "jupyter.witness.record" },
    cellId: { type: "string", minLength: 1 },
    index: { type: "integer", minimum: 0 },
    source: { type: "string" },
    executionCount: { type: ["integer", "null"], minimum: 0 },
    outputs: { type: "array", items: jupyterOutputSchema },
    metadata: { type: "object", additionalProperties: true },
  },
  additionalProperties: false,
};

export const jupyterExecutionLogSchema = {
  $id: "metroplat/codecs/text/json/ipynb/witness-log",
  title: "JupyterExecutionLog",
  description: "An ordered record-tier projection of notebook code cells. The $id and kind retain frozen legacy wire names.",
  type: "object",
  required: ["kind", "records"],
  properties: {
    kind: { const: "jupyter.witness.log" },
    notebook: { type: "string", minLength: 1 },
    records: { type: "array", items: jupyterExecutionRecordSchema },
  },
  additionalProperties: false,
};

export const jupyterOutputContract = schemaFrom(jupyterOutputSchema);
export const jupyterCodeCellContract = schemaFrom(jupyterCodeCellSchema);
export const jupyterNotebookContract = schemaFrom(jupyterNotebookSchema);
export const jupyterExecuteRequestContract = schemaFrom(jupyterExecuteRequestSchema);
export const jupyterExecuteReplyContract = schemaFrom(jupyterExecuteReplySchema);
export const jupyterIopubMessageContract = schemaFrom(jupyterIopubMessageSchema);
export const jupyterExecutionRecordContract = schemaFrom(jupyterExecutionRecordSchema);
export const jupyterExecutionLogContract = schemaFrom(jupyterExecutionLogSchema);
