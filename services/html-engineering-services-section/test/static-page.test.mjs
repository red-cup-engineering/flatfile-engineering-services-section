import assert from "node:assert/strict";
import test from "node:test";

import { htmlElement } from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { renderStaticWebsiteHtmlPresentation, staticWebsiteBodyAttributes } from "../src/static-page.mjs";

test("static presentation preserves head fragments and escapes body attributes and text", () => {
  const html = renderStaticWebsiteHtmlPresentation({
    title: "A <page>",
    token: "page:test",
    lang: "en",
    head: Object.freeze([htmlElement("meta", { name: "description", content: "head & evidence" })]),
    bodyAttributes: Object.freeze({
      ...staticWebsiteBodyAttributes({ lens: "test-lens" }),
      "data-hostile": "quote\" <tag>",
    }),
    roots: Object.freeze(["main"]),
    nodes: Object.freeze([
      Object.freeze({ nodeId: "main", element: "main", children: Object.freeze(["title"]) }),
      Object.freeze({ nodeId: "title", element: "h1", text: "Hello <script>alert(1)</script>" }),
    ]),
  });

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<html lang="en">/u);
  assert.match(html, /<meta name="description" content="head &amp; evidence">/u);
  assert.match(html, /<body[^>]*data-hostile="quote&quot; &lt;tag&gt;"/u);
  assert.match(html, /Hello &lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.equal(html.includes("<script>alert(1)</script>"), false);
});
