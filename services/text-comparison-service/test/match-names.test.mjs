import assert from "node:assert/strict";
import test from "node:test";

import { foldName, matchName, nameIndex } from "../src/match-names.mjs";

const records = [
  { name: "Shenzhen Chitron Electronics Company Limited" },
  { name: "Shenzhen Bailiansheng Electronic Science and Technology Co., Ltd" },
  { name: "Baimtec Material Co., Ltd." },
  { name: "Fortune", aliases: [] },
  { name: "Hangzhou Hikvision Digital Technology Co., Ltd.", aliases: ["Hikvision"] },
  { name: "Shenzhen Youmay Electronics Co." },
];
const index = nameIndex(records, { namesOf: (r) => [r.name, ...(r.aliases ?? [])] });

test("folds case, punctuation and company forms", () => {
  assert.equal(foldName("BAIMTEC MATERIAL CO., LTD."), "BAIMTEC MATERIAL");
});

test("a multi-word folded match is exact", () => {
  const [match] = matchName(index, "BAIMTEC MATERIAL CO., LTD.");
  assert.equal(match.kind, "exact");
  assert.equal(match.record.name, "Baimtec Material Co., Ltd.");
});

test("a one-word name is exact only when equal before folding", () => {
  assert.equal(matchName(index, "Hikvision")[0].kind, "exact");
  assert.equal(matchName(index, "Fortune Company Ltd.")[0].kind, "near");
});

test("common words shared are not a match; rare words are", () => {
  assert.deepEqual(matchName(index, "Shenzhen Jiantuo Electronics Co., Ltd"), []);
  assert.equal(matchName(index, "Shenzhen Chitron Electronics Trading Co")[0]?.record.name, "Shenzhen Chitron Electronics Company Limited");
});
