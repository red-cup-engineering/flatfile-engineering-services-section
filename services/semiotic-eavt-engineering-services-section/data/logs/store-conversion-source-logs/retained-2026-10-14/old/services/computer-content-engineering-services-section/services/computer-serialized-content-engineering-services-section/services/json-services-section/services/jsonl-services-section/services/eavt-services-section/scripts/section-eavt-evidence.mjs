export const inputSchema = Object.freeze({
  type: "object",
  required: ["folded"],
});
export const outputSchema = Object.freeze({
  type: "object",
  required: ["affirmed", "denied", "contradicted"],
});
export function sectionEavtEvidence({ folded } = {}) {
  if (!folded || !Array.isArray(folded.fiber))
    throw new TypeError("folded must contain a fiber");
  const section = { affirmed: [], denied: [], contradicted: [] };
  for (const cell of folded.fiber) {
    const value = cell?.value,
      projection = { predicate: cell?.predicate, object: cell?.object };
    if (value?.pos && value?.neg) section.contradicted.push(projection);
    else if (value?.pos) section.affirmed.push(projection);
    else if (value?.neg) section.denied.push(projection);
  }
  return section;
}
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");

  process.stdout.write(
    `${JSON.stringify(sectionEavtEvidence(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
}
