// HTTP Link field values (RFC 8288).

import { quoteHeaderValue, unquoteHeaderValue } from "./header-value.mjs";

export function linkHeader(links) {
  if (!Array.isArray(links)) throw new TypeError("links must be an array");
  return links.map(({ href, ...attrs }) => {
    if (typeof href !== "string" || href.length === 0 || /[>\r\n]/u.test(href)) {
      throw new TypeError("link href must be a non-empty field-safe string");
    }
    const params = Object.entries(attrs).map(([key, value]) => {
      if (!/^[A-Za-z0-9*_-]+$/u.test(key)) throw new TypeError("link parameter name is invalid");
      return `${key}=${quoteHeaderValue(String(value))}`;
    }).join("; ");
    return params ? `<${href}>; ${params}` : `<${href}>`;
  }).join(", ");
}

export function parseLinkHeader(value) {
  if (!value) return Object.freeze([]);
  const links = [];
  for (const part of value.split(/,(?=\s*<)/u)) {
    const match = /^\s*<([^>]*)>\s*(.*)$/u.exec(part);
    if (!match) continue;
    const params = {};
    const paramRe = /;\s*([a-zA-Z0-9*_-]+)\s*=\s*("(?:\\.|[^"])*"|[^;,\s]+)/gu;
    let param;
    while ((param = paramRe.exec(match[2] ?? "")) !== null) {
      let text = param[2];
      if (text.startsWith('"') && text.endsWith('"')) {
        text = unquoteHeaderValue(text);
      }
      params[param[1].toLowerCase()] = text;
    }
    links.push(Object.freeze({ href: match[1].trim(), params: Object.freeze(params) }));
  }
  return Object.freeze(links);
}
