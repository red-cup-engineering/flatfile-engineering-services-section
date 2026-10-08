#!/usr/bin/env node
import { resolveSchemaPointer } from "@red-cup-engineering/json-schema-services-section/resolve-schema-pointer";
import { readFileSync as readCarrierInput } from "node:fs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { querySemanticRecords } from "./query-semantic-records.mjs";
export const inputSchema = {
  type: "object",
  properties: {
    issuesRoot: { type: "string", minLength: 1 },
    journalRoot: { type: "string", minLength: 1 },
    repositoryRoot: { type: "string", minLength: 1 },
    objectKind: { type: "string", minLength: 1 },
    category: { type: "string", minLength: 1 },
    responseIssuePathPointer: { type: "string" },
    responseHorizonPointer: { type: "string" },
    defaultHorizonDays: { type: "number", minimum: 0 },
    now: { type: "string" },
  },
  required: [
    "issuesRoot",
    "journalRoot",
    "repositoryRoot",
    "objectKind",
    "category",
    "responseIssuePathPointer",
    "responseHorizonPointer",
    "defaultHorizonDays",
  ],
  additionalProperties: false,
};
export const outputSchema = { type: "object" };
export function checkConfiguredSemanticRecordResponses(configuration = {}) {
  const pointer = (document, pointer) => {
      try {
        const resolved = resolveSchemaPointer({ document, pointer });
        return resolved.found ? resolved.value : null;
      } catch {
        return null;
      }
    },
    jsonFiles = (root) =>
      !existsSync(root)
        ? []
        : readdirSync(root, { withFileTypes: true })
            .flatMap((item) => {
              const path = join(root, item.name);
              return item.isDirectory()
                ? jsonFiles(path)
                : item.isFile() && item.name.endsWith(".json")
                  ? [path]
                  : [];
            })
            .sort(),
    issuesRoot = resolve(configuration.issuesRoot),
    repositoryRoot = resolve(configuration.repositoryRoot),
    responses = querySemanticRecords({
      root: resolve(configuration.journalRoot),
      objectKind: configuration.objectKind,
      category: configuration.category,
    }),
    now = new Date(configuration.now ?? Date.now()),
    issues = jsonFiles(issuesRoot).map((absolutePath) => {
      const path = relative(repositoryRoot, absolutePath),
        issue = JSON.parse(readFileSync(absolutePath, "utf8")),
        answer = responses.find(
          (item) =>
            pointer(item.record, configuration.responseIssuePathPointer) ===
            path,
        ),
        match = /(\d{4}-\d{2}-\d{2})-/u.exec(absolutePath.split("/").at(-1)),
        horizonDays = answer
          ? pointer(answer.record, configuration.responseHorizonPointer)
          : configuration.defaultHorizonDays,
        overdue =
          !answer &&
          match &&
          Math.floor(
            (now.getTime() - Date.parse(`${match[1]}T00:00:00Z`)) / 86400000,
          ) >= horizonDays;
      return {
        path,
        id: issue.id ?? issue.name ?? null,
        date: match?.[1] ?? null,
        status: answer ? "answered" : overdue ? "overdue" : "open",
        horizonDays,
        responsivenessRecordId: answer?.id ?? null,
      };
    });
  return {
    issues,
    answered: issues.filter((item) => item.status === "answered").length,
    open: issues.filter((item) => item.status === "open").length,
    overdue: issues.filter((item) => item.status === "overdue").length,
  };
}
if (import.meta.main)
  process.stdout.write(
    JSON.stringify(
      checkConfiguredSemanticRecordResponses(
        JSON.parse(readCarrierInput(0, "utf8")),
      ),
    ) + "\n",
  );
