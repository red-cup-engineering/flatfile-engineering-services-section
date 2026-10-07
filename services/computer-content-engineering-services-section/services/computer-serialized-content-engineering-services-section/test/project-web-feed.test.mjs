import assert from "node:assert/strict";
import test from "node:test";
import { projectWebFeedArtifacts, serializeAtomFeed, serializeJsonFeed, serializeRssFeed } from "../src/project-web-feed.mjs";

const channel = { title: "Example Notes", homePageUrl: "https://example.test/", description: "Useful notes", language: "en", author: { name: "Example Author", url: "https://example.test/about/" } };
const items = [{ id: "https://example.test/notes/one/", url: "https://example.test/notes/one/", title: "One & Two", summary: "A <summary>", contentHtml: "<p>Hello</p>", published: "2026-08-27T12:00:00Z", tags: ["web"] }];

test("serializes valid RSS with escaped metadata and preserved HTML content", () => {
  const value = serializeRssFeed(channel, items, { feedUrl: "https://example.test/feed.rss.xml" });
  assert.match(value, /<rss version="2.0"/);
  assert.match(value, /<title>One &amp; Two<\/title>/);
  assert.match(value, /<content:encoded><!\[CDATA\[<p>Hello<\/p>\]\]><\/content:encoded>/);
  assert.match(value, /<atom:link href="https:\/\/example.test\/feed.rss.xml"/);
});

test("serializes Atom and JSON Feed 1.1 from the same items", () => {
  const atom = serializeAtomFeed(channel, items, { feedUrl: "https://example.test/feed.atom.xml" });
  assert.match(atom, /xmlns="http:\/\/www.w3.org\/2005\/Atom"/);
  assert.equal(Date.parse(atom.match(/<updated>([^<]+)<\/updated>/)[1]), Date.parse("2026-08-27T12:00:00Z"));
  const json = JSON.parse(serializeJsonFeed(channel, items, { feedUrl: "https://example.test/feed.json" }));
  assert.equal(json.version, "https://jsonfeed.org/version/1.1");
  assert.equal(json.items[0].content_html, "<p>Hello</p>");
  assert.deepEqual(json.items[0].tags, ["web"]);
});

test("projects all three ordinary feed artifacts deterministically", () => {
  const first = projectWebFeedArtifacts({ channel, items });
  const second = projectWebFeedArtifacts({ channel, items });
  assert.deepEqual(first, second);
  assert.deepEqual(first.artifacts.map((artifact) => artifact.path), ["feed.rss.xml", "feed.atom.xml", "feed.json"]);
  assert.deepEqual(first.artifacts.map((artifact) => artifact.mediaType), [
    "application/rss+xml; charset=utf-8",
    "application/atom+xml; charset=utf-8",
    "application/feed+json; charset=utf-8",
  ]);
});

test("summary feeds and plain text retain a content field for JSON Feed readers", () => {
  const encode = (item) => JSON.parse(serializeJsonFeed(channel, [item], { feedUrl: "https://example.test/feed.json" })).items[0];
  const summaryOnly = { ...items[0], contentHtml: undefined };
  assert.equal(encode(summaryOnly).content_text, summaryOnly.summary);
  assert.equal(encode({ ...summaryOnly, summary: undefined }).content_text, summaryOnly.title);
  assert.equal(encode({ ...summaryOnly, contentText: "A full plain text article" }).content_text, "A full plain text article");
  assert.equal(encode({ ...items[0], contentText: "Hello" }).content_html, items[0].contentHtml);
  assert.equal(encode({ ...items[0], contentText: "Hello" }).content_text, "Hello");
});

test("refuses invalid URLs and items without publication instants", () => {
  assert.throws(() => serializeRssFeed({ ...channel, homePageUrl: "/relative" }, items, { feedUrl: "https://example.test/feed.xml" }), /absolute HTTP/);
  assert.throws(() => serializeJsonFeed(channel, [{ ...items[0], published: undefined }], { feedUrl: "https://example.test/feed.json" }), /requires published or updated/);
  assert.throws(() => projectWebFeedArtifacts({ channel, items, paths: { rss: "../feed.xml" } }), /safe relative/);
  assert.throws(() => projectWebFeedArtifacts({ channel, items, paths: { rss: "feed.xml", atom: "feed.xml" } }), /must be unique/);
});
