#!/usr/bin/env node
// relate-eavt-rows-from — the effect: the general relational graph read over an in-hand rows
// array, inverse direction — the objects `v` of rows where (subject, predicate, v): "what does
// `subject` stand in `predicate` to?" Thin: the law lives in src/eavt.mjs. The other direction
// (relate: "who stands in `predicate` to `object`?") is relate-eavt-rows.mjs.
import { relateFrom } from "../src/eavt.mjs";

export default function relateEavtRowsFromScript(rows, subject, predicate) {
  return relateFrom(rows, subject, predicate);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowsJson, subject, predicate] = process.argv.slice(2);
  if (!rowsJson || !subject || !predicate) {
    console.error("usage: relate-eavt-rows-from.mjs <rows-json> <subject> <predicate>");
    process.exit(1);
  }
  console.log(JSON.stringify(relateEavtRowsFromScript(JSON.parse(rowsJson), subject, predicate), null, 2));
}
