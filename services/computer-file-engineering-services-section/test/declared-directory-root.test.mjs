import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { selectDeclaredDirectoryRoot, assertDeclaredDirectoryRoot } from '../src/declared-directory-root.mjs';

test('declared source path is relative to exact installed repository, never ambient cwd', () => {
  const root = '/gnu/store/pinned-host';
  assert.equal(selectDeclaredDirectoryRoot(root, 'services/science'), '/gnu/store/pinned-host/services/science');
  assert.equal(selectDeclaredDirectoryRoot(root, 'old', {override:'/mnt/admitted/corpus'}), '/mnt/admitted/corpus');
  for (const name of ['../elsewhere','a/../elsewhere','/etc','./a','a//b','a\\b']) {
    assert.throws(() => selectDeclaredDirectoryRoot(root,name), TypeError, name);
  }
  assert.throws(() => selectDeclaredDirectoryRoot('relative/root','section'), TypeError);
  assert.throws(() => selectDeclaredDirectoryRoot(root,'',{}), TypeError);
  assert.throws(() => selectDeclaredDirectoryRoot(root,'section',{override:'../untrusted'}), TypeError);
  assert.throws(() => selectDeclaredDirectoryRoot(root,'section',{override:4}), TypeError);
});

test('missing or non-directory installed roots report unavailable without indexing an empty corpus', () => {
  assert.throws(() => assertDeclaredDirectoryRoot('relative/root'), TypeError);
  assert.throws(() => assertDeclaredDirectoryRoot('/missing', {readStatus:()=>{throw new Error('ENOENT')}}),
    e => e.code === 'DECLARED_DIRECTORY_UNAVAILABLE' && e.root === '/missing' && !!e.cause);
  assert.throws(() => assertDeclaredDirectoryRoot('/file', {readStatus:()=>({isDirectory:()=>false})}),
    e => e.code === 'DECLARED_DIRECTORY_UNAVAILABLE');
});

test('a physical named section is accepted; foreign symlink and missing section refuse with exact identity', t => {
  const base = mkdtempSync(join(tmpdir(),'declared-root-'));
  t.after(()=>rmSync(base,{recursive:true,force:true}));
  const physical = join(base,'physical');
  const foreign = join(base,'foreign');
  const mount = join(base,'mount');
  mkdirSync(join(physical,'science-services-section'),{recursive:true});
  mkdirSync(join(foreign,'outside'),{recursive:true});
  symlinkSync(physical,mount,'dir');
  assert.equal(assertDeclaredDirectoryRoot(mount,{requiredChild:'science-services-section'}),mount);
  assert.equal(realpathSync(mount),physical);
  symlinkSync(join(foreign,'outside'), join(physical,'foreign-section'),'dir');
  assert.throws(() => assertDeclaredDirectoryRoot(mount,{requiredChild:'foreign-section'}),
    e => e.code === 'DECLARED_DIRECTORY_CHILD_UNAVAILABLE' && e.child === 'foreign-section');
  assert.throws(() => assertDeclaredDirectoryRoot(mount,{requiredChild:'missing-section'}),
    e => e.code === 'DECLARED_DIRECTORY_CHILD_UNAVAILABLE' && e.child === 'missing-section');
  for (const value of ['../foreign','a/b','.','..', '', null, []]) {
    assert.throws(() => assertDeclaredDirectoryRoot(mount,{requiredChild:value}), TypeError);
  }
  assert.equal(assertDeclaredDirectoryRoot(mount),mount);
});

test('an apparent directory does not pass if realpath of its named child leaves the selected root', () => {
  const fakeStatus = path => ({isDirectory:()=>path.startsWith('/declared')});
  assert.throws(() => assertDeclaredDirectoryRoot('/declared',{
    requiredChild:'science',
    readStatus:fakeStatus,
    readRealPath:p=>p.endsWith('/science')?'/foreign/science':'/declared',
  }), e=>e.code==='DECLARED_DIRECTORY_CHILD_UNAVAILABLE');
});
