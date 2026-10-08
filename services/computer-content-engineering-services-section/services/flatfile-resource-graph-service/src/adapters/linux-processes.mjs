import { basename, extname } from "node:path";
import { readdir, readFile, readlink } from "node:fs/promises";
import { makeCell } from "../kernel/cells.mjs";

function cell(subject, predicate, object) { return makeCell({ subject, predicate, object: String(object) }); }
function statusFields(text) {
  return Object.fromEntries(text.trim().split(/\n/u).map((line) => {
    const at = line.indexOf(":");
    return at < 0 ? [line.trim(), ""] : [line.slice(0, at), line.slice(at + 1).trim()];
  }));
}
function memoryBytes(value) {
  const match = /^(\d+)\s+kB$/u.exec(value ?? "");
  return match ? Number(match[1]) * 1024 : null;
}
function processRoleHint({ command, executable, entrypoint }) {
  const names = `${command} ${executable} ${entrypoint}`.toLowerCase();
  if (/\b(?:codex|claude|gemini|opencode)\b/u.test(names)) return "agent";
  if ([".js", ".mjs", ".cjs", ".ts", ".mts", ".py", ".sh"].includes(extname(entrypoint).toLowerCase())) return "script";
  return "process";
}

async function observeOneProcess({ procRoot, pid, bootId, nodeName, observedAt }) {
  const root = `${procRoot}/${pid}`;
  const [statText, statusText, commandLine, executableLink] = await Promise.all([
    readFile(`${root}/stat`, "utf8"), readFile(`${root}/status`, "utf8"), readFile(`${root}/cmdline`, "utf8").catch(() => ""), readlink(`${root}/exe`).catch(() => ""),
  ]);
  const closing = statText.lastIndexOf(")");
  const opening = statText.indexOf("(");
  if (opening < 0 || closing < opening) throw new Error("process stat has no command field");
  const command = statText.slice(opening + 1, closing);
  const stat = statText.slice(closing + 2).trim().split(/\s+/u);
  if (stat.length < 22) throw new Error("process stat is incomplete");
  const status = statusFields(statusText);
  const argv = commandLine.split("\0").filter(Boolean);
  const executable = executableLink ? basename(executableLink) : basename(argv[0] ?? "");
  const entrypoint = argv[1] && /(?:^|\/)[^/]+\.(?:m?js|cjs|mts|ts|py|sh)$/u.test(argv[1]) ? basename(argv[1]) : "";
  const startTicks = stat[19];
  const resource = `urn:fars:machine:${encodeURIComponent(nodeName)}:process:${encodeURIComponent(bootId)}:${pid}:${startTicks}`;
  const cells = [
    cell(resource, "urn:fars:type", "urn:fars:type:os-process"),
    cell(resource, "urn:fars:host", nodeName),
    cell(resource, "os-pid", pid),
    cell(resource, "os-parent-pid", stat[1]),
    cell(resource, "os-process-state", stat[0]),
    cell(resource, "os-command", command),
    cell(resource, "os-start-ticks", startTicks),
    cell(resource, "os-thread-count", stat[17]),
    cell(resource, "process-role-hint", processRoleHint({ command, executable, entrypoint })),
  ];
  if (executable) cells.push(cell(resource, "os-executable-name", executable));
  if (entrypoint) cells.push(cell(resource, "os-entrypoint-name", entrypoint));
  const uid = status.Uid?.split(/\s+/u)[0];
  if (uid) cells.push(cell(resource, "os-user-id", uid));
  for (const [predicate, value] of [["resident-memory-bytes", memoryBytes(status.VmRSS)], ["virtual-memory-bytes", memoryBytes(status.VmSize)]]) if (value !== null) cells.push(cell(resource, predicate, value));
  return Object.freeze({ resource, focus: resource, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([]) });
}

export async function observeLinuxProcessResourceGraphs({ nodeName, procRoot = "/proc", observedAt = new Date().toISOString() }) {
  const [bootId, entries] = await Promise.all([readFile(`${procRoot}/sys/kernel/random/boot_id`, "utf8"), readdir(procRoot, { withFileTypes: true })]);
  const pids = entries.filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name)).map((entry) => entry.name).sort((a, b) => Number(a) - Number(b));
  const settled = await Promise.allSettled(pids.map((pid) => observeOneProcess({ procRoot, pid, bootId: bootId.trim(), nodeName, observedAt })));
  const resources = [];
  const diagnostics = [];
  for (let index = 0; index < settled.length; index += 1) {
    const outcome = settled[index];
    if (outcome.status === "fulfilled") resources.push(outcome.value);
    else if (!new Set(["ENOENT", "ESRCH", "EACCES", "EPERM"]).has(outcome.reason?.code)) diagnostics.push(Object.freeze({ code: "process-observation-failed", message: `pid ${pids[index]}: ${outcome.reason?.message ?? String(outcome.reason)}` }));
  }
  return Object.freeze({ resources: Object.freeze(resources), diagnostics: Object.freeze(diagnostics) });
}


