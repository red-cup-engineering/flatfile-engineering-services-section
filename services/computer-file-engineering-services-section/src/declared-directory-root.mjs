import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/**
 * Resolve one declared directory in an installed source tree.
 * A caller may supply a trusted absolute mount override. Never discover a
 * random checkout or infer installation from the current working directory.
 * Choosing a path does not authenticate its owner or authorize its contents.
 */
export function selectDeclaredDirectoryRoot(repositoryRoot, declaredPath, { override } = {}) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot.trim()) {
    throw new TypeError('installed repository root must be a nonempty string');
  }
  if (typeof declaredPath !== 'string' || !declaredPath.trim()) {
    throw new TypeError('installed relative directory must be a nonempty string');
  }
  if (!isAbsolute(repositoryRoot)) throw new TypeError('installed repository root must be absolute');
  if (isAbsolute(declaredPath)) throw new TypeError('installed directory declaration must be relative');
  if (declaredPath.includes('\\')) throw new TypeError('installed directory declaration must use POSIX separators');
  const segments = declaredPath.split(/[\\/]/u);
  if (segments.some(s => !s || s === '.' || s === '..')) {
    throw new TypeError('installed directory declaration must not traverse outside the repository');
  }
  if (override !== undefined && override !== '') {
    if (typeof override !== 'string' || !isAbsolute(override)) {
      throw new TypeError('directory mount override must be absolute');
    }
    return resolve(override);
  }
  return resolve(repositoryRoot, declaredPath);
}

/**
 * Check a directory's physical presence and the one specifically declared
 * child. The child must resolve to its own location beneath the resolved root;
 * a symlink to a sibling or another principal's forest is not that child.
 * This is filesystem containment, NOT source authenticity or read authority.
 */
export function assertDeclaredDirectoryRoot(root, {
  requiredChild,
  readStatus = statSync,
  readRealPath = realpathSync,
} = {}) {
  if (typeof root !== 'string' || !isAbsolute(root)) {
    throw new TypeError('declared directory root must be absolute');
  }
  try {
    if (!readStatus(root).isDirectory()) throw new Error('not a directory');
  } catch (cause) {
    throw Object.assign(new Error('declared directory unavailable: install or mount the authorized source; never select a different checkout implicitly', { cause }), {
      code: 'DECLARED_DIRECTORY_UNAVAILABLE', root,
    });
  }
  if (requiredChild !== undefined) {
    if (typeof requiredChild !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(requiredChild)) {
      throw new TypeError('required child must be a single directory name');
    }
    const child = resolve(root, requiredChild);
    try {
      if (!readStatus(child).isDirectory()) throw new Error('not a directory');
      const expected = resolve(readRealPath(root), requiredChild);
      if (readRealPath(child) !== expected) throw new Error('declared child resolves into another directory');
    } catch (cause) {
      throw Object.assign(new Error('declared directory child unavailable or points outside its own section', { cause }), {
        code: 'DECLARED_DIRECTORY_CHILD_UNAVAILABLE', root, child: requiredChild,
      });
    }
  }
  return root;
}
