#!/usr/bin/env node
/**
 * migrate-notes — relocate a flat notes directory into `YYYY/MM/DD/` and
 * normalise the frontmatter of every note it finds there.
 *
 * The theory: a note has a *date* and a *topic*, and those two facts alone
 * determine where it lives — `YYYY/MM/DD/YYYY-MM-DD-note-on-<topic>.md`.
 * Everything derivable from the file is derived by this script; only what is
 * genuinely absent from the file is inferred, and inference is dispatched one
 * note at a time to a small model that sees exactly one note.
 *
 * That split is the whole design. Deterministic facts must never be guessed:
 *
 *   derived   date, topic slug, target path, type, name,
 *             date-format repair, frontmatter repair, key folding
 *   inferred  title, description and tags, and only when the note lacks them
 *
 * A note's slug is its identity in the planning graph — other notes refer to
 * it by bare slug in `serves`, `depends-on`, `part-of` and friends. The slug
 * is therefore preserved exactly, in both the filename and the `name` key, so
 * no inbound reference breaks.
 *
 * The pass is idempotent and resumable: it normalises notes already in place
 * as readily as ones it moves, so the relocation and the inference need not
 * happen together. Run it with `--no-infer` to do the deterministic work at
 * once, then again later to fill in what only a reader could supply.
 *
 * Usage:
 *   node scripts/migrate-notes.mjs <notes-dir> [options]
 *
 *   --apply             write changes (default is a dry run that writes nothing)
 *   --concurrency N     parallel inference dispatches (default 6)
 *   --limit N           only process the first N notes (for trialling)
 *   --model NAME        model for inference (default haiku)
 *   --no-infer          skip inference; leave absent fields absent
 *   --report PATH       write the full plan as JSON
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import { join, dirname, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMarkdownFrontmatter } from '@red-cup-engineering/read-markdown-frontmatter-service';
import { mutateMarkdownFrontmatter } from '@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter';
import { splitMarkdownFrontmatterFence } from '@red-cup-engineering/split-markdown-frontmatter-fence-service';
import { decodeYaml, encodeYaml } from '@red-cup-engineering/yaml-frontmatter-codec-service';
import { slugify } from '@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text';
import { admitNoteDescription } from './note-description.mjs';

/**
 * The repository root, asked of git rather than assumed from this file's
 * location — this script lives inside the services tree, many levels down,
 * and the git commands it runs are relative to the root, not to here.
 */
const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: dirname(new URL(import.meta.url).pathname), encoding: 'utf8',
}).trim();

/** The canonical genre key, and the dialects that fold into it. */
const TYPE_KEY = 'type';
const TYPE_DIALECTS = ['kind', 'class'];
const DEFAULT_TYPE = 'research-note';

/**
 * Values that are really a *specialization* — what kind of thinking the note
 * does — rather than a genre. Where an older note put one of these under
 * `type`, the genre slot was being borrowed, and the value belongs under
 * `specialization` where the rest of the corpus keeps it.
 */
const SPECIALIZATION_VALUES = new Set([
  'plan', 'idea', 'analysis', 'project', 'research', 'text', 'lesson',
]);

/** Keys whose values are dates and must be plain `YYYY-MM-DD`. */
const DATE_KEYS = ['date-created', 'date-modified', 'date-revised', 'date-completed', 'unblocked-date'];

/** Deprecated spellings folded into the vault standard. */
const DATE_ALIASES = { date: 'date-created', created: 'date-created', updated: 'date-modified', revised: 'date-revised' };

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
  const opts = { apply: false, concurrency: 6, limit: Infinity, model: 'haiku', infer: true, report: null, dir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--no-infer') opts.infer = false;
    else if (a === '--concurrency') opts.concurrency = Number(argv[++i]);
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--model') opts.model = argv[++i];
    else if (a === '--report') opts.report = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option: ${a}`);
    else if (opts.dir === null) opts.dir = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!opts.dir) throw new Error('usage: migrate-notes.mjs <notes-dir> [--apply]');
  return opts;
}

// ------------------------------------------------------------------ derive

/** Notes sitting directly in the directory — the ones not yet relocated. */
function flatNotes(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => statSync(join(dir, f)).isFile())
    .sort();
}

/** Every note, including ones already relocated, for the normalisation pass. */
function allNotes(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allNotes(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

/** `2026-04-04T00:00:00` and `"2026-04-04"` both mean `2026-04-04`. */
function normaliseDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** The topic slug: the filename stripped of any date prefix and `note-on-`. */
function topicSlug(filename) {
  let s = filename.replace(/\.md$/, '');
  s = s.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  s = s.replace(/^note-on-/, '');
  return s;
}

/**
 * Date of the commit that *first* added the file — a last-resort fallback.
 * `git log` reports newest-first and a file may have been added more than
 * once, so the oldest entry is the one that means "created".
 */
function gitAddedDate(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--follow', '--format=%ad', '--date=short', '--', file], {
      cwd: REPO, encoding: 'utf8',
    }).trim();
    if (!out) return null;
    return normaliseDate(out.split('\n').filter(Boolean).pop());
  } catch {
    return null;
  }
}

/** Corpus repair is explicit here; ordinary readers only accept complete fences and valid YAML. */
export function repairNoteFrontmatter(source) {
  let text = source;
  const notes = [];
  let fence = splitMarkdownFrontmatterFence(text);
  if (fence === null && /^(?:\uFEFF)?---[ \t]*(?:\r\n|\n|\r)/u.test(text)) {
    const opening = /^(?:\uFEFF)?---[ \t]*(?:\r\n|\n|\r)/u.exec(text)[0];
    const remaining = text.slice(opening.length);
    const glued = /([^\r\n]+)---[ \t]*(\r\n|\n|\r|$)/u.exec(remaining);
    if (glued === null) throw new TypeError('note frontmatter has no closing fence');
    const at = opening.length + glued.index + glued[1].length;
    const newline = opening.endsWith('\r\n') ? '\r\n' : opening.at(-1);
    text = text.slice(0, at) + newline + text.slice(at);
    fence = splitMarkdownFrontmatterFence(text);
    notes.push('repaired frontmatter whose closing fence was glued to the last line');
  }
  if (fence?.format === 'yaml') {
    const { rawStart, rawEnd } = fence.source;
    const raw = text.slice(rawStart, rawEnd);
    try { decodeYaml(raw); }
    catch (error) {
      // A missing aliases key is recoverable only if the preceding YAML is a
      // valid mapping ending in a scalar, and inserting the key yields one
      // valid complete mapping. No separate scalar or list grammar is used.
      const candidates = [];
      const runs = /(?:^|(?<=\n))[ \t]*-[ \t]+[^\r\n]*(?:(?:\r\n|\n)[ \t]*-[ \t]+[^\r\n]*)*/gu;
      for (const run of raw.matchAll(runs)) {
        const prefix = raw.slice(0, run.index);
        try {
          const before = decodeYaml(prefix);
          if (typeof Object.values(before).at(-1) !== 'string' || Object.hasOwn(before, 'aliases')) continue;
          const newline = raw.includes('\r\n') ? '\r\n' : '\n';
          const list = run[0].split(/\r?\n/u).map((line) => `  ${line.trimStart()}`).join(newline);
          const repaired = `${prefix}aliases:${newline}${list}${raw.slice(run.index + run[0].length)}`;
          const after = decodeYaml(repaired);
          if (!Array.isArray(after.aliases)) continue;
          candidates.push({ repaired, count: after.aliases.length });
        } catch { /* An ambiguous or unrelated syntax error is not a corpus repair. */ }
      }
      if (candidates.length !== 1) throw error;
      text = text.slice(0, rawStart) + candidates[0].repaired + text.slice(rawEnd);
      notes.push(`recovered ${candidates[0].count} orphaned list item(s) as 'aliases'`);
    }
  }
  // Validate the final interpretation before a caller can write a repair.
  readMarkdownFrontmatter(text);
  return { text, notes };
}

/** Everything this script can work out without asking a model. */
export function derive(file, notesDir) {
  const repaired = repairNoteFrontmatter(readFileSync(file, 'utf8'));
  let text = repaired.text;
  const parsed = readMarkdownFrontmatter(text);
  const frontmatter = { ...(parsed.frontmatter ?? {}) };
  const notes = [...repaired.notes];
  if (parsed.format === null) notes.push('file had no frontmatter at all');
  const set = (key, value) => {
    text = mutateMarkdownFrontmatter(text, { mode: 'set', key, value });
    frontmatter[key] = value;
  };
  const remove = (key) => {
    text = mutateMarkdownFrontmatter(text, { mode: 'delete', keys: [key] });
    delete frontmatter[key];
  };
  const name = basename(file);
  const slug = topicSlug(name);
  for (const [from, to] of Object.entries(DATE_ALIASES)) {
    if (Object.hasOwn(frontmatter, from) && !Object.hasOwn(frontmatter, to)) {
      text = mutateMarkdownFrontmatter(text, { mode: 'rename', from, to });
      frontmatter[to] = frontmatter[from];
      delete frontmatter[from];
    }
  }
  for (const dialect of TYPE_DIALECTS) {
    const dialectValue = frontmatter[dialect];
    if (typeof dialectValue !== 'string') continue;
    const existingType = frontmatter[TYPE_KEY];
    if (existingType !== undefined && existingType !== dialectValue) {
      if (SPECIALIZATION_VALUES.has(existingType) && !frontmatter.specialization) {
        set('specialization', existingType);
        notes.push(`moved type: ${existingType} to specialization (genre slot reclaimed)`);
      } else {
        notes.push(`dropped conflicting type: ${existingType} in favour of ${dialect}: ${dialectValue}`);
      }
    }
    set(TYPE_KEY, dialectValue);
    remove(dialect);
    notes.push(`renamed ${dialect} -> ${TYPE_KEY}`);
  }
  for (const key of DATE_KEYS) {
    const cur = frontmatter[key];
    const fixed = typeof cur === 'string' ? normaliseDate(cur) : null;
    if (fixed && fixed !== cur) {
      set(key, fixed);
      notes.push(`normalised ${key}: ${cur} -> ${fixed}`);
    }
  }
  let date = normaliseDate(frontmatter['date-created']);
  let dateSource = 'frontmatter';
  if (!date) {
    const m = /^(\d{4}-\d{2}-\d{2})-/.exec(name);
    if (m) { date = m[1]; dateSource = 'filename'; }
  }
  if (!date) { date = gitAddedDate(relative(REPO, file)); dateSource = 'git-added'; }
  const [y, mo, d] = (date ?? '').split('-');
  const target = date ? join(notesDir, y, mo, d, `${date}-note-on-${slug}.md`) : null;
  return {
    file, slug, date, dateSource, target, text, frontmatter, body: parsed.body, notes,
    needsTitle: !frontmatter.title,
    needsDescription: !frontmatter.description,
    needsTags: !Object.hasOwn(frontmatter, 'tags'),
    needsDate: !date,
  };
}

// ----------------------------------------------------------------- inference

const INFERENCE_PROMPT = `You are given one note from a research/planning corpus. Produce metadata for it.

Return ONLY a JSON object, no prose, no code fence:
{"title": "...", "description": "...", "tags": ["...", "..."]}

Rules:
- "title": a human-readable title in Title Case naming what this note is about.
  Preserve the corpus's own vocabulary and acronym casing (FARS, MASH, MCP, ECC,
  PWS, AI, CL, ZPD, UI, API, OS). Do not invent scope the note does not have.
  No trailing punctuation. Aim for 2-9 words.
- "description": ONE sentence, plain declarative, 15-30 words, saying what the
  note contains and what it is for. No marketing language. No "This note...".
  End with a period.
- "tags": 3-6 topic keywords, each lowercase-kebab-case (e.g. "closure-operator",
  "agent-dispatch", "knowledge-organization"). Prefer terms the note itself uses.
  No generic filler such as "notes", "misc", "research" or "documentation".
- Base all three strictly on the note's actual content. Do not speculate.`;

/** Ask the model for the residue of one note. One note per dispatch, always. */
function inferOne(plan, model) {
  // Some notes carry all their meaning in structured frontmatter and have no
  // prose at all. Handing such a note an empty body invites the model to
  // either refuse or invent, so when the body is thin we send the frontmatter
  // itself as the content — which is, for those notes, exactly what it is.
  const body = plan.body.trim();
  const thin = body.length < 400;
  const front = encodeYaml(plan.frontmatter);
  const payload = `${INFERENCE_PROMPT}

---
Filename slug: ${plan.slug}

${thin
    ? `This note's content is its structured frontmatter; there is little or no prose body.\nFrontmatter:\n\n${front.slice(0, 6000)}`
    : `Frontmatter keys: ${Object.keys(plan.frontmatter).join(', ')}\n\nNote content (may be truncated):\n\n${body.slice(0, 6000)}`}`;

  return new Promise((res) => {
    const child = spawn('claude', ['-p', '--model', model, '--output-format', 'json'], {
      cwd: REPO, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', (e) => res({ error: `spawn failed: ${e.message}` }));
    child.on('close', () => {
      try {
        const env = JSON.parse(out);
        const text = env.result ?? env.text ?? '';
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) return res({ error: `no JSON in model reply: ${text.slice(0, 200)}` });
        const got = JSON.parse(m[0]);
        if (!got.title || !got.description) return res({ error: 'model reply missing title/description' });
        const tags = Array.isArray(got.tags)
          ? got.tags.map((t) => slugify(String(t)))
            .filter(Boolean)
          : [];
        const description = admitNoteDescription(String(got.description)).text;
        res({ title: String(got.title).trim(), description, tags });
      } catch (e) {
        res({ error: `unparseable reply: ${e.message} ${err.slice(0, 200)}` });
      }
    });
    child.stdin.end(payload);
  });
}

/** Mechanical fallback: a title from the slug. Correct, if charmless. */
const ACRONYMS = new Map(Object.entries({
  fars: 'FARS', mash: 'MASH', mcp: 'MCP', ecc: 'ECC', ecc2: 'ECC2', pws: 'PWS', ai: 'AI',
  cl: 'CL', zpd: 'ZPD', ui: 'UI', api: 'API', os: 'OS', faoh: 'FAOH', foah: 'FOAH',
  eavt: 'EAVT', mud: 'MUD', rsi: 'RSI', tab: 'TAB', llm: 'LLM', json: 'JSON', yaml: 'YAML',
}));
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);

function titleFromSlug(slug) {
  const words = slug.split('-');
  return words.map((w, i) => {
    if (ACRONYMS.has(w)) return ACRONYMS.get(w);
    if (i > 0 && i < words.length - 1 && MINOR.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

/** Run `jobs` with at most `limit` in flight. */
async function pool(jobs, limit, onDone) {
  const queue = jobs.slice();
  let active = 0;
  let done = 0;
  return new Promise((res) => {
    const next = () => {
      if (queue.length === 0 && active === 0) return res();
      while (active < limit && queue.length > 0) {
        const job = queue.shift();
        active++;
        job().then((r) => {
          active--; done++;
          onDone(done, r);
          next();
        });
      }
    };
    next();
  });
}

// -------------------------------------------------------------------- apply

/** Build the final frontmatter for a note and render the document. */
export function render(plan) {
  const patch = {};
  if (plan.title) patch.title = plan.title;
  if (plan.description) patch.description = plan.description;
  if (plan.tags?.length && !Object.hasOwn(plan.frontmatter, 'tags')) patch.tags = plan.tags;
  patch['date-created'] = plan.date;
  if (!plan.frontmatter[TYPE_KEY]) patch[TYPE_KEY] = DEFAULT_TYPE;
  if (!Object.hasOwn(plan.frontmatter, 'name')) patch.name = plan.slug;
  return mutateMarkdownFrontmatter(plan.text, { mode: 'merge', patch });
}

function gitMove(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  const tracked = (() => {
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', relative(REPO, from)], { cwd: REPO, stdio: 'pipe' });
      return true;
    } catch { return false; }
  })();
  if (tracked) execFileSync('git', ['mv', relative(REPO, from), relative(REPO, to)], { cwd: REPO });
  else execFileSync('mv', [from, to], { cwd: REPO });
}

// --------------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const notesDir = resolve(opts.dir);
  const flat = flatNotes(notesDir).slice(0, opts.limit);
  const nested = allNotes(notesDir).filter((f) => !flat.includes(basename(f)) && dirname(f) !== notesDir);

  const plans = flat.map((f) => derive(join(notesDir, f), notesDir));
  const inPlace = nested.map((f) => ({ ...derive(f, notesDir), inPlace: true }));
  const all = [...plans, ...inPlace];

  // Collisions would silently destroy a note; refuse rather than overwrite.
  const seen = new Map();
  for (const p of all) {
    const dest = p.inPlace ? p.file : p.target;
    if (!dest) continue;
    if (seen.has(dest)) throw new Error(`collision: ${p.file} and ${seen.get(dest)} both target ${dest}`);
    seen.set(dest, p.file);
  }

  const residue = all.filter((p) => p.needsTitle || p.needsDescription || p.needsTags);
  console.log(`notes: ${all.length} (${plans.length} to relocate, ${inPlace.length} already placed)`);
  console.log(`derived fully: ${all.length - residue.length} | need inference: ${residue.length}`);
  const undated = all.filter((p) => p.dateSource !== 'frontmatter');
  if (undated.length) {
    console.log(`date not in frontmatter for ${undated.length}:`);
    for (const p of undated) console.log(`  ${basename(p.file)} -> ${p.date ?? 'UNKNOWN'} (${p.dateSource})`);
  }

  if (opts.infer && residue.length) {
    console.log(`\ndispatching ${residue.length} inference call(s) to ${opts.model}, ${opts.concurrency} at a time...`);
    const jobs = residue.map((p) => async () => {
      const got = await inferOne(p, opts.model);
      if (got.error) { p.inferError = got.error; return p; }
      if (p.needsTitle) p.title = got.title;
      if (p.needsDescription) p.description = got.description;
      if (p.needsTags && got.tags.length) p.tags = got.tags;
      return p;
    });
    await pool(jobs, opts.concurrency, (done, p) => {
      const mark = p.inferError ? '!' : '+';
      process.stdout.write(`  ${mark} ${done}/${residue.length} ${basename(p.file)}${p.inferError ? ` — ${p.inferError}` : ''}\n`);
    });
  }

  // Carry across whatever the file already had. A mechanical title is only a
  // consolation prize for inference that was attempted and failed — when
  // inference is off, an absent title stays absent so a later pass can fill
  // it properly rather than find a fabricated one already sitting there.
  for (const p of all) {
    if (!p.title) p.title = p.frontmatter.title ?? (p.inferError ? titleFromSlug(p.slug) : '');
    if (!p.description) p.description = p.frontmatter.description ?? '';
  }

  const failures = all.filter((p) => p.inferError);
  const noDesc = all.filter((p) => !p.description);

  if (opts.report) {
    writeFileSync(opts.report, JSON.stringify(all.map((p) => ({
      file: relative(REPO, p.file),
      target: p.target ? relative(REPO, p.target) : null,
      inPlace: !!p.inPlace,
      slug: p.slug, date: p.date, dateSource: p.dateSource,
      title: p.title, description: p.description,
      notes: p.notes, inferError: p.inferError ?? null,
    })), null, 2));
    console.log(`\nreport written to ${opts.report}`);
  }

  console.log('');
  for (const p of all) {
    if (p.notes.length) console.log(`  note: ${basename(p.file)}: ${p.notes.join('; ')}`);
  }
  if (failures.length) console.log(`\ninference failed for ${failures.length} note(s); mechanical titles used.`);
  if (noDesc.length) console.log(`${noDesc.length} note(s) still have an empty description.`);

  if (!opts.apply) {
    console.log(`\nDRY RUN — nothing written. Sample of planned moves:`);
    for (const p of plans.slice(0, 8)) {
      console.log(`  ${basename(p.file)}\n    -> ${relative(notesDir, p.target)}\n       title: ${p.title}`);
    }
    console.log(`\nre-run with --apply to write ${plans.length} move(s) and ${all.length} frontmatter rewrite(s).`);
    return;
  }

  let moved = 0;
  let rewritten = 0;
  for (const p of all) {
    if (!p.date) { console.log(`  SKIP (no date): ${basename(p.file)}`); continue; }
    const text = render(p);
    writeFileSync(p.file, text);
    rewritten++;
    if (!p.inPlace && p.target && resolve(p.target) !== resolve(p.file)) {
      if (existsSync(p.target)) throw new Error(`refusing to overwrite existing ${p.target}`);
      gitMove(p.file, p.target);
      moved++;
    }
  }
  console.log(`\napplied: ${rewritten} frontmatter rewrite(s), ${moved} move(s).`);
}

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? '')) {
  main().catch((e) => { console.error(`error: ${e.message}`); process.exitCode = 1; });
}
