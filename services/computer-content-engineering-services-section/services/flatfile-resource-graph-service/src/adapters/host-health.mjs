import { readFile, statfs } from "node:fs/promises";
import { cpus } from "node:os";
import { makeCell } from "../kernel/cells.mjs";

function fields(text) {
  return Object.fromEntries(text.trim().split(/\n/u).map((line) => {
    const separator = line.indexOf(":");
    return separator < 0 ? [line.trim(), ""] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
}

function kibibytes(value) {
  const match = /^(\d+)\s+kB$/u.exec(value ?? "");
  return match ? Number(match[1]) * 1024 : null;
}

function cell(subject, predicate, object) { return makeCell({ subject, predicate, object: String(object) }); }

export async function observeHostHealthResourceGraph({ nodeName, procRoot = "/proc", volumePath = "/", observedAt = new Date().toISOString() }) {
  if (typeof nodeName !== "string" || nodeName.trim() === "") throw new TypeError("nodeName must be a non-empty string");
  const [loadText, uptimeText, memoryText, filesystem] = await Promise.all([
    readFile(`${procRoot}/loadavg`, "utf8"), readFile(`${procRoot}/uptime`, "utf8"), readFile(`${procRoot}/meminfo`, "utf8"), statfs(volumePath),
  ]);
  const load = loadText.trim().split(/\s+/u).slice(0, 3).map(Number);
  const uptimeSeconds = Number(uptimeText.trim().split(/\s+/u)[0]);
  const memory = fields(memoryText);
  const machine = `urn:fars:machine:${encodeURIComponent(nodeName)}`;
  const resource = `${machine}:health:${encodeURIComponent(observedAt)}`;
  const cells = [
    cell(machine, "urn:fars:type", "urn:fars:type:machine"),
    cell(machine, "urn:fars:node-name", nodeName),
    cell(machine, "compute-load-1m", load[0]),
    cell(machine, "compute-load-5m", load[1]),
    cell(machine, "compute-load-15m", load[2]),
    cell(machine, "cpu-core-count", cpus().length),
    cell(machine, "uptime-seconds", uptimeSeconds),
    cell(machine, "free-storage-bytes:/", Number(filesystem.bavail) * Number(filesystem.bsize)),
    cell(machine, "total-storage-bytes:/", Number(filesystem.blocks) * Number(filesystem.bsize)),
  ];
  for (const [predicate, key] of [["free-memory-bytes", "MemAvailable"], ["total-memory-bytes", "MemTotal"], ["free-swap-bytes", "SwapFree"], ["total-swap-bytes", "SwapTotal"]]) {
    const value = kibibytes(memory[key]);
    if (value !== null) cells.push(cell(machine, predicate, value));
  }
  return Object.freeze({ resource, focus: machine, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([]) });
}


