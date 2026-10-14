const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const ADMITTED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Admit a Markdown link destination for safe HTML projection.
 *
 * Input is one string; output is its trimmed destination, or null when it is
 * empty or has a non-web scheme. Relative paths and fragments are admitted.
 */
export function admitMarkdownLinkTarget(value) {
  if (typeof value !== "string") throw new TypeError("value must be a string");
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // HTML URL consumers remove leading/trailing C0 controls and spaces, then
  // ASCII tabs and newlines anywhere. Classify that spelling so controls
  // cannot hide a non-web scheme, while retaining the admitted destination.
  // URL schemes are ASCII; Unicode case folding would misclassify relative paths.
  const urlInput = trimmed.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "").replace(/[\t\n\r]/g, "");
  const scheme = urlInput.match(SCHEME)?.[0]?.toLowerCase();
  return scheme !== undefined && !ADMITTED_SCHEMES.has(scheme) ? null : trimmed;
}
