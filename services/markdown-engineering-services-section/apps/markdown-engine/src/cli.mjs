import { invokeMarkdownService, markdownOperationNames } from "../../../scripts/markdown-services.mjs";

export async function main(arguments_, { read, write }) {
  const [operation] = arguments_;
  if (!markdownOperationNames.includes(operation)) {
    throw new TypeError(`usage: markdown-engine OPERATION < REQUEST.json (one of: ${markdownOperationNames.join(", ")})`);
  }
  const request = JSON.parse(await read());
  const result = await invokeMarkdownService(operation, request);
  write(`${JSON.stringify(result)}\n`);
  return result;
}

async function readText(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export const command = Object.freeze({
  run: ({ argv, stdin, stdout }) => main(argv, { read: () => readText(stdin), write: (text) => stdout.write(text) }),
  exitCode: 1,
});
