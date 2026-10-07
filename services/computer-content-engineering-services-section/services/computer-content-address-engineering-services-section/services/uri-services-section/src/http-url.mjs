/** Admit a string as an absolute http(s) URL and return it, or throw a TypeError naming `field`. */
export function assertHttpUrl(value, field = "url") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute http(s) URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError(`${field} must be an absolute http(s) URL`);
  return value;
}
