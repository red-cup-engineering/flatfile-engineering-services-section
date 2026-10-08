import { once } from "node:events";
import { canonical } from "@red-cup-engineering/json-services-section";
import { parseArgs } from "node:util";

export function parseCommaSeparatedTextList(text) {
  if (typeof text !== "string" || text.length === 0) throw new TypeError("text must be a nonempty string");
  const values = text.split(",").map((value) => value.trim());
  if (values.some((value) => value.length === 0)) throw new TypeError("comma-separated values must be nonempty");
  return Object.freeze(values);
}

export const command = Object.freeze({
  run: async ({ argv, stdout }) => {
    const { positionals } = parseArgs({ args: argv, options: {}, allowPositionals: true, strict: true });
    if (positionals.length !== 1) throw new TypeError("usage: parse-comma-separated-text-list TEXT");
    const output = `${canonical(parseCommaSeparatedTextList(positionals[0]))}\n`;
    if (!stdout.write(output)) await once(stdout, "drain");
  },
  exitCode: 1,
});
