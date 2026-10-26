import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLogReadingIso,
  isReadingIso,
  logReadingById,
  logReadingsHopLosslessly,
  readingAsLogReading,
  readingById,
  readingsHopLosslessly,
  registerLogReading,
  registerReading,
  sameWitness,
  sameWitnessLog,
} from "../src/ledger/reading.mjs";

const witnessA = { e: "alpha", a: "warm", v: true, t: 1 };
const witnessB = { e: "beta", a: "warm", v: false, t: 2 };
const jsonReading = { id: "test.json", toWire: JSON.stringify, fromWire: JSON.parse };
const tupleReading = {
  id: "test.tuple",
  toWire: (witness) => [witness.e, witness.a, witness.v, witness.t],
  fromWire: ([e, a, v, t]) => ({ e, a, v, t }),
};
const lossyReading = {
  id: "test.lossy",
  toWire: ({ e, a, t }) => ({ e, a, t }),
  fromWire: (wire) => ({ ...wire, v: null }),
};

describe("wire-form round trips", () => {
  it("compares rows and ordered logs structurally", () => {
    assert.equal(sameWitness(witnessA, { ...witnessA }), true);
    assert.equal(sameWitness(witnessA, witnessB), false);
    assert.equal(sameWitnessLog([witnessA, witnessB], [witnessA, witnessB]), true);
    assert.equal(sameWitnessLog([witnessA, witnessB], [witnessB, witnessA]), false);
  });

  it("distinguishes lossless and lossy readings", () => {
    assert.equal(isReadingIso(jsonReading, witnessA), true);
    assert.equal(isReadingIso(lossyReading, witnessA), false);
    assert.equal(readingsHopLosslessly(jsonReading, tupleReading, witnessA), true);
    assert.equal(readingsHopLosslessly(jsonReading, lossyReading, witnessA), false);
  });

  it("lifts one-row readings into log readings", () => {
    const jsonLog = readingAsLogReading(jsonReading);
    const tupleLog = readingAsLogReading(tupleReading);
    assert.equal(isLogReadingIso(jsonLog, [witnessA]), true);
    assert.equal(logReadingsHopLosslessly(jsonLog, tupleLog, [witnessA]), true);
  });

  it("registers row and log readings by id", () => {
    registerReading(jsonReading);
    const tupleLog = registerLogReading(readingAsLogReading(tupleReading));
    assert.equal(readingById(jsonReading.id), jsonReading);
    assert.equal(logReadingById(tupleLog.id), tupleLog);
  });
});
