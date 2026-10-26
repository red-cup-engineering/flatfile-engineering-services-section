import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const pause = new Int32Array(new SharedArrayBuffer(4));

/**
 * Run `work` holding a lock directory under `directory`, so writers on one host that derive what
 * they append from what they read serialize. A lock left by a process that died is taken over once
 * it is older than `staleMs`; a writer that cannot take the lock within `waitMs` is refused.
 */
export function withDirectoryLock(directory, work, { staleMs = 30_000, waitMs = 15_000 } = {}) {
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, ".lock");
  const deadline = Date.now() + waitMs;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age = 0;
      try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
      if (age > staleMs) { rmSync(lock, { recursive: true, force: true }); continue; }
      if (Date.now() > deadline) throw new Error(`${directory} is held by another writer`);
      Atomics.wait(pause, 0, 0, 5);
    }
  }
  try { return work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}
