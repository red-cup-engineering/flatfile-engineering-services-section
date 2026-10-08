const cellDefinition = /##([A-Za-z][\w-]*)(?![\w-]|\{)/gu;
const cellReference = /(?<!#)#([A-Za-z][\w-]*)(?![\w-]|[#{])/gu;
const morphDefinition = /##([A-Za-z][\w-]*)\{([^}]*)\}/gu;
const morphReference = /(?<!#)#([A-Za-z][\w-]*)\{([^}]*)\}/gu;
const scopeOpen = /#open-([A-Za-z][\w-]*)\{([^}]*)\}/gu;
const scopeClose = /#close-([A-Za-z][\w-]*)(?!\{)/gu;

function argumentsOf(text) {
  const parts = [];
  let quoted = false, current = "";
  for (const character of text) {
    if (character === '"') quoted = !quoted;
    if (character === "," && !quoted) { if (current.trim()) parts.push(current.trim()); current = ""; }
    else current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return Object.freeze(Object.fromEntries(parts.map((part, index) => {
    const separator = part.indexOf("=");
    const key = separator < 0 ? String(index) : part.slice(0, separator).trim();
    const value = (separator < 0 ? part : part.slice(separator + 1)).trim().replace(/^"|"$/gu, "");
    return [key, value];
  })));
}

function positionOf(text, offset) {
  return Object.freeze({ offset, line: text.slice(0, offset).split("\n").length });
}

function collect(text, expression, kind, declaration) {
  return [...text.matchAll(expression)].map((match) => Object.freeze({
    kind, name: match[1], ...(match[2] === undefined ? {} : { arguments: argumentsOf(match[2]) }),
    declaration, position: positionOf(text, match.index),
  }));
}

/**
 * Decode RRP's relationing annotations from a Markdown carrier.  The result is
 * data only: a caller can admit it into SignCell, navigate it as a graph, or
 * render it without this Markdown service owning a database, HTTP route, or
 * publication pipeline.
 */
export function projectRelationingMarkdownAnnotations(text, { source = "markdown" } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (typeof source !== "string" || source.trim() === "") throw new TypeError("source must be a non-empty string");
  const cells = [
    ...collect(text, cellDefinition, "cell", true),
    ...collect(text, cellReference, "cell", false),
  ].filter((entry) => !entry.name.startsWith("close-"));
  const morphisms = [
    ...collect(text, morphDefinition, "morphism", true),
    ...collect(text, morphReference, "morphism", false),
  ].filter((entry) => !entry.name.startsWith("open-"));
  const scopes = [
    ...collect(text, scopeOpen, "scope", true).map((entry) => Object.freeze({ ...entry, operation: "open" })),
    ...collect(text, scopeClose, "scope", false).map((entry) => Object.freeze({ ...entry, operation: "close" })),
  ].sort((left, right) => left.position.offset - right.position.offset);
  const definedCells = new Set(cells.filter((entry) => entry.declaration).map((entry) => entry.name));
  const referencedCells = new Set(cells.filter((entry) => !entry.declaration).map((entry) => entry.name));
  const definedMorphisms = new Set(morphisms.filter((entry) => entry.declaration).map((entry) => entry.name));
  const referencedMorphisms = new Set(morphisms.filter((entry) => !entry.declaration).map((entry) => entry.name));
  const scopeStack = [], diagnostics = [];
  for (const scope of scopes) {
    if (scope.operation === "open") scopeStack.push(scope.name);
    else if (scopeStack.at(-1) === scope.name) scopeStack.pop();
    else diagnostics.push(Object.freeze({ code: "unmatched-scope-close", name: scope.name, position: scope.position }));
  }
  for (const name of scopeStack) diagnostics.push(Object.freeze({ code: "unclosed-scope", name }));
  return Object.freeze({
    kind: "red-cup-engineering.markdown.relationing-annotations", source,
    cells: Object.freeze(cells), morphisms: Object.freeze(morphisms), scopes: Object.freeze(scopes),
    definitions: Object.freeze({ cells: Object.freeze([...definedCells].sort()), morphisms: Object.freeze([...definedMorphisms].sort()) }),
    references: Object.freeze({ cells: Object.freeze([...referencedCells].sort()), morphisms: Object.freeze([...referencedMorphisms].sort()) }),
    diagnostics: Object.freeze(diagnostics),
  });
}
