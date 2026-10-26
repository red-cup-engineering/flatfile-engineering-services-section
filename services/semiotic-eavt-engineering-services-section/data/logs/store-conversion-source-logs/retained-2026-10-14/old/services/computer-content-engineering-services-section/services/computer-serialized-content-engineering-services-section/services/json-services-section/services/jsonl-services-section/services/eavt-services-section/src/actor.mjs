// actor — the one Actor law: an EAVT-constituted entity of kind "actor", its
// names, superseded identifiers, register, and resolution. Office seating,
// credentials, accounts, sessions, and application profiles are relations to
// an Actor and have their own owners; this module does not discover or decide
// any of them. It composes EAVT directly and never owns another identifier.
import { readFileSync } from "node:fs";
import { eavtRow } from "../scripts/admit-row.mjs";
import { appendEavtRow } from "../scripts/append-eavt-row.mjs";
import { constituteContentAddressedEntity } from "../scripts/constitute-content-addressed-entity.mjs";
import { decode } from "../scripts/decode-row.mjs";
import { verifyContentAddressedEntity } from "../scripts/verify-content-addressed-entity.mjs";

export const ACTOR_KIND = "actor";
export const NAMED = "named";
export const SUPERSEDING = "superseding";

// === constitution ==============================================================================

/**
 * Constitute an actor: the one constituting utterance that births an actor entity.
 *
 * @param {{attributes: object, t: *}} args attributes is a JSON object of plain-noun facts
 *   (e.g. {host,harness} for a harness actor; {service:"<npm name>"}
 *   for a service actor; {team:"<slug>"} for a team). t is the genesis witness.
 * @returns {{address: string, genesisRow: object}} address is "actor:<ni-digest>"; genesisRow.e
 *   equals address.
 */
export function constituteActor({ attributes, t }) {
  return constituteContentAddressedEntity({ kind: ACTOR_KIND, attributes, t });
}

/**
 * Verify a genesis row actually births the address it claims to.
 *
 * @param {{address: string, genesisRow: object}} args
 * @returns {true} When every check passes.
 * @throws {TypeError} Naming which check failed: the row is not exactly {e,a,v,t}, genesisRow.e
 *   does not equal address, address does not start with "actor:", genesisRow.a is not
 *   "constituted", or the content address recomputed from genesisRow does not equal address.
 */
export function verifyActorGenesis({ address, genesisRow }) {
  eavtRow(genesisRow);
  if (genesisRow.e !== address) {
    throw new TypeError(`actor: genesis row "e" (${JSON.stringify(genesisRow.e)}) does not equal address (${JSON.stringify(address)})`);
  }
  if (typeof address !== "string" || !address.startsWith(`${ACTOR_KIND}:`)) {
    throw new TypeError(`actor: address must start with "${ACTOR_KIND}:", got ${JSON.stringify(address)}`);
  }
  if (genesisRow.a !== "constituted") {
    throw new TypeError(`actor: genesis row "a" must be "constituted", got ${JSON.stringify(genesisRow.a)}`);
  }
  const recomputed = verifyContentAddressedEntity({ genesisRow }).address;
  if (recomputed !== address) {
    throw new TypeError(`actor: recomputed content address (${recomputed}) does not equal address (${address}) — tampered genesis row`);
  }
  return true;
}

// === naming / supersession rows ================================================================

/**
 * Build a "named" row attaching a display name to an actor address.
 *
 * @param {string} address The actor's address.
 * @param {string} name The display name.
 * @param {*} t The witness.
 * @returns {{e: string, a: "named", v: string, t: *}}
 */
export function nameRow(address, name, t) {
  return { e: address, a: NAMED, v: name, t };
}

/**
 * Build a "superseding" row attaching a retired identifier to an actor address.
 *
 * @param {string} address The actor's address.
 * @param {string} supersededId The retired identifier (e.g. "urn:ame:bare-cedar-fog-codex").
 * @param {*} t The witness.
 * @returns {{e: string, a: "superseding", v: string, t: *}}
 */
export function supersedeRow(address, supersededId, t) {
  return { e: address, a: SUPERSEDING, v: supersededId, t };
}

// === register append/read =======================================================================

/**
 * Durably append a batch of rows to an actor register, one row at a time. Every row is asserted
 * conformant first; every constituting row (a === "constituted") is verified via
 * verifyActorGenesis before it is appended.
 *
 * @param {string} registerPath The EAVT log path.
 * @param {object[]} rows The {e,a,v,t} rows to append, in order.
 * @returns {string} registerPath.
 * @throws {TypeError} If any row is non-conformant, or a constituting row's genesis fails
 *   verification.
 */
export function appendActorRows(registerPath, rows) {
  for (const row of rows) {
    eavtRow(row);
    if (row.a === "constituted") {
      verifyActorGenesis({ address: row.e, genesisRow: row });
    }
  }
  for (const row of rows) {
    appendEavtRow({ path: registerPath, row });
  }
  return registerPath;
}

/**
 * Read an actor register off disk into its rows and derived actor summaries.
 *
 * @param {string} registerPath The EAVT log path.
 * @returns {{rows: object[], actors: Array<{address: string, genesisRow: object,
 *   attributes: object, t: *, names: string[], supersedes: string[]}>}} actors in first-occurrence (genesis) order. A
 *   missing file yields {rows: [], actors: []}.
 * @throws {Error} If the register is unreadable or malformed, or if any genesis row fails full
 *   actor genesis verification. A missing file alone yields an empty register.
 */
export function readActorRegister(registerPath) {
  let rows;
  try {
    rows = readFileSync(registerPath, "utf8").split("\n").filter((line) => line !== "").map((line, index) => {
      try { return decode(line); }
      catch (error) { throw new TypeError(`actor: malformed register row ${index + 1} — ${String(error?.message ?? error)}`); }
    });
  } catch (error) {
    if (error?.code === "ENOENT") return { rows: [], actors: [] };
    throw error;
  }

  const order = [];
  const byAddress = new Map();
  for (const row of rows) {
    if (row.a === "constituted") {
      try { verifyActorGenesis({ address: row.e, genesisRow: row }); }
      catch (error) { throw new TypeError(`actor: register genesis row for ${JSON.stringify(row.e)} fails verification — tampered register: ${String(error?.message ?? error)}`); }
      if (!byAddress.has(row.e)) {
        byAddress.set(row.e, { address: row.e, genesisRow: row, attributes: row.v, t: row.t, names: [], supersedes: [] });
        order.push(row.e);
      }
    }
  }
  for (const row of rows) {
    if (row.a === NAMED && byAddress.has(row.e)) {
      byAddress.get(row.e).names.push(row.v);
    } else if (row.a === SUPERSEDING && byAddress.has(row.e)) {
      byAddress.get(row.e).supersedes.push(row.v);
    }
  }

  return { rows, actors: order.map((address) => byAddress.get(address)) };
}

// === resolution ==================================================================================

/**
 * Resolve an actor by its address, one of its names, or one of its superseded identifiers.
 *
 * @param {{actors: object[]}} register The value returned by readActorRegister.
 * @param {string} ref The reference to resolve.
 * @returns {object|null} The matching actor summary, or null.
 * @throws {TypeError} If a name or superseded identifier names multiple actors.
 */
export function resolveActor(register, ref) {
  const exact = register.actors.find((actor) => actor.address === ref);
  if (exact !== undefined) return exact;
  const matches = register.actors.filter((actor) => actor.names.includes(ref) || actor.supersedes.includes(ref));
  if (matches.length < 2) return matches[0] ?? null;
  throw new TypeError(`actor: reference ${JSON.stringify(ref)} is ambiguous across ${matches.map((actor) => actor.address).join(", ")}`);
}

/**
 * The supersession map of a register: supersededId -> address.
 *
 * @param {{actors: object[]}} register The value returned by readActorRegister.
 * @returns {Map<string,string>}
 * @throws {TypeError} If a superseded identifier names multiple actors.
 */
export function supersessionMap(register) {
  const map = new Map();
  for (const actor of register.actors) {
    for (const supersededId of actor.supersedes) {
      const prior = map.get(supersededId);
      if (prior !== undefined && prior !== actor.address) throw new TypeError(`actor: superseded identifier ${JSON.stringify(supersededId)} is ambiguous between ${prior} and ${actor.address}`);
      map.set(supersededId, actor.address);
    }
  }
  return map;
}
