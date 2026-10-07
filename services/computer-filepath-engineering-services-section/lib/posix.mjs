export const POSIX_PATHNAME_PATTERN = /^\/$|^\/?(?:[^/\u0000]+\/?)+$/;

export const isPathname = (value) => POSIX_PATHNAME_PATTERN.test(value);

export const validPath = (path) =>
  typeof path === "string" && path.length > 0 && !path.includes("\0");

export function normalizePath(path) {
  if (!validPath(path)) throw new TypeError("normalizePath: path must be a non-empty string without NUL");
  const absolute = path.startsWith("/");
  const parts = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length > 0 && parts[parts.length - 1] !== "..") parts.pop();
      else if (!absolute) parts.push("..");
      continue;
    }
    parts.push(part);
  }
  const joined = parts.join("/");
  if (absolute) return joined ? `/${joined}` : "/";
  return joined || ".";
}

export function pathParent(path) {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return null;
  const absolute = normalized.startsWith("/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return absolute ? "/" : ".";
  const parent = parts.slice(0, -1).join("/");
  return absolute ? `/${parent}` : parent;
}

export function pathBasename(path) {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === ".") return normalized;
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

export function pathPoint(path) {
  return `path:${normalizePath(path)}`;
}

export function pathOfPoint(point) {
  return point.startsWith("path:") ? point.slice(5) : null;
}
