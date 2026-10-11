import assert from "node:assert/strict";
import test from "node:test";
import { splitMarkdownFrontmatterFence as split } from "../src/split-markdown-frontmatter-fence.mjs";

test("splits exact leading fences without changing body bytes", () => {
  assert.deepEqual(split("\uFEFF---\r\ntitle: Example\r\n---\r\nBody\r\n"), {format:"yaml",raw:"title: Example",body:"Body\r\n",source:{rawStart:6,rawEnd:22,bodyStart:27}});
  assert.deepEqual(split("+++\rkey = 1\r+++\rBody"), {format:"toml",raw:"key = 1",body:"Body",source:{rawStart:4,rawEnd:12,bodyStart:16}});
  assert.deepEqual(split("---\n---\nBody"), {format:"yaml",raw:"",body:"Body",source:{rawStart:4,rawEnd:4,bodyStart:8}});
  assert.deepEqual(split("---\nkey: value\n---"), {format:"yaml",raw:"key: value",body:"",source:{rawStart:4,rawEnd:15,bodyStart:18}});
  assert.equal(split("---\nkey: value\n---suffix\nBody"), null);
  assert.equal(split("---\nkey: value"), null);
});
