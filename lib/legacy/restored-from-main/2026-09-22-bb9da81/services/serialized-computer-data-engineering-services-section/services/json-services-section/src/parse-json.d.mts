/**
 * Parses JSON text into an admitted JSON value, composing @red-cup-engineering/json-codec-service's own `parse` for both the JSON.parse call and JSON-value membership witnessing.
 * @param {object} request A record with `text` (the JSON document text to parse).
 * @returns {object} `{ok: true, value}` on a successful parse, or `{ok: false, error: {message, position}}` when `text` does not parse as JSON — `position` is the character offset named in the underlying error message, or `null` when the message names none.
 * @throws {TypeError} When request.text is not a string.
 */
export function parseJson(request: object): object;
