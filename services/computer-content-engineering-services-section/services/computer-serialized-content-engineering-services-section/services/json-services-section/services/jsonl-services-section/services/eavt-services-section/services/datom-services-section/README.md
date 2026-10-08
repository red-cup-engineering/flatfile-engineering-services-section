# Datom services

A five-part Datom is `[e,a,v,t,reading]`: an EAVT witness with an explicit judgment. Assert/retract facts use the separate `{e,a,v,tx,op}` carrier. They are admitted and folded separately.

Use the named `.mjs` files in `scripts/` directly. Each accepts one JSON value on stdin and returns one JSON value on stdout; the same file exports its function and input/output schemas. `src/index.mjs` only collects exports.

- `settle-row.mjs`: `{row,reading}` → one five-part Datom.
- `settle-entries.mjs`: `{entries:[{row,reading?}]}` → `{datoms,kept}`. Missing reading leaves a witness live; `null` is a judgment.
- `commit-settlement.mjs`: `{root,feed,datoms,kept,at}` → custody paths, or `null` for no settlement. Appends settled records and atomically replaces the live entries.
- `admit-datom-fact.mjs`: validate `{e,a,v,tx,op}`.
- `current-datom-facts.mjs`: ordered assert/retract facts → live cells.
- `fold-datom-evidence.mjs`: facts → per-cell assertion and retraction evidence.
- `parse-datoms.mjs` / `serialize-datoms.mjs`: JSONL ↔ five-part Datoms.

Example: `echo '{"row":{"e":"s","a":"p","v":3,"t":1},"reading":true}' | node scripts/settle-row.mjs`
