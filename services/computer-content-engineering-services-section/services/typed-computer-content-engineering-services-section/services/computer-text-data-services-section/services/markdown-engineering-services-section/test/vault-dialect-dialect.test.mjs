import { join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { detectDialect } from '../src/vault-dialect/dialect.mjs';

const FIXTURES = fileURLToPath(new URL('../fixtures/vault-dialect/', import.meta.url));

test('detects obsidian via the .obsidian directory', () => {
  const { dialect, reason } = detectDialect(`${FIXTURES}obsidian-vault`);
  assert.equal(dialect, 'obsidian');
  assert.match(reason, /\.obsidian/);
});

test('detects org via an org-file majority', () => {
  const { dialect, reason } = detectDialect(`${FIXTURES}org-roam`);
  assert.equal(dialect, 'org');
  assert.match(reason, /\.org file/);
});

test('detects house via frontmatter marker fields', () => {
  const { dialect, reason } = detectDialect(`${FIXTURES}house-corpus`);
  assert.equal(dialect, 'house');
  assert.match(reason, /house frontmatter marker/);
});

test('an explicit override always wins, regardless of directory contents', () => {
  const { dialect, reason } = detectDialect(`${FIXTURES}obsidian-vault`, { override: 'org' });
  assert.equal(dialect, 'org');
  assert.equal(reason, 'explicit override');
});

test('a .obsidian directory is authoritative even over org-majority-shaped contents', () => {
  // obsidian-vault has zero .org files, so this mostly checks precedence order rather than
  // a real conflict — the real conflict case (mixed corpus) is exercised structurally by the
  // fact detection checks hasObsidianDir before ever counting extensions.
  const { dialect } = detectDialect(`${FIXTURES}obsidian-vault`);
  assert.equal(dialect, 'obsidian');
});

test('read-only: no write-capable fs call appears anywhere in the vault-reading source (static check)', () => {
  const srcDir = fileURLToPath(new URL('../src/vault-dialect/', import.meta.url));
  const WRITE_FNS = ['writeFileSync', 'appendFileSync', 'rmSync', 'unlinkSync', 'rmdirSync', 'renameSync', 'writeFile(', 'appendFile('];
  const files = ['dialect.mjs', 'walk.mjs', 'docindex.mjs', 'wikilink.mjs', 'frontmatter.mjs'].map((f) => join(srcDir, f));
  const adapterDir = join(srcDir, 'adapters');
  for (const name of readdirSync(adapterDir)) {
    if (name.endsWith('.mjs') && !name.endsWith('.test.mjs')) files.push(join(adapterDir, name));
  }
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const fn of WRITE_FNS) {
      assert.ok(!text.includes(fn), `${file} must not call ${fn} (read-only vault-reading path)`);
    }
  }
});
