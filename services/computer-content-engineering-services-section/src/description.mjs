function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a record`);
  }
  return value;
}

function nonemptyText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be nonempty text`);
  }
  return value.trim();
}

function exactKeys(value, keys, label) {
  const actual = Object.keys(value).sort().join(",");
  const expected = [...keys].sort().join(",");
  if (actual !== expected) throw new TypeError(`${label} must carry exactly ${expected}`);
}

function sentenceCount(text) {
  return text.split(/(?<=[.!?])(?:\s+|$)/u).filter(Boolean).length;
}

function applyConsumerParameters(text, parameters) {
  record(parameters, "description parameters");
  const allowed = new Set(["maximumCharacters", "maximumSentences", "minimumCharacters", "minimumSentences", "registerPattern"]);
  for (const key of Object.keys(parameters)) {
    if (!allowed.has(key)) throw new TypeError(`unsupported description parameter: ${key}`);
  }
  for (const key of ["minimumCharacters", "maximumCharacters", "minimumSentences", "maximumSentences"]) {
    if (parameters[key] !== undefined && (!Number.isInteger(parameters[key]) || parameters[key] < 0)) {
      throw new TypeError(`${key} must be a nonnegative integer`);
    }
  }
  if (parameters.minimumCharacters !== undefined && text.length < parameters.minimumCharacters) throw new TypeError("description is shorter than the consumer permits");
  if (parameters.maximumCharacters !== undefined && text.length > parameters.maximumCharacters) throw new TypeError("description is longer than the consumer permits");
  const sentences = sentenceCount(text);
  if (parameters.minimumSentences !== undefined && sentences < parameters.minimumSentences) throw new TypeError("description has fewer sentences than the consumer permits");
  if (parameters.maximumSentences !== undefined && sentences > parameters.maximumSentences) throw new TypeError("description has more sentences than the consumer permits");
  if (parameters.registerPattern !== undefined) {
    if (!(parameters.registerPattern instanceof RegExp)) throw new TypeError("registerPattern must be a regular expression");
    const registerPattern = new RegExp(parameters.registerPattern.source, parameters.registerPattern.flags);
    if (!registerPattern.test(text)) throw new TypeError("description does not use the consumer's admitted register");
  }
}

/**
 * Admits a carrier-independent description as grounded predicates about a subject for one consumer decision.
 * @param {object} candidate A Description@1 record.
 * @param {object} [parameters] Optional consumer-owned length, sentence, and register constraints.
 * @returns {object} A deeply frozen admitted Description@1 record.
 */
export function admitDescription(candidate, parameters = {}) {
  record(candidate, "description");
  exactKeys(candidate, ["consumer", "neighbors", "predicates", "subject", "text", "type", "version"], "description");
  if (candidate.type !== "Description" || candidate.version !== 1) throw new TypeError("description type and version must be Description@1");

  const subject = record(candidate.subject, "description subject");
  exactKeys(subject, ["kind"], "description subject");
  const subjectKind = nonemptyText(subject.kind, "description subject kind");

  const consumer = record(candidate.consumer, "description consumer");
  exactKeys(consumer, ["decision", "kind"], "description consumer");
  const consumerKind = nonemptyText(consumer.kind, "description consumer kind");
  const consumerDecision = nonemptyText(consumer.decision, "description consumer decision");
  const text = nonemptyText(candidate.text, "description text");
  applyConsumerParameters(text, parameters);

  if (!Array.isArray(candidate.neighbors) || candidate.neighbors.length === 0) throw new TypeError("description must name at least one relevant same-typed neighbor class");
  const neighbors = candidate.neighbors.map((value, index) => {
    const neighbor = record(value, `description neighbor ${index}`);
    exactKeys(neighbor, ["contrast", "kind"], `description neighbor ${index}`);
    const kind = nonemptyText(neighbor.kind, `description neighbor ${index} kind`);
    const contrast = nonemptyText(neighbor.contrast, `description neighbor ${index} contrast`);
    if (kind !== subjectKind) throw new TypeError("description neighbors must have the subject's kind");
    return { kind, contrast };
  });
  if (new Set(neighbors.map(({ contrast }) => contrast)).size !== neighbors.length) throw new TypeError("description neighbor contrasts must be unique");

  if (!Array.isArray(candidate.predicates) || candidate.predicates.length === 0) throw new TypeError("description must predicate something about its subject");
  const predicates = candidate.predicates.map((value, index) => {
    const predicate = record(value, `description predicate ${index}`);
    exactKeys(predicate, ["claim", "grounds", "separatesFrom"], `description predicate ${index}`);
    const claim = nonemptyText(predicate.claim, `description predicate ${index} claim`);
    if (!Array.isArray(predicate.grounds) || predicate.grounds.length === 0) throw new TypeError("every description predicate must be grounded");
    const grounds = predicate.grounds.map((ground, groundIndex) => nonemptyText(ground, `description predicate ${index} ground ${groundIndex}`));
    if (!Array.isArray(predicate.separatesFrom)) throw new TypeError("description predicate separatesFrom must be an array");
    const separatesFrom = predicate.separatesFrom.map((contrast, contrastIndex) => nonemptyText(contrast, `description predicate ${index} contrast ${contrastIndex}`));
    return { claim, grounds, separatesFrom };
  });

  const separated = new Set(predicates.flatMap(({ separatesFrom }) => separatesFrom));
  for (const { contrast } of neighbors) {
    if (!separated.has(contrast)) throw new TypeError(`description lacks a grounded predicate separating it from ${contrast}`);
  }

  const admitted = {
    type: "Description",
    version: 1,
    subject: { kind: subjectKind },
    consumer: { kind: consumerKind, decision: consumerDecision },
    text,
    predicates: predicates.map((predicate) => Object.freeze({ ...predicate, grounds: Object.freeze(predicate.grounds), separatesFrom: Object.freeze(predicate.separatesFrom) })),
    neighbors: neighbors.map((neighbor) => Object.freeze(neighbor)),
  };
  Object.freeze(admitted.subject);
  Object.freeze(admitted.consumer);
  Object.freeze(admitted.predicates);
  Object.freeze(admitted.neighbors);
  return Object.freeze(admitted);
}
