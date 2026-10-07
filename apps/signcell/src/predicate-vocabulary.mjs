const NAME = /^[a-z][a-z0-9_-]*$/u;
const freeze = (value) => Object.freeze(value);

function refusal(code, issues) {
  return freeze({ ok: false, refusal: freeze({ code, issues: freeze(issues) }) });
}

/** Admit a named, typed relation vocabulary without imposing domain-specific predicates on SignCell itself. */
export function createPredicateVocabulary(definitions) {
  if (!Array.isArray(definitions)) throw new TypeError("definitions must be an array");
  const issues = [];
  const byName = new Map();
  for (const definition of definitions) {
    if (!definition || typeof definition !== "object") { issues.push("every predicate definition must be an object"); continue; }
    const { name, description, domain, range, category, inverse } = definition;
    if (typeof name !== "string" || !NAME.test(name)) { issues.push("predicate name must be lowercase identifier text"); continue; }
    if (byName.has(name)) { issues.push(`predicate name is duplicated: ${name}`); continue; }
    for (const [field, value] of [["description", description], ["domain", domain], ["range", range], ["category", category]]) {
      if (typeof value !== "string" || value.trim() === "") issues.push(`${name}.${field} must be non-empty text`);
    }
    if (inverse !== undefined && (typeof inverse !== "string" || !NAME.test(inverse))) issues.push(`${name}.inverse must be a predicate name when supplied`);
    byName.set(name, freeze({ name, description, domain, range, category, ...(inverse === undefined ? {} : { inverse }) }));
  }
  for (const definition of byName.values()) {
    if (definition.inverse === undefined) continue;
    const inverse = byName.get(definition.inverse);
    if (!inverse) issues.push(`${definition.name}.inverse is not declared: ${definition.inverse}`);
    else if (inverse.inverse !== definition.name) issues.push(`${definition.name}.inverse is not reciprocated by ${definition.inverse}`);
  }
  if (issues.length) return refusal("invalid-predicate-vocabulary", issues);
  return freeze({ ok: true, value: freeze({ kind: "sign.predicate-vocabulary", definitions: freeze([...byName.values()]) }) });
}

export function findPredicateDefinition(vocabulary, name) {
  if (vocabulary?.kind !== "sign.predicate-vocabulary" || !Array.isArray(vocabulary.definitions)) throw new TypeError("vocabulary must be an admitted SignCell predicate vocabulary");
  return vocabulary.definitions.find((definition) => definition.name === name) ?? null;
}

export function listPredicateDefinitions(vocabulary, { category } = {}) {
  if (vocabulary?.kind !== "sign.predicate-vocabulary" || !Array.isArray(vocabulary.definitions)) throw new TypeError("vocabulary must be an admitted SignCell predicate vocabulary");
  if (category !== undefined && (typeof category !== "string" || category.trim() === "")) throw new TypeError("category must be non-empty text when supplied");
  return freeze(vocabulary.definitions.filter((definition) => category === undefined || definition.category === category));
}
