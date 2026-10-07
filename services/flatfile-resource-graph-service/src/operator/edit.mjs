import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { replaceMarkdownLinkTarget } from "@red-cup-engineering/markdown-engineering-services-section/replace-markdown-link-target";
import { dumpMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/dump-markdown-frontmatter";
import { identity } from "../kernel/identity.mjs";
import { putRecord } from "../kernel/record-store.mjs";
import { makeWitness } from "../kernel/witness.mjs";
import { parseFrontmatter } from "../substrate/flatfile.mjs";
import { classify } from "./kind.mjs";
import { appendSeavtEntries } from "@red-cup-engineering/semiotic-eavt-services-section/append-seavt-entries";
import { seavtOfJson } from "@red-cup-engineering/semiotic-eavt-services-section/admit-seavt-row";

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// dumpMarkdownFrontmatter drops the fence entirely for an empty frontmatter
// object (matching markdown-engineering's own mutate law), but this package's
// readNote/parseFrontmatter requires a present (even if empty) fence to keep
// treating a file as a flatfile at all -- fm_rm-ing a note's last remaining
// key must not silently stop the file being a flatfile on the next read.
function renderFlatfile(fm, body) {
  return Object.keys(fm).length === 0 ? `---\n---\n${body}` : dumpMarkdownFrontmatter(fm, body, "yaml");
}

function readNote(absPath) {
  const text = readFileSync(absPath, "utf8");
  const { fm, body } = parseFrontmatter(text);
  if (fm === null) throw new Error(`not a flatfile (no frontmatter block): ${absPath}`);
  return { text, fm, body };
}

// Set a scalar frontmatter field, overwriting any existing value.
export function setField(fm, key, value) {
  return { ...fm, [key]: value };
}

// Append an item to a list-valued frontmatter field. If the key is
// absent, creates the list. If the key holds a scalar, promotes it to a
// list before appending. No-op when the item is already present (set
// semantics on the list).
export function addItem(fm, key, item) {
  const out = { ...fm };
  const cur = out[key];
  if (cur === undefined || cur === null) {
    out[key] = [item];
  } else if (Array.isArray(cur)) {
    if (!cur.some((x) => deepEqual(x, item))) out[key] = [...cur, item];
  } else if (!deepEqual(cur, item)) {
    out[key] = [cur, item];
  }
  return out;
}

// Remove a frontmatter key, or one item from a list-valued key. When
// item is null, removes the whole key. When item is given and the key
// holds a list, drops that item; the key disappears entirely once its
// list empties. When item is given but the key is scalar, removes the
// whole key only if the scalar equals item.
export function removeItem(fm, key, item = null) {
  if (!(key in fm)) return fm;
  const out = { ...fm };
  if (item === null) {
    delete out[key];
    return out;
  }
  const cur = out[key];
  if (Array.isArray(cur)) {
    const next = cur.filter((x) => !deepEqual(x, item));
    if (next.length === 0) delete out[key];
    else out[key] = next;
  } else if (deepEqual(cur, item)) {
    delete out[key];
  }
  return out;
}

// Rename a frontmatter key, preserving declaration order: new_key lands
// at the position old_key occupied. If new_key already exists, its own
// value wins at its own position and old_key's value is discarded
// without overwriting anything.
export function renameKey(fm, oldKey, newKey) {
  if (!(oldKey in fm)) return fm;
  if (oldKey === newKey) return fm;
  const newKeyExists = newKey in fm;
  const out = {};
  for (const [k, v] of Object.entries(fm)) {
    if (k === oldKey) {
      if (!newKeyExists) out[newKey] = v;
    } else {
      out[k] = v;
    }
  }
  if (newKeyExists && !(newKey in out)) out[newKey] = fm[newKey];
  return out;
}

// Markdown Engineering owns link syntax and source spans. The flatfile engine retains
// the corpus operation, witness, journal, and guarded write transaction.
export function rewriteLink(text, oldTargetRaw, newTargetRaw) {
  return replaceMarkdownLinkTarget(text, { target: oldTargetRaw, replacement: newTargetRaw });
}

// The shared gate-then-write tail every operator invocation ends in
// (design spec S5): a Witness is minted only after its two gates —
// witnessBit's WIT law and, when a settlement is supplied, the
// settling-monotonicity check — both clear; the SEAVT append happens
// next, then the witness's full body lands in the content-addressed
// record store (kernel/record-store.mjs) keyed by the same id the SEAVT
// row's v coordinate carries; the file is written last, only once both
// have actually landed. Any throw along this chain — a gate refusal, an
// append failure, a record-store write failure — leaves absPath's bytes
// exactly as readNote found them.
function completeEdit({ root, absPath, target, operator, oldText, newText, details, dryRun, agent, timestamp, channel, settlement }) {
  const preview = Object.freeze({ changed: true, operator, target, oldText, newText });
  if (dryRun) return preview;
  const ts = timestamp ?? new Date().toISOString();
  const witness = makeWitness({
    operator,
    target,
    before_digest: identity(oldText),
    after_digest: identity(newText),
    details,
    agent,
    timestamp: ts,
    kind: classify(operator, channel),
    four_before: [false, false],
    four_after: [true, false],
    channel,
    settlement,
  });
  appendSeavtEntries({ root: root, feed: channel, entries: [seavtOfJson(target, operator, witness.id, ts)], at: ts });
  putRecord(root, witness);
  writeFileSync(absPath, newText, "utf8");
  return { ...preview, witness };
}

function applyFmEdit(root, target, operator, transform, details, options) {
  const { dryRun = true, agent = null, timestamp, channel = "substrate", settlement = null } = options;
  const absPath = join(root, target);
  const { text: oldText, fm, body } = readNote(absPath);
  const newFm = transform(fm);
  if (deepEqual(newFm, fm)) return { changed: false, operator, target };
  const newText = renderFlatfile(newFm, body);
  return completeEdit({ root, absPath, target, operator, oldText, newText, details, dryRun, agent, timestamp, channel, settlement });
}

// Set frontmatter[key] = value on the note at root/target.
export function fmSet(root, target, key, value, options = {}) {
  return applyFmEdit(root, target, "fm_set", (fm) => setField(fm, key, value), { key, value }, options);
}

// Append item to the list-valued frontmatter[key] on root/target.
export function fmAdd(root, target, key, item, options = {}) {
  return applyFmEdit(root, target, "fm_add", (fm) => addItem(fm, key, item), { key, item }, options);
}

// Remove frontmatter[key] (or one item of it) on root/target.
export function fmRm(root, target, key, item = null, options = {}) {
  const details = item === null ? { key } : { key, item };
  return applyFmEdit(root, target, "fm_remove", (fm) => removeItem(fm, key, item), details, options);
}

// Rename frontmatter oldKey -> newKey on root/target.
export function renameFmKey(root, target, oldKey, newKey, options = {}) {
  return applyFmEdit(root, target, "rename_fm_key", (fm) => renameKey(fm, oldKey, newKey), { old_key: oldKey, new_key: newKey }, options);
}

// Rewrite a body markdown link on root/target from oldTargetRaw to
// newTargetRaw.
export function rewriteBodyLink(root, target, oldTargetRaw, newTargetRaw, options = {}) {
  const { dryRun = true, agent = null, timestamp, channel = "substrate", settlement = null } = options;
  const absPath = join(root, target);
  const { text: oldText } = readNote(absPath);
  const { text: newText, count, edits } = rewriteLink(oldText, oldTargetRaw, newTargetRaw);
  if (count === 0) return { changed: false, operator: "rewrite_body_link", target };
  const details = { old: oldTargetRaw, new: newTargetRaw, count, spans: edits.map(({ span }) => span) };
  return completeEdit({ root, absPath, target, operator: "rewrite_body_link", oldText, newText, details, dryRun, agent, timestamp, channel, settlement });
}

// Move/rename a flatfile from root/from to root/to. Bare relocation
// only — content bytes are unchanged, so before/after digest match;
// what the Witness records is that the move happened. Rewriting other
// notes' inbound references to the moved slug is a corpus-wide,
// higher-level operation this function does not perform.
export function moveNote(root, from, to, options = {}) {
  const { dryRun = true, agent = null, timestamp, channel = "substrate", settlement = null } = options;
  const operator = "move_flatfile";
  if (from === to) return { changed: false, operator, from, to };
  const preview = Object.freeze({ changed: true, operator, from, to });
  if (dryRun) return preview;

  const fromAbs = join(root, from);
  const toAbs = join(root, to);
  if (!existsSync(fromAbs)) throw new Error(`missing source: ${from}`);
  if (existsSync(toAbs)) throw new Error(`destination exists: ${to}`);
  const oldText = readFileSync(fromAbs, "utf8");
  const ts = timestamp ?? new Date().toISOString();
  const digest = identity(oldText);
  const witness = makeWitness({
    operator,
    target: from,
    before_digest: digest,
    after_digest: digest,
    details: { to },
    agent,
    timestamp: ts,
    kind: classify(operator, channel),
    four_before: [false, false],
    four_after: [true, false],
    channel,
    settlement,
  });
  appendSeavtEntries({ root: root, feed: channel, entries: [seavtOfJson(from, operator, witness.id, ts)], at: ts });
  putRecord(root, witness);
  mkdirSync(dirname(toAbs), { recursive: true });
  renameSync(fromAbs, toAbs);
  return { ...preview, witness };
}

