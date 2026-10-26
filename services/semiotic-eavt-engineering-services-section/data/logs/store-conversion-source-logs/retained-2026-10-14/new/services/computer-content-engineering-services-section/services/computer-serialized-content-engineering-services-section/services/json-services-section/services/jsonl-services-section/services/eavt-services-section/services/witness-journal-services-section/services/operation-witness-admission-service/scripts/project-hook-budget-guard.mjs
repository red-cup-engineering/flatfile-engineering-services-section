#!/usr/bin/env node
import { readFileSync } from "node:fs"; import { projectHookBudgetGuard } from "../src/hook-budget-guard.mjs"; export { projectHookBudgetGuard };
if (import.meta.main) { const input = JSON.parse(readFileSync(0, "utf8")); process.stdout.write(`${JSON.stringify(projectHookBudgetGuard(input))}\n`); }
