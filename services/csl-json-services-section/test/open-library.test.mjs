import assert from "node:assert/strict";
import test from "node:test";

import { fetchOpenLibraryBook, isValidIsbn } from "../src/open-library.mjs";

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("validates ISBN checksums and projects an Open Library edition", async () => {
  assert.equal(isValidIsbn("978-0-670-65400-0"), true);
  assert.equal(isValidIsbn("9780670654001"), false);
  const seen = [];
  const fetchImpl = async (input, init) => {
    const url = String(input); seen.push({ url, init });
    if (url.endsWith("/isbn/9780670654000.json")) return response({ title: "The Snowy Day", publish_date: "1962", publishers: ["Viking Press"], number_of_pages: 32, works: [{ key: "/works/OL45804W" }], authors: [{ key: "/authors/OL22242A" }] });
    if (url.endsWith("/works/OL45804W.json")) return response({ title: "The Snowy Day", first_publish_date: "1962" });
    if (url.endsWith("/authors/OL22242A.json")) return response({ name: "Ezra Jack Keats" });
    return response({}, 404);
  };
  const result = await fetchOpenLibraryBook("9780670654000", { fetchImpl });
  assert.deepEqual(result.record.author, [{ family: "Keats", given: "Ezra Jack" }]);
  assert.equal(result.record.title, "The Snowy Day");
  assert.equal(result.record.ISBN, "9780670654000");
  assert.equal(result.record["number-of-pages"], 32);
  assert.equal(result.sources.length, 3);
  assert.ok(seen.every(({ init }) => init.headers["User-Agent"].includes("561-group")));
});
