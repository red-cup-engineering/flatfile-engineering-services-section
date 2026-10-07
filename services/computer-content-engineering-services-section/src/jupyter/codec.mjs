/**
 * integrations/jupyter/codec — Jupyter notebooks as execution-log material.
 *
 * This is the package-owned part of the Jupyter protocol instrument. A notebook
 * is not treated as a downstream implementation detail: ordered code cells are
 * admitted as execution loci, outputs are boundary observations, and the
 * record-tier projection is a reversible read of that code-cell log.
 *
 * @packageDocumentation
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  jupyterCodeCellContract,
  jupyterExecuteReplyContract,
  jupyterExecuteRequestContract,
  jupyterIopubMessageContract,
  jupyterNotebookContract,
  jupyterExecutionLogContract,
  jupyterExecutionRecordContract,
} from "./schema.mjs";
import { parse as parseJson, requireJsonValue } from "@red-cup-engineering/json-services-section";

export {
  jupyterCodeCellContract,
  jupyterExecuteReplyContract,
  jupyterExecuteRequestContract,
  jupyterIopubMessageContract,
  jupyterNotebookContract,
  jupyterOutputContract,
  jupyterExecutionLogContract,
  jupyterExecutionRecordContract,
} from "./schema.mjs";

function sourceText(source) {
  return typeof source === "string" ? source : source.join("");
}

function jsonRecord(value, label) {
  const json = requireJsonValue(value, label);
  if (json === null || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${label}: expected a JSON object`);
  return json;
}

function codeCellId(cell, index) {
  return typeof cell.id === "string" && cell.id.length > 0 ? cell.id : `code-cell-${index}`;
}

/** Parse an `.ipynb` JSON document into the notebook record. */
export function decodeIpynb(content) {
  return jupyterNotebookContract.assert(parseJson(content), "ipynb notebook");
}

/** Encode a notebook record as canonical ipynb JSON. */
export function encodeIpynb(notebook) {
  return `${canonicalJson(jupyterNotebookContract.assert(notebook, "ipynb notebook"))}\n`;
}

/** Construct a minimal nbformat 4 notebook from cells. */
export function jupyterNotebook(
  cells,
  options = {},
) {
  return jupyterNotebookContract.assert(Object.freeze({
    nbformat: 4,
    nbformat_minor: options.nbformatMinor ?? 5,
    metadata: options.metadata ?? Object.freeze({}),
    cells: Object.freeze([...cells]),
  }), "jupyter notebook");
}

/** Construct a code cell carrying source, outputs, and execution count. */
export function jupyterCodeCell(
  source,
  options

 = {},
) {
  return jupyterCodeCellContract.assert(Object.freeze({
    cell_type: "code",
    ...(options.id === undefined ? {} : { id: options.id }),
    metadata: options.metadata ?? Object.freeze({}),
    source,
    outputs: Object.freeze([...(options.outputs ?? [])]),
    execution_count: options.executionCount ?? null,
  }), "jupyter code cell");
}

/** Convert one code cell into an execute_request content object. */
export function executeRequestFromCell(cell) {
  const admitted = jupyterCodeCellContract.assert(cell, "execute request cell");
  return jupyterExecuteRequestContract.assert(Object.freeze({
    code: sourceText(admitted.source),
    silent: false,
    store_history: true,
    user_expressions: Object.freeze({}),
    allow_stdin: false,
    stop_on_error: true,
  }), "jupyter execute_request");
}

/** Convert one code cell into the settled execute_reply content it records. */
export function executeReplyFromCell(cell) {
  const admitted = jupyterCodeCellContract.assert(cell, "execute reply cell");
  const hasError = admitted.outputs.some((output) => output.output_type === "error");
  return jupyterExecuteReplyContract.assert(Object.freeze({
    status: hasError ? "error" : "ok",
    execution_count: admitted.execution_count,
    outputs: Object.freeze([...admitted.outputs]),
  }), "jupyter execute_reply");
}

/** Read code-cell outputs as normalized IOPub messages. */
export function iopubMessagesFromCell(cell) {
  const admitted = jupyterCodeCellContract.assert(cell, "iopub cell");
  const messages = [
    Object.freeze({ msg_type: "status", content: Object.freeze({ execution_state: "busy" }) }),
  ];
  for (const output of admitted.outputs) {
    messages.push(jupyterIopubMessageContract.assert(Object.freeze({
      msg_type: output.output_type,
      content: output,
    }), "jupyter iopub message"));
  }
  messages.push(Object.freeze({ msg_type: "status", content: Object.freeze({ execution_state: "idle" }) }));
  return Object.freeze(messages);
}

/** Project a notebook's ordered code-cell log into record-tier statement material. */
export function cellsToRecords(notebook) {
  const admitted = jupyterNotebookContract.assert(notebook, "cellsToRecords notebook");
  return Object.freeze(admitted.cells.flatMap((cell, index) => {
    if (cell.cell_type !== "code") return [];
    const code = jupyterCodeCellContract.assert(cell, "cellsToRecords code cell");
    return [jupyterExecutionRecordContract.assert(Object.freeze({
      kind: "jupyter.witness.record",
      cellId: codeCellId(code, index),
      index,
      source: sourceText(code.source),
      executionCount: code.execution_count,
      outputs: Object.freeze([...code.outputs]),
      metadata: jsonRecord(code.metadata, "cellsToRecords metadata"),
    }), "Jupyter execution record")];
  }));
}

/** Rebuild ordered code cells from the record-tier execution projection. */
export function recordsToCells(records) {
  return Object.freeze(records
    .map((record) => jupyterExecutionRecordContract.assert(record, "recordsToCells record"))
    .sort((left, right) => left.index - right.index || left.cellId.localeCompare(right.cellId))
    .map((record) => jupyterCodeCell(record.source, {
      id: record.cellId,
      outputs: record.outputs,
      executionCount: record.executionCount,
      metadata: record.metadata,
    })));
}

/** Project a notebook into a named statement log. */
export function executionLogFromNotebook(notebook, options = {}) {
  return jupyterExecutionLogContract.assert(Object.freeze({
    kind: "jupyter.witness.log",
    ...(options.notebook === undefined ? {} : { notebook: options.notebook }),
    records: cellsToRecords(notebook),
  }), "jupyter statement log");
}

/** Rebuild a minimal notebook from execution records. */
export function notebookFromRecords(records, options = {}) {
  return jupyterNotebook(recordsToCells(records), options);
}

/** The brick law named by the Jupyter protocol relation: recordsToCells after cellsToRecords is identity on code-cell logs. */
export function codeCellLogRoundTrip(notebook) {
  const original = cellsToRecords(notebook);
  const rebuilt = cellsToRecords(notebookFromRecords(original));
  return canonicalJson(original) === canonicalJson(rebuilt);
}
