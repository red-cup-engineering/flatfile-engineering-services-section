import { lstat, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export async function relocateDirectory({ source, destination, apply = false } = {}) {
  if (typeof source !== "string" || source.length === 0) throw new TypeError("source is required");
  if (typeof destination !== "string" || destination.length === 0) throw new TypeError("destination is required");
  const absoluteSource = resolve(source);
  const absoluteDestination = resolve(destination);
  if (absoluteSource === absoluteDestination) throw new Error("source and destination are the same directory");
  const sourceStat = await lstat(absoluteSource).catch(() => null);
  if (!sourceStat?.isDirectory()) throw new Error(`source is not a directory: ${absoluteSource}`);
  if (await lstat(absoluteDestination).then(() => true, () => false)) {
    throw new Error(`destination already exists: ${absoluteDestination}`);
  }

  const result = { source: absoluteSource, destination: absoluteDestination, apply };
  if (!apply) return Object.freeze(result);
  await mkdir(dirname(absoluteDestination), { recursive: true });
  try {
    await rename(absoluteSource, absoluteDestination);
  } catch (error) {
    if (error.code === "EXDEV") throw new Error("source and destination are on different filesystems; refusing a non-atomic copy/delete move");
    throw error;
  }
  return Object.freeze({ ...result, completed: true });
}
