import { createDatedStateCustody } from "../src/dated-state-writing.mjs";

async function readJson(io) {
  let text = "";
  io.stdin.setEncoding("utf8");
  for await (const chunk of io.stdin) text += chunk;
  return JSON.parse(text);
}

export async function readDatedState({ root, ...request } = {}) {
  const result = await createDatedStateCustody({ root }).get(request);
  return result === null ? null : Object.freeze({
    path: result.path,
    bytes: Object.freeze({ encoding: "base64url", value: result.bytes.toString("base64url") }),
  });
}

export async function runReadDatedState(io) {
  const result = await readDatedState(await readJson(io));
  io.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runReadDatedState({ stdin, stdout, stderr }),
  formatError: (error) => `read-dated-state: ${error.message}\n`,
  exitCode: 1,
});
