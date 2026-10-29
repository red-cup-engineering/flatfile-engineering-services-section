#!/usr/bin/env node
// relate-eavt-rows — the effect: the general relational graph read over an in-hand rows array —
// the subjects `e` of rows where (e, predicate, object): "who stands in `predicate` to `object`?"
// Thin: the law lives in src/eavt.mjs. The inverse direction (relateFrom: "what does `subject`
// stand in `predicate` to?") is relate-eavt-rows-from.mjs.
import { relate } from "../src/eavt.mjs";

export default function relateEavtRowsScript(rows, predicate, object) {
  return relate(rows, predicate, object);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [rowsJson, predicate, objectJson] = process.argv.slice(2);
  if (!rowsJson || !predicate || objectJson === undefined) {
    console.error("usage: relate-eavt-rows.mjs <rows-json> <predicate> <object-json>");
    process.exit(1);
  }
  console.log(JSON.stringify(relateEavtRowsScript(JSON.parse(rowsJson), predicate, JSON.parse(objectJson)), null, 2));
}
