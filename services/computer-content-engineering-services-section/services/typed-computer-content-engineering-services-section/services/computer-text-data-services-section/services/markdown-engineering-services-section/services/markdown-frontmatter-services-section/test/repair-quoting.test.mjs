import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { command, repairMarkdownFrontmatterQuoting, runRepairYamlFrontmatterQuoting } from '../scripts/repair-yaml-frontmatter-quoting.mjs';

const silent = {stdout:{write() {}}};

test('repair preserves exact fence, BOM, body, and unaffected frontmatter bytes', () => {
  const source = '\uFEFF--- \r\ntitle: A: B # comment\nkeep: "false"\r\n--- \r\nBody  \r\n';
  const result = repairMarkdownFrontmatterQuoting(source);
  assert.equal(result.status, 'repaired');
  assert.equal(result.text, source.replace('title: A: B', 'title: "A: B"'));
  assert.equal(repairMarkdownFrontmatterQuoting('---\ntitle: A: B\n---suffix\nBody').status, 'no-frontmatter');
});

test('shared inventory reads the complete directory before repair and excludes symlinks', async () => {
  const root = mkdtempSync(join(tmpdir(), 'quoting-inventory-'));
  try {
    const directory = join(root, 'notes'); mkdirSync(directory);
    for (let index = 0; index < 201; index++) writeFileSync(join(directory, `${index}.md`), '---\ntitle: valid\n---\nBody\n');
    const source = '---\ntitle: A: B\n---\nBody  \r\n';
    const target = join(directory, 'z.markdown'); writeFileSync(target, source);
    const outside = join(root, 'outside.md'); writeFileSync(outside, source); symlinkSync(outside, join(directory, 'linked.md'));
    const unresolved = join(directory, 'duplicate.md'); writeFileSync(unresolved, '---\na: one\na: two\n---\nBody\n');
    const dry = await runRepairYamlFrontmatterQuoting(['--root', directory], silent);
    assert.equal(dry.alreadyValid, 201); assert.equal(dry.repaired.length, 1); assert.equal(dry.unresolved.length, 1);
    assert.equal(readFileSync(target, 'utf8'), source);
    const applied = await runRepairYamlFrontmatterQuoting(['--root', directory, '--apply'], silent);
    assert.equal(applied.repaired[0].path, 'z.markdown');
    assert.equal(readFileSync(target, 'utf8'), source.replace('A: B', '"A: B"'));
    assert.equal(readFileSync(outside, 'utf8'), source);
    assert.ok(readFileSync(unresolved, 'utf8').includes('a: one\na: two'));
    let declared = '';
    await command.run({ argv: ['--root', directory], stdout: { write(text) { declared += text; } } });
    const report = JSON.parse(declared); assert.equal(report.applied, false); assert.equal(report.alreadyValid, 202);
  } finally { rmSync(root, {recursive:true,force:true}); }
});

test('an unreadable UTF-8 source prevents the apply phase without partial writes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'quoting-complete-'));
  try {
    const source = '---\ntitle: A: B\n---\nBody\n';
    writeFileSync(join(root, 'a.md'), source);
    writeFileSync(join(root, 'z.md'), Buffer.from([0xff]));
    await assert.rejects(runRepairYamlFrontmatterQuoting(['--root', root, '--apply'], silent), /encoded data/u);
    assert.equal(readFileSync(join(root, 'a.md'), 'utf8'), source);
  } finally { rmSync(root, {recursive:true,force:true}); }
});
