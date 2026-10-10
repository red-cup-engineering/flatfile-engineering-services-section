#!/usr/bin/env node
/**
 * @skill writing-a-schema
 * @verb-phrase writing a schema
 * @closure-kind process
 * @description Writes a JSON Schema into the schema pool from data, refusing one that is unsatisfiable, self-contradictory, or names references that do not resolve; and with --check, validates every seated schema. Use when adding a record type, changing a type's contract, or proving the pool still says what it claims. A schema is a record like any other, so it is written by a script and checked by a machine rather than typed and hoped over.
 *
 * @precondition the data is valid JSON and declares $id and type; $schema, when absent, is the one admitted dialect (Draft 2020-12)
 * @precondition $id agrees with the filename, so a schema resolves by the name it is filed under
 * @precondition every required key is declarable, so the schema is satisfiable by some document
 * @precondition every $ref resolves, to a local $def or to a sibling schema's $id in the pool
 * @postcondition the schema is seated in the pool and reads back byte-identical
 * @postcondition every other schema in the pool still parses and still resolves against it
 * @witness the $id written and the path it was written to
 * @witness on refusal, which invariant failed and the exact JSON pointer it failed at
 * @witness on --check, every schema checked and every unsatisfiable or dangling one named
 *
 * A schema is a record. It is not a special thing that lives outside the system
 * that governs records — that exemption is what let the pool reach a state where
 * `office.schema.json` required a key its own `properties` did not declare under
 * `additionalProperties: false`, which is a contract **no document can satisfy**,
 * sitting in the pool reading as authority.
 *
 * ## What it refuses, and why that is the skill
 *
 * Writing JSON is trivial. These are the states a schema can reach that read as
 * correct and are not:
 *
 * - **Unsatisfiable.** `additionalProperties: false` plus a `required` key that
 *   `properties` does not declare. Every document fails; the failure looks like
 *   the documents' fault. This has already happened here.
 * - **A dangling `$ref`.** A `$ref` to a `$def` that does not exist, or to a
 *   sibling `$id` not in the pool. The reference reads as a constraint and
 *   constrains nothing.
 * - **`$id` disagreeing with its filename.** The pool resolves a schema by the
 *   name it is filed under; a mismatch means a record validated against a
 *   contract other than the one its author named.
 * - **An unparseable sibling.** A schema mid-write breaks every schema that
 *   refs it, so the pool is checked whole rather than one file at a time.
 *
 * ## The validator
 *
 * The canonical JSON Schema service owns schema semantics: admission is
 * `admitSchema`, the authoring invariants are `inspectSchemaCorpus` over the
 * pool, and the judgment of an instance is the one validator of `src/index.mts`.
 * This node-local writer owns only filename seating, atomic write/retraction,
 * and the negative control against the schema after it has been seated.
 *
 * The bounded vocabulary **refuses a schema using a keyword it does not
 * implement**, rather than ignoring it. Silently ignoring an unimplemented
 * keyword is how a schema comes to report itself enforced while enforcing
 * nothing.
 *
 * ## Run it
 *
 * ```sh
 * node .../write-a-schema.js --check                 # validate the whole pool
 * echo '{...}' | node .../write-a-schema.js          # seat a new schema
 * echo '{...}' | node .../write-a-schema.js --amend  # change a seated one
 * ```
 *
 * `--pool` names the pool directly. Otherwise resolution walks up from
 * `--from` (default: the caller's working directory), and only where that
 * walk finds nothing does it walk up from this script's own file location
 * before refusing — a bare invocation run from above the pool, such as the
 * repository root, still finds the pool this script is seated beside.
 *
 * Input is JSON. Output is JSON. The same operation is importable:
 * `writeSchema({ pool, schema, amend, dryRun })` and `checkSchemaPool({ pool })`
 * return their results and throw their refusals instead of printing and exiting.
 *
 * ## When NOT to use
 *
 * - Not for writing a record against a schema — that is write-an-office and its
 *   siblings.
 * - Not for inventing a record type nobody asked for. A schema is a claim that a
 *   kind of thing exists; making one is a decision, and this only performs it.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { admitSchema } from "../../../scripts/admit-schema.mjs";
import { inspectSchemaCorpus } from "../../../scripts/inspect-schema-corpus.mjs";
import { inspectSchemaPool } from "../../../scripts/inspect-schema-pool.mjs";
import { discoverSchemaPool, readSchemaPool } from "../../../scripts/read-schema-pool.mjs";
import { schemaCorpus, validateInstance } from "../../../dist/index.mjs";

import contract from "../../../schemas/write-schema.json" with { type: "json" };
export const inputSchema = contract.input;
export const outputSchema = contract.output;

const line = ({ pointer, keyword, message }) => `${pointer || "$"}: ${keyword}: ${message}`;

/**
 * Seat one schema into the pool, or refuse and leave the pool as it was. A new schema is refused if its
 * file exists (use `amend`), an amendment if its file does not; a schema that is unusable as a contract,
 * that would leave a sibling broken, or that admits the empty object is never left seated.
 */
export function writeSchema({ pool, schema: input, amend = false, dryRun = false }) {
  const schema = admitSchema({ schema: input, allowUnknownAnnotations: true }).schema;
  const stem = schema.$id
    .split("/")
    .at(-1)
    .replace(/\.schema\.json$|\.json$/u, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(stem))
    throw new TypeError("schema id needs a filename-safe final segment");
  const entry = `${stem}.schema.json`;
  const { records } = readSchemaPool({ pool });
  const path = join(resolve(pool), entry);
  const exists = existsSync(path);
  if (exists && !amend) throw new TypeError(`${entry} already exists — refused, never overwritten; use amend`);
  if (!exists && amend) throw new TypeError(`${entry} seats nowhere — amend edits what exists`);

  const siblings = records.filter((record) => record.path !== path).map((record) => record.schema);
  const { errors } = inspectSchemaCorpus({ schemas: [...siblings, schema] });
  const own = errors.filter((error) => error.schema === schema.$id);
  if (own.length) throw new TypeError(`${entry} is not a usable contract: ${own.map(line).join("; ")}`);
  if (errors.length) throw new TypeError(`writing ${entry} would leave siblings broken: ${JSON.stringify(errors)}`);

  if (dryRun) return { ok: true, dryRun: true, path, schema: schema.$id };

  // Retraction, not repair. Every check below runs against the schema AS SEATED,
  // because that is the only state anything else will ever read it in — and a
  // schema that fails one is withdrawn whole rather than left half-seated for
  // the next reader to trust.
  const text = `${JSON.stringify(schema, null, 2)}\n`;
  const prior = exists ? readFileSync(path, "utf8") : null;
  const retract = () => (prior === null ? unlinkSync(path) : writeFileSync(path, prior));
  writeFileSync(path, text);
  try {
    if (readFileSync(path, "utf8") !== text)
      throw new TypeError(`${entry} was written but does not read back byte-identical; withdrawn`);
    // The negative control: a term must be able to REFUSE something, or it judges
    // nothing. Run the seated schema against `{}` through the one validator, because
    // a schema whose emptiness passes is the silent-green failure that makes a check
    // worse than no check.
    let verdict;
    try {
      const seated = readSchemaPool({ pool }).records;
      const target = seated.find((record) => record.path === path);
      verdict = validateInstance({}, target.schema, schemaCorpus(seated.map((record) => record.schema)));
    } catch (error) {
      throw new TypeError(`⊥ cannot judge the seated ${entry}: ${error instanceof Error ? error.message : String(error)}; withdrawn`);
    }
    if (verdict.ok)
      throw new TypeError(`${entry} admits the empty object — this term refuses nothing and can judge nothing; withdrawn`);
  } catch (error) {
    retract();
    throw error;
  }
  return { ok: true, dryRun: false, path, schema: schema.$id };
}

/** Validate the whole pool and report by file: what could not be read, what each schema fails, and an empty pool as broken. */
export function checkSchemaPool({ pool }) {
  const inspected = inspectSchemaPool({ pool });
  const report = { ok: inspected.ok, checked: inspected.checked, schemas: [] };
  const files = new Map(), broken = {};
  for (const error of inspected.errors) {
    if (error.keyword === "pool") report.error = error.message;
    else if (error.keyword === "file") broken[basename(error.path)] = error.message;
    else files.set(basename(error.path), [...(files.get(basename(error.path)) ?? []), line(error)]);
  }
  for (const [file, errors] of files) report.schemas.push({ file, errors });
  if (Object.keys(broken).length) report.broken = broken;
  return report;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      "  node write-a-schema.js --check                 # validate the whole pool",
      "  echo '{...}' | node write-a-schema.js          # seat a new schema",
      "  echo '{...}' | node write-a-schema.js --amend  # change a seated one",
      "  node write-a-schema.js --help",
      "",
      "Input is JSON. Output is JSON.",
    ].join("\n") + "\n",
  );
}

function main(args) {
  const argValue = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const out = (value, code = 0) => {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
    process.exit(code);
  };
  const die = (message) => out({ ok: false, error: message }, 1);

  if (args.includes("--help")) return printUsage();
  const FROM = argValue("--from") ?? process.cwd();
  // FROM (explicit --from, or its cwd default) walks first; only where that finds no pool does the
  // walk retry from this script's own file location — a fallback, never a preference.
  const POOL = argValue("--pool") ?? discoverSchemaPool({ from: FROM, near: dirname(fileURLToPath(import.meta.url)) });

  // ⊥ — no unit at or above the asking point carries a schema pool. An absence,
  // not an empty pool: seating a class into a pool that does not exist would
  // create the unit's schema pool as a side effect of writing one class into it.
  if (!POOL || !existsSync(POOL))
    die(`⊥ no schema pool at or above ${FROM} — nothing carries lib/schemas. Pass --pool to name one, or --from to ask from somewhere else.`);

  if (args.includes("--check")) {
    const report = checkSchemaPool({ pool: POOL });
    out(report, report.ok ? 0 : 1);
  }

  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a schema is written from data, never typed into a file");
  let schema;
  try {
    schema = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }
  if (typeof schema?.$id !== "string" || !schema.$id) die("$: no $id — a schema with no address cannot be referenced");

  const amend = args.includes("--amend");
  let result;
  try {
    result = writeSchema({ pool: POOL, schema, amend, dryRun: args.includes("--dry-run") });
  } catch (error) {
    die(error instanceof Error ? error.message : String(error));
  }
  if (result.dryRun) out({ ok: true, dryRun: true, would: { write: relative(FROM, result.path) } });
  out({ ok: true, [amend ? "amended" : "seated"]: { $id: result.schema, path: relative(FROM, result.path) } });
}

if (import.meta.main) main(process.argv.slice(2));
