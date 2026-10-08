import assert from "node:assert/strict";
import test from "node:test";
import { systemdInventoryResourceGraphs } from "../src/adapters/systemd-inventory.mjs";

const INVENTORY = Object.freeze({
  host: "vault",
  units: [{ unit: "web.service", load: "loaded", active: "active", sub: "running", description: "web" }],
  timers: [{ unit: "backup.timer", activates: "backup.service", next: "1", last: "0" }],
});

test("systemdInventoryResourceGraphs requires an explicit observedAt (no clock read)", () => {
  assert.throws(() => systemdInventoryResourceGraphs(INVENTORY), /observedAt is required/);
  assert.throws(() => systemdInventoryResourceGraphs(INVENTORY, {}), /observedAt is required/);
});

test("systemdInventoryResourceGraphs stamps every resource with the caller-supplied observedAt", () => {
  const resources = systemdInventoryResourceGraphs(INVENTORY, { observedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(resources.length, 2);
  assert.ok(resources.every((resource) => resource.observedAt === "2026-01-01T00:00:00.000Z"));
  assert.equal(resources[0].cells.some((cell) => cell.predicate === "urn:fars:unit-name" && cell.object === "web.service"), true);
  assert.equal(resources[1].cells.some((cell) => cell.predicate === "urn:fars:unit-name" && cell.object === "backup.timer"), true);
});
