

export function applyTextFileContentEdits({ reading, edits } = {}) {
  if (reading?.type !== "TextFileRead" || typeof reading.path !== "string" || typeof reading.text !== "string") throw new TypeError("reading must be a TextFileRead carrier");
  if (!Array.isArray(edits) || edits.some(({ type }) => type !== "TextFileContentEdit")) throw new TypeError("edits must be TextFileContentEdit carriers");
  const ordered = [...edits].sort((left, right) => left.start - right.start);
  let cursor = 0;
  let text = "";
  for (const edit of ordered) {
    if (edit.path !== reading.path) throw new TypeError("every edit path must equal the text-file reading path");
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) || edit.start < cursor || edit.end < edit.start) throw new TypeError("text edits must have ordered, non-overlapping integer spans");
    if (reading.text.slice(edit.start, edit.end) !== edit.before) throw new Error(`text edit precondition failed at ${edit.start}:${edit.end}`);
    text += reading.text.slice(cursor, edit.start) + edit.after;
    cursor = edit.end;
  }
  text += reading.text.slice(cursor);
  return Object.freeze({
    type: "TextFileContentProjection",
    path: reading.path,
    before: reading.text,
    text,
    edits: Object.freeze(ordered.map((edit) => Object.freeze({ ...edit }))),
  });
}

export const operation = Object.freeze({ name: "apply-text-file-content-edits", description: "applyTextFileContentEdits — the apply-text-file-content-edits operation.", operation: applyTextFileContentEdits });
