import { dirname, resolve as resolvePath } from "node:path";

import { admitMarkdownLinkTarget } from "./admit-markdown-link-target.mjs";
import { confineExistingPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";

const ANY_SCHEME = /^([a-z][a-z0-9+.-]*):/iu;
const WEB_OR_MAILTO_SCHEME = /^(https?|mailto):/iu;
const ROOT_ESCAPE = /escapes the root/u;

function requireNonemptyString(value, name) {
  if (typeof value !== "string" || value === "") throw new TypeError(`${name} must be a nonempty string`);
}

function schemeOf(trimmed) {
  if (WEB_OR_MAILTO_SCHEME.test(trimmed)) return trimmed.match(WEB_OR_MAILTO_SCHEME)[1].toLowerCase();
  if (admitMarkdownLinkTarget(trimmed) === null) return trimmed.match(ANY_SCHEME)[1].toLowerCase();
  return null;
}

function splitFragment(raw) {
  const hash = raw.indexOf("#");
  if (hash < 0) return { path: raw, fragment: null };
  return { path: raw.slice(0, hash), fragment: raw.slice(hash + 1) || null };
}

function decodedPath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function finding(status, { resolved, scheme = null, path = null, fragment = null }, target) {
  return Object.freeze({ status, resolved, target, scheme, path, fragment });
}

/**
 * Resolve one Markdown link destination against the real filesystem.
 *
 * The destination is classified into exactly one admitted case: an absolute
 * web/mailto (or other) scheme, a bare fragment naming the carrier itself, a
 * path that resolves inside the confining root, a path that would resolve
 * outside it (directly or through a symbolic link), or a path that does not
 * exist. Only malformed input throws; every other outcome is data.
 *
 * @param {string} target - Raw link destination text (a feature's `target`).
 * @param {object} options
 * @param {string} options.carrierPath - Absolute path of the carrier the link appears in.
 * @param {string} options.root - Absolute path confining the resolution.
 * @returns {Promise<Readonly<{
 *   status: "scheme"|"same-document"|"resolved"|"missing"|"escaped",
 *   resolved: boolean|null,
 *   target: string,
 *   scheme: string|null,
 *   path: string|null,
 *   fragment: string|null,
 * }>>}
 * @throws {TypeError} When target, carrierPath, or root are not nonempty strings (target may be any string, including empty).
 */
export async function resolveMarkdownLinkTarget(target, { carrierPath, root } = {}) {
  if (typeof target !== "string") throw new TypeError("target must be a string");
  requireNonemptyString(carrierPath, "carrierPath");
  requireNonemptyString(root, "root");

  const trimmed = target.trim();
  const scheme = trimmed === "" ? null : schemeOf(trimmed);
  if (scheme !== null) return finding("scheme", { resolved: null, scheme }, target);

  const { path: rawPath, fragment } = splitFragment(trimmed);
  if (rawPath === "") return finding("same-document", { resolved: true, fragment }, target);

  const absoluteTarget = resolvePath(dirname(carrierPath), decodedPath(rawPath));
  try {
    const address = await confineExistingPath({ root, path: absoluteTarget, allowRoot: true });
    return finding("resolved", { resolved: true, path: address.relativePath, fragment }, target);
  } catch (error) {
    if (error instanceof TypeError && ROOT_ESCAPE.test(error.message)) {
      return finding("escaped", { resolved: false, fragment }, target);
    }
    if (error?.code === "ENOENT") return finding("missing", { resolved: false, fragment }, target);
    throw error;
  }
}
