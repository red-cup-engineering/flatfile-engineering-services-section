import { readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** Remove one document and every directory it leaves empty, up to root. */
export async function removeMarkdownFile({ root, path }) {
  const top = resolve(root);
  const target = resolve(top, path);
  if (!target.startsWith(`${top}/`)) throw new Error(`refusing to remove outside root: ${path}`);
  await unlink(target);
  for (let directory = dirname(target); directory.startsWith(`${top}/`); directory = dirname(directory)) {
    if ((await readdir(directory)).length > 0) break;
    await rmdir(directory);
  }
}
