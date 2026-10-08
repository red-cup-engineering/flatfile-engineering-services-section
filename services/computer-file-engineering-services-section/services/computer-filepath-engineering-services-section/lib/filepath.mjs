import { lstat, realpath } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

function requireString(value, name) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} must be a nonempty string`);
}

function displacementUnder(root, target) {
  const displacement = relative(root, target);
  if (displacement === ".." || displacement.startsWith(`..${sep}`) || resolve(root, displacement) !== target) {
    throw new TypeError("path escapes the root");
  }
  return displacement;
}

export function toPosixPath(path) {
  requireString(path, "path");
  return path.split(sep).join("/");
}

/** Lexically resolve one address beneath root. This does not inspect filesystem custody. */
export function confinePath({ root, path = "", allowRoot = true } = {}) {
  requireString(root, "root");
  if (typeof path !== "string") throw new TypeError("path must be a string");
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, path);
  const displacement = displacementUnder(absoluteRoot, absolutePath);
  if (!allowRoot && displacement === "") throw new TypeError("path must name an entry beneath root");
  return Object.freeze({ root: absoluteRoot, path: absolutePath, relativePath: toPosixPath(displacement || ".") });
}

/** Confine an existing carrier by its real path, refusing symlink escapes. */
export async function confineExistingPath(options = {}) {
  const lexical = confinePath(options);
  const realRoot = await realpath(lexical.root);
  const realPath = await realpath(lexical.path);
  const displacement = displacementUnder(realRoot, realPath);
  if (options.allowRoot === false && displacement === "") throw new TypeError("path must name an entry beneath root");
  return Object.freeze({ root: realRoot, path: realPath, relativePath: toPosixPath(displacement || ".") });
}

/**
 * Confine a writable address. Existing ancestors are resolved so a symlinked
 * directory cannot redirect the future carrier outside root.
 */
export async function confineWritablePath(options = {}) {
  const lexical = confinePath({ ...options, allowRoot: false });
  const realRoot = await realpath(lexical.root);
  let ancestor = lexical.path;
  while (true) {
    try {
      await lstat(ancestor);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
  const realAncestor = await realpath(ancestor);
  displacementUnder(realRoot, realAncestor);
  return Object.freeze({ root: realRoot, path: lexical.path, relativePath: lexical.relativePath });
}

export function hasExtension(path, extensions) {
  requireString(path, "path");
  if (!Array.isArray(extensions) || extensions.length === 0) throw new TypeError("extensions must be a nonempty array");
  const extension = extname(path).toLowerCase();
  return extensions.some((candidate) => typeof candidate === "string" && extension === (candidate.startsWith(".") ? candidate : `.${candidate}`).toLowerCase());
}

export function isMarkdownPath(path) {
  return hasExtension(path, [".md", ".markdown"]);
}
