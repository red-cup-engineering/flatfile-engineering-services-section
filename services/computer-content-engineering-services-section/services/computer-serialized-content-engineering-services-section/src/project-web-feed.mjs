import { rss2, atom, jsonFeedObject as syndicationObject } from "./web-feed.mjs";

function httpUrl(value, field) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.href;
  } catch {
    throw new TypeError(`${field} must be an absolute HTTP(S) URL`);
  }
}

function instant(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    throw new TypeError(`${field} must be an RFC 3339 instant`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new TypeError(`${field} must be an RFC 3339 instant`);
  return date;
}

function author(value, field) {
  if (value === undefined) return undefined;
  if (!value || typeof value.name !== "string" || value.name.length === 0) throw new TypeError(`${field}.name is required`);
  return {
    name: value.name,
    ...(value.url === undefined ? {} : { url: httpUrl(value.url, `${field}.url`) }),
    ...(value.email === undefined ? {} : { email: String(value.email) }),
  };
}

function normalized(channel, items) {
  if (!channel || typeof channel.title !== "string" || channel.title.length === 0) throw new TypeError("channel.title is required");
  const value = {
    title: channel.title,
    homePageUrl: httpUrl(channel.homePageUrl, "channel.homePageUrl"),
    ...(channel.description ? { description: String(channel.description) } : {}),
    ...(channel.language ? { language: String(channel.language) } : {}),
    ...(channel.author ? { author: author(channel.author, "channel.author") } : {}),
    ...(channel.iconUrl ? { iconUrl: httpUrl(channel.iconUrl, "channel.iconUrl") } : {}),
  };
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  const normalizedItems = items.map((item, index) => {
    const field = `items[${index}]`;
    if (!item || typeof item.id !== "string" || !item.id) throw new TypeError(`${field}.id is required`);
    if (typeof item.title !== "string" || !item.title) throw new TypeError(`${field}.title is required`);
    const published = item.published === undefined ? undefined : instant(item.published, `${field}.published`).toISOString();
    const updated = item.updated === undefined ? undefined : instant(item.updated, `${field}.updated`).toISOString();
    if (!published && !updated) throw new TypeError(`${field} requires published or updated`);
    return {
      id: item.id,
      url: httpUrl(item.url, `${field}.url`),
      title: item.title,
      ...(item.contentHtml ? { contentHtml: String(item.contentHtml) } : {}),
      ...(typeof item.contentText === "string" ? { contentText: item.contentText } : {}),
      ...(item.summary ? { summary: String(item.summary) } : {}),
      ...(published ? { published } : {}),
      ...(updated ? { updated } : {}),
      ...(item.tags ? { tags: Object.freeze([...item.tags].map(String)) } : {}),
      ...(item.author ? { author: author(item.author, `${field}.author`) } : {}),
    };
  });
  return { channel: value, items: normalizedItems };
}

export function serializeRssFeed(channel, items, options = {}) {
  ({ channel, items } = normalized(channel, items));
  return rss2({ ...channel, feedUrl: httpUrl(options.feedUrl, "options.feedUrl") }, items, { contentEncoding: "cdata" });
}

export function serializeAtomFeed(channel, items, options = {}) {
  ({ channel, items } = normalized(channel, items));
  return atom({ ...channel, feedUrl: httpUrl(options.feedUrl, "options.feedUrl"),
    ...(options.updated ? { updated: instant(options.updated, "options.updated").toISOString() } : {}) }, items);
}

export function jsonFeedObject(channel, items, options = {}) {
  ({ channel, items } = normalized(channel, items));
  return syndicationObject({ ...channel, feedUrl: httpUrl(options.feedUrl, "options.feedUrl") }, items);
}

export function serializeJsonFeed(channel, items, options = {}) {
  return `${JSON.stringify(jsonFeedObject(channel, items, options), null, 2)}\n`;
}

export function projectWebFeedArtifacts({ channel, items, paths = {}, updated } = {}) {
  const resolved = {
    rss: paths.rss ?? "feed.rss.xml",
    atom: paths.atom ?? "feed.atom.xml",
    json: paths.json ?? "feed.json",
  };
  for (const [format, path] of Object.entries(resolved)) {
    if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\")
      || path.split("/").some((part) => !part || part === "." || part === "..")) {
      throw new TypeError(`paths.${format} must be a safe relative artifact path`);
    }
  }
  if (new Set(Object.values(resolved)).size !== 3) throw new TypeError("feed artifact paths must be unique");
  const url = (path) => new URL(path, channel.homePageUrl).href;
  return Object.freeze({ artifacts: Object.freeze([
    { path: resolved.rss, body: serializeRssFeed(channel, items, { feedUrl: url(resolved.rss) }), mediaType: "application/rss+xml; charset=utf-8", source: "feed:rss" },
    { path: resolved.atom, body: serializeAtomFeed(channel, items, { feedUrl: url(resolved.atom), updated }), mediaType: "application/atom+xml; charset=utf-8", source: "feed:atom" },
    { path: resolved.json, body: serializeJsonFeed(channel, items, { feedUrl: url(resolved.json) }), mediaType: "application/feed+json; charset=utf-8", source: "feed:json" },
  ]) });
}
