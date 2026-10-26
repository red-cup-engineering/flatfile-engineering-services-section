#!/usr/bin/env node
// project-invocations — CLI entrypoint for projectInvocations: the
// latest-wins state readout over one namespace's invocation journal for the
// day named by --at.
//
// One thing: read --data-root, --namespace and --at, print the projected
// state view as JSON, terminate. This does not re-fold entries itself; it
// terminates in exactly one call to the already-composed export (a thin
// composition over witness-journal-state-service's latestPerCell), so
// there is still only one thing happening here, and no logic duplicated
// between src and scripts.

import { parseArgs } from "node:util";

import { projectInvocations } from "../src/index.mjs";

const { values } = parseArgs({
  options: {
    "data-root": { type: "string" },
    namespace: { type: "string" },
    at: { type: "string" },
    help: { type: "boolean", default: false },
  },
});

if (values.help || values["data-root"] === undefined || values.namespace === undefined || values.at === undefined) {
  process.stdout.write(
    "Usage: project-invocations --data-root <path> --namespace <namespace> --at <time>\n\n" +
      "Projects one namespace's invocation journal for the day named by --at\n" +
      "down to one latest-wins answer per (caller, {verb,args,action?}) cell,\n" +
      "and prints the view as JSON.\n",
  );
  process.exit(values.help ? 0 : 1);
}

process.stdout.write(`${JSON.stringify(projectInvocations(values["data-root"], values.namespace, values.at))}\n`);
