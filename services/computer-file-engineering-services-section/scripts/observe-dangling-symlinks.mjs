import { observeDanglingSymlinks } from "../src/observe-dangling-symlinks.mjs";

// Default excludes are ".git" only — deliberately NOT "node_modules": a
// dangling symlink inside node_modules is exactly the failure class that
// broke four packages' test suites silently, so it must not be excluded by
// default. Pass --exclude to scope a run further, or --no-default-excludes
// to drop even the ".git" default.
const DEFAULT_EXCLUDES = [".git"];

/** Observe and write one NDJSON line per dangling symlink; under --strict any finding settles to failure. */
export async function runObserveDanglingSymlinks(argv, io) {
  let root = null;
  let useDefaultExcludes = true;
  let strict = false;
  const excludes = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") root = argv[(index += 1)];
    else if (arg === "--exclude") excludes.push(argv[(index += 1)]);
    else if (arg === "--no-default-excludes") useDefaultExcludes = false;
    else if (arg === "--strict") strict = true;
    else throw new TypeError(`unrecognized argument: ${arg}`);
  }
  if (!root) throw new TypeError("--root is required");
  if (useDefaultExcludes) excludes.push(...DEFAULT_EXCLUDES);
  const observation = await observeDanglingSymlinks({ root, excludes });
  for (const entry of observation.dangling) io.stdout.write(`${JSON.stringify(entry)}\n`);
  return Object.freeze({ observation, strict });
}

export { observeDanglingSymlinks };

export const command = Object.freeze({
  run: ({ argv, stdin, stdout, stderr }) => runObserveDanglingSymlinks(argv, { stdin, stdout, stderr }),
  resultExitCode: ({ observation, strict }) => (strict && observation.dangling.length > 0 ? 1 : 0),
  formatError: (error) => `observe-dangling-symlinks: ${error.message}\n`,
  exitCode: 2,
});
