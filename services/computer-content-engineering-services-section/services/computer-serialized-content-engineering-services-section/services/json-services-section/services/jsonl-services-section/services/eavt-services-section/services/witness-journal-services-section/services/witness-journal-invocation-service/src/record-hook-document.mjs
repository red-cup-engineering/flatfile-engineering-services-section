const ACTION = "scripts.record-hook-document";

export function recordHookDocument(document) {
  const rows = readEavtDocument(document);
  const additions = subjectsForAction(rows).flatMap(({ subject, facts }) => {
    const event = firstString(facts, "operations-manifold.hook.event") ?? firstString(facts, "codex.hook_event_name");
    if (event === undefined) return [
      fact(subject, "operations-manifold.script.obstruction", "missing-record-hook-event"),
      fact(subject, "operations-manifold.result.admitted", false),
    ];
    return [
      fact(subject, "operations-manifold.result.recorded", true),
      fact(subject, "operations-manifold.operation.event", "record-hook-event"),
      fact(subject, "operations-manifold.operation.predicate", `operations-manifold.hook.${slug(event)}`),
      fact(subject, "operations-manifold.hook.recorded", true),
    ];
  });
  return writeEavtDocument([...rows, ...additions]);
}

export function readEavtDocument(text) {
  if (typeof text !== "string") throw new TypeError("hook document must be text");
  return Object.freeze(text.split(/\r?\n/u).filter((line) => line.trim() !== "").map((line, index) => {
    const row = JSON.parse(line);
    if (!Array.isArray(row) || row.length !== 4) throw new TypeError(`hook document line ${index + 1} must be an EAVT row`);
    return Object.freeze(row);
  }));
}

function subjectsForAction(rows) {
  const bySubject = new Map();
  for (const [subject, attribute, value] of rows) {
    const key = JSON.stringify(subject);
    const entry = bySubject.get(key) ?? { subject, facts: new Map() };
    entry.facts.set(attribute, [...(entry.facts.get(attribute) ?? []), value]);
    bySubject.set(key, entry);
  }
  return [...bySubject.values()].filter(({ facts }) => (facts.get("operations-manifold.script.action") ?? []).includes(ACTION));
}

function firstString(facts, predicate) {
  return (facts.get(predicate) ?? []).find((value) => typeof value === "string" && value.trim() !== "");
}

function fact(subject, predicate, value) {
  return Object.freeze([subject, predicate, value, Object.freeze(["witness-journal-invocation-service", "script", ACTION])]);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "event";
}

function writeEavtDocument(rows) {
  const unique = new Map(rows.map((row) => [JSON.stringify(row), row]));
  return [...unique.values()].map((row) => JSON.stringify(row)).join("\n") + (unique.size === 0 ? "" : "\n");
}
