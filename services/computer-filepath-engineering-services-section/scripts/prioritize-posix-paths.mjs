function requirePosixRelativePath(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a nonempty root-relative POSIX path`);
  }
  if (value.startsWith("/") || value.includes("\\") || value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new TypeError(`${name} must be a normalized root-relative POSIX path`);
  }
}

function requirePathArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  value.forEach((path, index) => requirePosixRelativePath(path, `${name}[${index}]`));
}

function priorityRank(path, priorityPaths) {
  return priorityPaths.findIndex((priorityPath) => (
    path === priorityPath || path.startsWith(`${priorityPath}/`)
  ));
}

function validatePriorityPaths(priorityPaths) {
  const observed = new Set();
  for (const priorityPath of priorityPaths) {
    if (observed.has(priorityPath)) throw new TypeError(`priorityPaths must not repeat ${priorityPath}`);
    for (const earlierPath of observed) {
      if (priorityPath.startsWith(`${earlierPath}/`)) {
        throw new TypeError(`priorityPaths must not contain a descendant of an earlier priority path: ${priorityPath}`);
      }
    }
    observed.add(priorityPath);
  }
}

/**
 * Order root-relative POSIX paths by caller-provided path-prefix priority.
 * This operation only orders path strings; it neither observes nor filters a
 * filesystem. Earlier priority paths win, and every group is lexical.
 */
export function prioritizePosixPaths({ paths, priorityPaths = [] } = {}) {
  requirePathArray(paths, "paths");
  requirePathArray(priorityPaths, "priorityPaths");
  validatePriorityPaths(priorityPaths);

  const ranked = paths.map((path, index) => ({
    path,
    index,
    rank: priorityRank(path, priorityPaths),
  }));
  ranked.sort((left, right) => (
    (left.rank === -1 ? Infinity : left.rank) - (right.rank === -1 ? Infinity : right.rank)
    || left.path.localeCompare(right.path)
    || left.index - right.index
  ));
  return Object.freeze(ranked.map(({ path }) => path));
}
