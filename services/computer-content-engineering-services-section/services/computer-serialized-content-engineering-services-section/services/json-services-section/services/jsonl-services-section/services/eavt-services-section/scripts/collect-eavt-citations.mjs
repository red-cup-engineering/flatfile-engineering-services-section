const niPattern = /ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}/g;
const entityPattern = /\b[a-zA-Z][a-zA-Z0-9_-]*:[A-Za-z0-9_-]{43}\b/g;
import { readFileSync } from "node:fs";

export const inputSchema = Object.freeze({});
export const outputSchema = Object.freeze({
  type: "array",
  items: { type: "string" },
});

/** Collect unique content-address citations from an arbitrary JSON value. */
export function citations(value) {
  const found = new Set(),
    pending = [value];
  while (pending.length) {
    const child = pending.pop();
    if (typeof child === "string") {
      const spans = [...child.matchAll(niPattern)];
      for (const match of spans) found.add(match[0]);
      let remainder = "",
        cursor = 0;
      for (const match of spans) {
        remainder +=
          child.slice(cursor, match.index) + " ".repeat(match[0].length);
        cursor = match.index + match[0].length;
      }
      remainder += child.slice(cursor);
      for (const match of remainder.matchAll(entityPattern))
        found.add(match[0]);
    } else if (Array.isArray(child)) pending.push(...child);
    else if (child && typeof child === "object")
      pending.push(...Object.values(child));
  }
  return [...found];
}

if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(citations(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
