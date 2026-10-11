export const MAX_URLS_PER_SITEMAP: 50000;

export type FeedAuthor = Readonly<{ name: string; url?: string; email?: string }>;

/** WebSub discovery for a channel: the hub, and the feed URL subscribers name (the channel's `feedUrl` by default). */
export type WebSubDiscovery = Readonly<{ hub: string; self?: string }>;

export type FeedChannel = Readonly<{
  id?: string;
  title: string;
  /** Absolute http(s) URL of the site the feed describes. */
  homePageUrl: string;
  /** Absolute http(s) URL the feed is served at. */
  feedUrl: string;
  description?: string;
  language?: string;
  /** RFC-3339 instant; defaults to the latest item instant. */
  updated?: string;
  iconUrl?: string;
  imageUrl?: string;
  author?: FeedAuthor;
  webSub?: WebSubDiscovery;
}>;

export type FeedItem = Readonly<{
  id: string;
  title: string;
  /** Absolute http(s) URL. */
  url: string;
  /** RFC-3339 instants. */
  published?: string;
  updated?: string;
  author?: FeedAuthor;
  summary?: string;
  contentHtml?: string;
  contentText?: string;
  imageUrl?: string;
  language?: string;
  tags?: readonly string[];
}>;

export type FeedPageLinks = Readonly<{
  self?: string;
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
  complete?: boolean;
}>;

export type FeedPage = Readonly<{
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: readonly FeedItem[];
  links: FeedPageLinks;
}>;

export type FeedPageOptions = Readonly<{ pageSize: number; page?: number; pageParam?: string }>;

export type SitemapChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitemapUrl = Readonly<{
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFrequency;
  priority?: number;
}>;

export type SitemapRef = Readonly<{ loc: string; lastmod?: string }>;

export type NewsSitemapUrl = Readonly<{
  loc: string;
  publication: Readonly<{ name: string; language: string }>;
  /** An RFC-3339 instant, or a calendar day (`YYYY-MM-DD`). */
  publicationDate: string;
  title: string;
}>;

export type RobotsGroup = Readonly<{
  userAgent?: string | readonly string[];
  allow?: readonly string[];
  disallow?: readonly string[];
  crawlDelay?: number;
}>;

export type RobotsOptions = Readonly<{
  groups?: readonly RobotsGroup[];
  host?: string;
  sitemap?: string | readonly string[];
}>;

/** One syndication item read from a feed. */
export type SyndicationItem = Readonly<{
  id?: string;
  url: string;
  title: string;
  summary?: string;
  authors?: readonly string[];
  published?: string;
  updated?: string;
  categories?: readonly string[];
  /** The format the item was read from, or the feed it came from. */
  source: string;
}>;

export function escapeXml(value: unknown): string;
export const escapeXmlAttr: typeof escapeXml;
export const escapeHtml: typeof escapeXml;
export function escapeHtmlText(value: unknown): string;
export function joinUrl(base: unknown, path?: unknown): string;
export function normalizePath(path: unknown, fallback: unknown): string;
export function scalars(value: unknown): string[];
export function maybeString(value: unknown): string | undefined;

export function parseRfc3339(value: unknown): number;
export function imfFixdate(date: Date): string;
export function rfc3339ToRfc822(value: string): string;
export function rfc3339ToUtc(value: string): string;
export function rfc3339ToDate(value: string): string;

export function effectiveAuthor(item: FeedItem, channel?: FeedChannel): FeedAuthor | undefined;
export function effectiveUpdated(item: FeedItem): string | undefined;
export function feedUpdated(channel: FeedChannel, items: readonly FeedItem[]): string | undefined;
export function webSubLinks(channel: FeedChannel): Required<WebSubDiscovery> | undefined;

export function rss2(channel: FeedChannel, items?: readonly FeedItem[], paging?: FeedPageLinks): string;
export function rssItem(item: FeedItem, channel: FeedChannel, options?: Readonly<{ contentEncoding?: "cdata" }>): string;
export function atom(channel: FeedChannel, items?: readonly FeedItem[], paging?: FeedPageLinks): string;
export function atomEntry(item: FeedItem, channel: FeedChannel): string;
export function jsonFeedObject(channel: FeedChannel, items?: readonly FeedItem[], paging?: FeedPageLinks): Record<string, unknown>;
export function jsonFeedItem(item: FeedItem, channel: FeedChannel): Record<string, unknown>;
export function jsonFeed(channel: FeedChannel, items?: readonly FeedItem[], paging?: FeedPageLinks): string;

export function sitemap(urls: readonly SitemapUrl[]): string;
export function sitemapIndex(refs: readonly SitemapRef[]): string;
export function splitSitemaps(urls: readonly SitemapUrl[], size?: number): SitemapUrl[][];
export function newsSitemap(urls: readonly NewsSitemapUrl[]): string;
export function robots(baseOrSitemap?: string | RobotsOptions): string;
export function feedPage(channel: FeedChannel, items: readonly FeedItem[], opts: FeedPageOptions): FeedPage;

export function parseFeed(xml: unknown): readonly SyndicationItem[];
export function parseArxivAtom(xml: unknown): readonly SyndicationItem[];
export function parseJsonFeed(document: string | Record<string, unknown>, options?: Readonly<{ source?: string }>): readonly SyndicationItem[];
