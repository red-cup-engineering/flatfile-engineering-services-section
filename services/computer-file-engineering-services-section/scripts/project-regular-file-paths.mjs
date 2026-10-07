

export function projectRegularFilePaths(walk) {
  if (!walk || walk.type !== "PosixPathWalk" || !Array.isArray(walk.files)) throw new TypeError("walk must be a PosixPathWalk observation");
  return Object.freeze(walk.files.filter(({ kind }) => kind === "file").map(({ path }) => path));
}

export const operation = Object.freeze({ name: "project-regular-file-paths", description: "projectRegularFilePaths — the project-regular-file-paths operation.", operation: projectRegularFilePaths });
