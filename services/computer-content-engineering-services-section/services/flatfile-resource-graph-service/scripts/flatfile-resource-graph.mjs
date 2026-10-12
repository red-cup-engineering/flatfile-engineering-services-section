import { entities, readEavtEntries, relateFromEavtRows } from "@red-cup-engineering/eavt-services-section";
import { runDischarge, runLint, runReplay, runShow, runValidate, runWitness, runWitnessLog } from "../src/cli/verbs.mjs";
import { getRecord } from "../src/kernel/record-store.mjs";
import { replayEventLog, serializeState } from "../src/kernel/replay.mjs";
import { loadFlatfiles } from "../src/substrate/read-flatfiles.mjs";
import { readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";

const USAGE = `flatfile-resource-graph <verb> [args]

  validate <root>
  lint <root>
  show <root> <slug-or-path>
  witness <root> <witness-id>
  witness-log <root> <channel> <at>
  discharge <root> <record-id>
  replay <root>
  list-entities <flatfile>
  read-imports <flatfile> <entity>
  read-operations <flatfile> <entity>
`;

/** Run one verb against the given streams; the result is the exit status. */
async function main({ argv, stdin, stdout, stderr }) {
  const printAndExit = (value, code = 0) => {
    stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return code;
  };
  const usageError = (message) => {
    stderr.write(`${message}\n\n${USAGE}`);
    return 2;
  };
  const [verb, ...rest] = argv;
  if (verb === undefined || verb === "help" || verb === "--help" || verb === "-h") {
    stdout.write(USAGE);
    return verb === undefined ? 2 : 0;
  }
  switch (verb) {
    case "validate":
    case "lint": {
      const [root] = rest;
      if (!root) return usageError(`${verb}: missing <root>`);
      const loaded = await loadFlatfiles(root);
      const result = verb === "validate" ? runValidate(loaded) : runLint(loaded);
      return printAndExit(result, result.diagnostics.length === 0 ? 0 : 1);
    }
    case "show": {
      const [root, target] = rest;
      if (!root || !target) return usageError("show: missing <root> <slug-or-path>");
      const { notes } = await loadFlatfiles(root);
      const note = runShow(notes, target);
      return printAndExit(note, note === null ? 1 : 0);
    }
    case "witness": {
      const [root, witnessId] = rest;
      if (!root || !witnessId) return usageError("witness: missing <root> <witness-id>");
      const record = runWitness(getRecord(root, witnessId));
      return printAndExit(record, record === null ? 1 : 0);
    }
    case "witness-log": {
      const [root, channel, at] = rest;
      if (!root || !channel || !at) return usageError("witness-log: missing <root> <channel> <at>");
      const rows = [...readLog(root, channel, at.slice(0, 10))].map(({ line }, index) => ({ entry: { e: line.e, a: line.a, v: line.v, t: line.at }, trace: index + 1 }));
      const witnessesById = {};
      for (const row of rows) {
        const id = row.entry.v;
        if (!(id in witnessesById)) witnessesById[id] = getRecord(root, id);
      }
      return printAndExit(runWitnessLog(rows, witnessesById));
    }
    case "discharge": {
      const [root, recordId] = rest;
      if (!root || !recordId) return usageError("discharge: missing <root> <record-id>");
      const result = runDischarge(replayEventLog(root), recordId);
      return printAndExit(result, result.found ? 0 : 1);
    }
    case "replay": {
      const [root] = rest;
      if (!root) return usageError("replay: missing <root>");
      const state = replayEventLog(root);
      return printAndExit(runReplay(state, serializeState(state).toString("hex")));
    }
    case "list-entities": {
      const [flatfilePath] = rest;
      if (!flatfilePath || rest.length !== 1) return usageError("list-entities: expected <flatfile>");
      return printAndExit(entities(readEavtEntries({ path: flatfilePath })));
    }
    case "read-imports": {
      const [flatfilePath, entity] = rest;
      if (!flatfilePath || !entity || rest.length !== 2) return usageError("read-imports: expected <flatfile> <entity>");
      return printAndExit(relateFromEavtRows({ rows: readEavtEntries({ path: flatfilePath }), subject: entity, predicate: "imports" }).objects);
    }
    case "read-operations": {
      const [flatfilePath, entity] = rest;
      if (!flatfilePath || !entity || rest.length !== 2) return usageError("read-operations: expected <flatfile> <entity>");
      return printAndExit(relateFromEavtRows({ rows: readEavtEntries({ path: flatfilePath }), subject: entity, predicate: "has-operation" }).objects);
    }
    default:
      return usageError(`unknown verb: ${verb}`);
  }
}

export const command = Object.freeze({
  run: main,
  resultExitCode: (status) => status,
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
