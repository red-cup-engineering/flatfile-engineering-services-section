import { once } from "node:events";
import { parseArgs } from "node:util";

export function admitNonemptySingleLineText(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\n") || value.includes("\r")) {
    throw new TypeError("value must be one nonempty line of text");
  }
  return value;
}

export const command = Object.freeze({
  run: async ({ argv, stdout }) => {
    const { positionals } = parseArgs({ args: argv, options: {}, allowPositionals: true, strict: true });
    if (positionals.length !== 1) throw new TypeError("exactly one text argument is required");
    const output = `${admitNonemptySingleLineText(positionals[0])}\n`;
    if (!stdout.write(output)) await once(stdout, "drain");
  },
  exitCode: 1,
});
