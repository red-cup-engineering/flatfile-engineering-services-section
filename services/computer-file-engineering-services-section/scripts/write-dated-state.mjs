import { createDatedStateCustody } from "../src/dated-state-writing.mjs";

function decodeBytes(carrier) {
  if (carrier?.encoding !== "base64url" || typeof carrier.value !== "string" || carrier.value.includes("=")) {
    throw new TypeError('bytes must be canonical {"encoding":"base64url","value":"..."}');
  }
  const bytes = Buffer.from(carrier.value, "base64url");
  if (bytes.toString("base64url") !== carrier.value) throw new TypeError("bytes is not canonical base64url");
  return bytes;
}

async function readJson(io) {
  let text = "";
  io.stdin.setEncoding("utf8");
  for await (const chunk of io.stdin) text += chunk;
  return JSON.parse(text);
}

export async function writeDatedState({ root, bytes, ...request } = {}) {
  return createDatedStateCustody({ root }).put({ ...request, bytes: decodeBytes(bytes) });
}

export async function runWriteDatedState(io) {
  const result = await writeDatedState(await readJson(io));
  io.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runWriteDatedState({ stdin, stdout, stderr }),
  formatError: (error) => `write-dated-state: ${error.message}\n`,
  exitCode: 1,
});
