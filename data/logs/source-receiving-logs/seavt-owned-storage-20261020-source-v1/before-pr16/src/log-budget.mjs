/**
 * Daily byte budgets for log feeds, and the append-time guard that enforces the hard cap.
 *
 * A root's budget is one tracked state file, `data/state/log-budget-state/budget.json`:
 *
 *   { "profile": "seavt-log-budget/1",
 *     "default": { "budget": 33554432, "cap": 134217728 },
 *     "feeds":   { "arrival": { "budget": 1048576, "cap": 8388608 } } }
 *
 * - `budget`: the most uncompressed bytes a feed should write in one day. `seavt-volume --check` exits nonzero
 *   for a feed-day above it.
 * - `cap`: the most uncompressed bytes the day's open file may hold. A writer that opted into a guard has the
 *   append refused past it, so a runaway feed cannot fill a disk.
 * A feed absent from `feeds` takes `default`; a missing file takes DEFAULT_BUDGET. A feed is the log directory's
 * name without `-logs`.
 */
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { StoreError, logsDirectory, stateDirectory } from "./layout.mjs";

export const BUDGET_PROFILE = "seavt-log-budget/1";
const MIB = 1_048_576;
/** What a feed gets when the root says nothing: 32 MiB a day to be within budget, 128 MiB a day as the hard cap. */
export const DEFAULT_BUDGET = Object.freeze({ budget: 32 * MIB, cap: 128 * MIB });

export const budgetFile = (root) => join(stateDirectory(root, "log-budget"), "budget.json");

const isCount = (n) => Number.isSafeInteger(n) && n > 0;
function checkLimits(limits, where) {
  if (limits === null || typeof limits !== "object" || Array.isArray(limits)) throw new StoreError("budget", `${where}: budget and cap are required`);
  const { budget, cap } = limits;
  if (!isCount(budget) || !isCount(cap) || cap < budget) throw new StoreError("budget", `${where}: budget and cap are positive byte counts with cap at least budget`);
  return { budget, cap };
}

/** The root's budget, validated: `{default, feeds}`. A missing file is DEFAULT_BUDGET with no feeds. */
export function readBudget(root) {
  let text;
  try { text = readFileSync(budgetFile(root), "utf8"); } catch (error) {
    if (error.code === "ENOENT") return { default: DEFAULT_BUDGET, feeds: {} };
    throw error;
  }
  const body = JSON.parse(text);
  if (body?.profile !== BUDGET_PROFILE) throw new StoreError("budget", `${budgetFile(root)} is not a ${BUDGET_PROFILE} file`);
  const feeds = {};
  for (const [feed, limits] of Object.entries(body.feeds ?? {})) feeds[feed] = checkLimits(limits, `feed ${feed}`);
  return { default: body.default === undefined ? DEFAULT_BUDGET : checkLimits(body.default, "default"), feeds };
}

export const limitsOf = (budget, feed) => budget.feeds[feed] ?? budget.default;

/** Replace the root's budget file atomically. */
export function writeBudget(root, { default: fallback = DEFAULT_BUDGET, feeds = {} }) {
  const file = budgetFile(root), body = { profile: BUDGET_PROFILE, default: checkLimits(fallback, "default"), feeds: {} };
  for (const feed of Object.keys(feeds).sort()) body.feeds[feed] = checkLimits(feeds[feed], `feed ${feed}`);
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.partial`;
  writeFileSync(temporary, `${JSON.stringify(body, null, 2)}\n`);
  renameSync(temporary, file);
  return file;
}

/**
 * The guard a writer holds and passes to `append(root, type, line, { guard })`. It reads the budget once (pass
 * `budget` to supply one, or `reread: ms` to re-read the file at most that often) and keeps only the set of
 * feed-days it has already announced. The first refusal of a feed-day prints one line to `log` (default stderr)
 * and writes `<date>.capped` beside the day's file, so another process and an operator see it once, durably; every
 * later append of that day is refused without another message.
 */
export function logGuard(root, { budget, reread, log = (message) => process.stderr.write(`${message}\n`), now = Date.now } = {}) {
  let current = budget ?? readBudget(root), loaded = now();
  const announced = new Set();
  return {
    capOf(type) {
      if (budget === undefined && reread !== undefined && now() - loaded >= reread) { current = readBudget(root); loaded = now(); }
      return limitsOf(current, type).cap;
    },
    refuse(root_, type, date, size, cap) {
      const key = `${root_}\0${type}\0${date}`;
      if (announced.has(key)) return;
      announced.add(key);
      log(`log-cap: ${type} ${date} holds ${size} bytes of its ${cap}-byte daily cap; further appends of this feed-day are refused`);
      try {
        const fd = openSync(join(logsDirectory(root_, type), `${date}.capped`), "wx", 0o644);
        try { writeSync(fd, `${JSON.stringify({ feed: type, date, size, cap, at: new Date(now()).toISOString() })}\n`); } finally { closeSync(fd); }
      } catch { /* already marked, or the directory is gone */ }
    },
  };
}
