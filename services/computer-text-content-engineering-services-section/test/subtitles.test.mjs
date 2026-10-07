import assert from "node:assert/strict";
import test from "node:test";

import { formatSubtitleTimestamp, measureSubtitleCue, parseSubtitles, parseSubtitleTimestamp, serializeSubtitles } from "../src/subtitles.mjs";

const SRT = "1\n00:00:01,000 --> 00:00:02,500\n总裁，您的咖啡。\n\n2\n00:00:03,000 --> 00:00:05,000\n少爷，\n老夫人让您回家吃饭。\n";

test("SRT reads into cues and writes back unchanged", () => {
  const document = parseSubtitles(SRT);
  assert.equal(document.format, "srt");
  assert.deepEqual(document.cues.map((cue) => [cue.start, cue.end, cue.lines]), [[1000, 2500, ["总裁，您的咖啡。"]], [3000, 5000, ["少爷，", "老夫人让您回家吃饭。"]]]);
  assert.equal(serializeSubtitles(document), SRT);
});

test("WebVTT keeps its header, identifiers and settings", () => {
  const text = "WEBVTT - drama\n\nNOTE made for a test\n\nintro\n00:01.000 --> 00:02.000 align:start\n你好\n\n00:03.000 --> 00:04.000\n再见\n";
  const document = parseSubtitles(text);
  assert.equal(document.format, "vtt");
  assert.equal(document.header, "WEBVTT - drama\n\nNOTE made for a test");
  assert.equal(document.cues[0].id, "intro");
  assert.equal(document.cues[0].settings, "align:start");
  assert.equal(serializeSubtitles(document), "WEBVTT - drama\n\nNOTE made for a test\n\nintro\n00:00:01.000 --> 00:00:02.000 align:start\n你好\n\n00:00:03.000 --> 00:00:04.000\n再见\n");
});

test("SRT converts to WebVTT and back", () => {
  const vtt = serializeSubtitles(parseSubtitles(SRT), "vtt");
  assert.match(vtt, /^WEBVTT\n\n1\n00:00:01\.000 --> 00:00:02\.500\n/u);
  assert.equal(serializeSubtitles(parseSubtitles(vtt), "srt"), SRT);
});

test("CRLF, a byte-order mark and extra blank lines are read", () => {
  assert.equal(parseSubtitles(`﻿${SRT.replace(/\n/gu, "\r\n")}\r\n\r\n`).cues.length, 2);
});

test("malformed input is refused", () => {
  assert.throws(() => parseSubtitles(""), RangeError);
  assert.throws(() => parseSubtitles("just some text"), RangeError);
  assert.throws(() => parseSubtitles("1\n00:00:05,000 --> 00:00:01,000\nbackwards\n"), RangeError);
  assert.throws(() => parseSubtitleTimestamp("00:61:00,000"), RangeError);
});

test("timestamps round-trip", () => {
  assert.equal(parseSubtitleTimestamp("01:02:03,456"), 3_723_456);
  assert.equal(formatSubtitleTimestamp(3_723_456), "01:02:03,456");
  assert.equal(formatSubtitleTimestamp(3_723_456, "vtt"), "01:02:03.456");
});

test("a cue is measured by longest line and reading speed", () => {
  const cue = parseSubtitles(SRT).cues[1];
  assert.deepEqual({ ...measureSubtitleCue(cue) }, { longestLine: 10, characters: 13, charactersPerSecond: 6.5 });
});
