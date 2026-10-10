import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

function isEntrypoint(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

async function readStandardInput() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

/** Run a single JSON request from standard input when this module is the command entrypoint. */
export async function runJsonCommand(metaUrl, handler) {
  if (!isEntrypoint(metaUrl)) return;
  try {
    const result = await handler(JSON.parse(await readStandardInput()));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
