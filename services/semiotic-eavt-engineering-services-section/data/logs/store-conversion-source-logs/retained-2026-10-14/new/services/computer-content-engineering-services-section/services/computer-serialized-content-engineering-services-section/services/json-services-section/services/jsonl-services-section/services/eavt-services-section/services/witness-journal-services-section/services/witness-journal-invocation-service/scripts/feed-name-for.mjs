#!/usr/bin/env node
// feed-name-for — CLI entrypoint for feedNameFor: the dated, namespace-scoped
// feed name one namespace's invocations land in for one day.
//
// One thing: read --namespace and --at, print the derived feed name as
// JSON, terminate. No logic duplicated here — this wraps the single
// exported function that src/index.mjs already owns.

import { parseArgs } from "node:util";

import { feedNameFor } from "../src/index.mjs";

const { values } = parseArgs({
  options: {
    namespace: { type: "string" },
    at: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || values.namespace === undefined || values.at === undefined) {
  process.stdout.write(
    "Usage: feed-name-for --namespace <namespace> --at <time>\n\n" +
      "Prints the dated feed name one namespace's invocations land in for the\n" +
      "day named by --at: `<date>-<slug(namespace)>-log`, as JSON.\n",
  );
  process.exit(values.help ? 0 : 1);
}

process.stdout.write(`${JSON.stringify(feedNameFor(values.namespace, values.at))}\n`);
