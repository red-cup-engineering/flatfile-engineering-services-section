import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { derive, render, repairNoteFrontmatter } from '../scripts/migrate-notes.mjs';
import { readMarkdownFrontmatter } from '@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter';

test('migration repairs a glued fence explicitly without changing body bytes', () => {
  const source = '---\r\ntitle: "false"---\r\n\r\nBody  \r\n';
  const result = repairNoteFrontmatter(source);
  assert.equal(result.text, '---\r\ntitle: "false"\r\n---\r\n\r\nBody  \r\n');
  assert.equal(readMarkdownFrontmatter(result.text).frontmatter.title, 'false');
  assert.equal(result.notes.length, 1);
  assert.equal(repairNoteFrontmatter(result.text).text, result.text);
});

test('orphan aliases repair delegates quoted list values to YAML', () => {
  const result = repairNoteFrontmatter('---\ntitle: Topic\n- "with, comma"\n- \'it\'\'s exact\'\n---\nBody\n');
  assert.deepEqual(readMarkdownFrontmatter(result.text).frontmatter.aliases, ['with, comma', "it's exact"]);
  assert.equal(result.notes.length, 1);
  assert.throws(() => repairNoteFrontmatter('---\ntitle: [broken\n---\nBody\n'), /invalid document/u);
});

test('note normalization preserves complex YAML and exact source outside changed fields', () => {
  const directory = mkdtempSync(join(tmpdir(), 'note-grammar-'));
  try {
    const path = join(directory, '2026-09-18-note-on-source.md');
    const source = '---\r\n# keep\r\ntitle: "false" # exact\r\ndate: "2026-09-18T12:00:00" # date\r\nkind: note\r\nname: source\r\ntags: ["with, comma", \'it\'\'s exact\']\r\nnested: {count: 2, active: true}\r\n---\r\nBody  \r\n';
    writeFileSync(path, source);
    const plan = derive(path, directory);
    const output = render(plan);
    const parsed = readMarkdownFrontmatter(output);
    assert.equal(parsed.body, 'Body  \r\n');
    assert.equal(parsed.frontmatter.title, 'false');
    assert.deepEqual(parsed.frontmatter.tags, ['with, comma', "it's exact"]);
    assert.deepEqual(parsed.frontmatter.nested, {count: 2, active: true});
    assert.equal(parsed.frontmatter['date-created'], '2026-09-18');
    assert.ok(output.includes('title: "false" # exact\r\n'));
    assert.ok(output.includes('date-created: "2026-09-18" # date\r\n'));
    writeFileSync(path, output);
    assert.equal(render(derive(path, directory)), output);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

