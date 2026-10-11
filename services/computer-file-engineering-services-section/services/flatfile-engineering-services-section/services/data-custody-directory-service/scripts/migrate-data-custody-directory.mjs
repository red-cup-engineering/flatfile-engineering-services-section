#!/usr/bin/env node
import { dirname } from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkDataCustodyDirectory } from "./check-data-custody-directory.mjs";
import {
  applyDataCustodyMigrationPlan,
  planDataCustodyMigration,
} from "../src/migrate-data-custody-directory.mjs";

/**
 * @param {string} metaUrl
 * @returns {boolean} whether this module was invoked directly (a bin symlink resolves through realpath)
 */
function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

/**
 * Resolve the `data/` directory a migration targets, from either an
 * explicit `--data-dir` or a section `--package` root resolved through
 * the package's own `checkDataCustodyDirectory` resolver.
 *
 * @param {Readonly<{dataDir?: string, packageDir?: string}>} options
 * @returns {string}
 * @throws {Error} when neither option is given
 */
export function resolveMigrationDataDir({ dataDir, packageDir }) {
  if (dataDir) return dataDir;
  if (packageDir) return checkDataCustodyDirectory(packageDir).dataDirectory;
  throw new Error("migrate-data-custody-directory: one of --data-dir or --package is required");
}

/**
 * Migrate every offending top-level entry under a `data/` directory into
 * the lawful `logs`/`records`/`state` trio (or purge empty directories),
 * either previewing the plan or applying it and re-running the checker
 * as a gate.
 *
 * @param {string} dataDir - absolute path to a section's `data/` directory
 * @param {Readonly<{apply?: boolean}>} [options]
 * @returns {Readonly<{
 *   kind: "data-custody-directory.migration",
 *   dataDir: string,
 *   rows: readonly unknown[],
 *   refusals: readonly unknown[],
 *   applied: readonly unknown[] | null,
 *   offendersAfter: number | null,
 *   ok: boolean,
 * }>}
 */
export function migrateDataCustodyDirectory(dataDir, { apply = false } = {}) {
  const plan = planDataCustodyMigration(dataDir);

  if (!apply) {
    return Object.freeze({
      kind: "data-custody-directory.migration",
      dataDir,
      rows: plan.rows,
      refusals: plan.refusals,
      applied: null,
      offendersAfter: null,
      ok: plan.refusals.length === 0,
    });
  }

  const applied = applyDataCustodyMigrationPlan(dataDir, plan.rows);
  const root = dirname(dataDir);
  const gate = checkDataCustodyDirectory(root);
  const offendersAfter = gate.offenders.length;

  return Object.freeze({
    kind: "data-custody-directory.migration",
    dataDir,
    rows: plan.rows,
    refusals: plan.refusals,
    applied,
    offendersAfter,
    ok: plan.refusals.length === 0 && offendersAfter === 0,
  });
}

/** @type {readonly string[]} */
const USAGE_OPTIONS = Object.freeze(["--data-dir <dir>", "--package <dir>", "--plan", "--apply", "--help"]);

/**
 * @param {Error & {code?: string}} error
 * @returns {string} the unrecognized option token, or "unknown" when it cannot be parsed from the error
 */
function unknownOptionFrom(error) {
  const match = /Unknown option '(--[^']+)'/.exec(error.message);
  return match ? match[1] : "unknown";
}

function main(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        "data-dir": { type: "string" },
        package: { type: "string" },
        plan: { type: "boolean", default: false },
        apply: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    if (error.code !== "ERR_PARSE_ARGS_UNKNOWN_OPTION") throw error;
    console.log(JSON.stringify({
      kind: "data-custody.migrate.refusal",
      reason: "unknown-option",
      option: unknownOptionFrom(error),
      usage: USAGE_OPTIONS,
    }, null, 2));
    process.exit(2);
    return;
  }

  if (values.help) {
    console.log(JSON.stringify({ kind: "data-custody.migrate.usage", options: USAGE_OPTIONS }, null, 2));
    process.exit(0);
    return;
  }

  let dataDir;
  try {
    dataDir = resolveMigrationDataDir({ dataDir: values["data-dir"], packageDir: values.package });
  } catch (error) {
    console.error("usage: migrate-data-custody-directory.mjs (--data-dir <dir> | --package <dir>) [--plan|--apply]");
    console.error(error.message);
    process.exit(1);
  }

  const apply = values.apply === true;
  const result = migrateDataCustodyDirectory(dataDir, { apply });
  console.log(JSON.stringify(result, null, 2));

  if (result.refusals.length > 0) {
    process.exit(1);
  }
  if (apply && result.offendersAfter !== 0) {
    process.exit(1);
  }
}

if (isEntrypoint(import.meta.url)) {
  main(process.argv.slice(2));
}
