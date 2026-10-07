/**
 * Subtitle text: SubRip (SRT) and WebVTT read into one cue list and written
 * back, plus the two measures subtitle work is judged by, line length and
 * reading speed. Pure over strings; no filesystem, so it runs on any host.
 *
 * A document is { format: "srt"|"vtt", header?, cues: [{ id?, start, end,
 * settings?, lines }] } with start and end in milliseconds. `header` keeps a
 * WebVTT file's text after "WEBVTT" and any leading NOTE/STYLE/REGION blocks;
 * `interstitial` keeps NOTE blocks between and after cues in place.
 */

const TIMING = /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d+:)?\d{1,2}:\d{2}[.,]\d{3})(.*)$/u;

/** "01:02:03,456", "01:02:03.456" or "02:03.456" to milliseconds. */
export function parseSubtitleTimestamp(text) {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})$/u.exec(String(text).trim());
  if (match === null) throw new RangeError(`not a subtitle timestamp: ${text}`);
  const [, hours = "0", minutes, seconds, millis] = match;
  if (Number(minutes) > 59 || Number(seconds) > 59) throw new RangeError(`not a subtitle timestamp: ${text}`);
  return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(millis);
}

/** Milliseconds to "HH:MM:SS,mmm" (SRT) or "HH:MM:SS.mmm" (WebVTT). */
export function formatSubtitleTimestamp(milliseconds, format = "srt") {
  if (!Number.isInteger(milliseconds) || milliseconds < 0) throw new RangeError("timestamp must be a non-negative integer of milliseconds");
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds / 60_000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${format === "vtt" ? "." : ","}${pad(milliseconds % 1000, 3)}`;
}

function blocksOf(text) {
  return String(text).replace(/^﻿/u, "").replace(/\r\n?/gu, "\n").split(/\n[ \t]*\n+/u).map((block) => block.replace(/^\n+|\n+$/gu, "")).filter((block) => block.trim() !== "");
}

function cueOf(block, format) {
  const lines = block.split("\n");
  const timingIndex = lines.findIndex((line) => TIMING.test(line));
  if (timingIndex < 0 || timingIndex > 1) return undefined;
  const [, start, end, settings] = TIMING.exec(lines[timingIndex]);
  const cue = { start: parseSubtitleTimestamp(start), end: parseSubtitleTimestamp(end), lines: lines.slice(timingIndex + 1) };
  if (cue.end <= cue.start) throw new RangeError(`cue must have a positive duration: ${lines[timingIndex]}`);
  if (timingIndex === 1) cue.id = lines[0].trim();
  if (format === "vtt" && settings.trim() !== "") cue.settings = settings.trim();
  return cue;
}

/**
 * Read SRT or WebVTT text. The format is WebVTT when the text begins with
 * "WEBVTT", otherwise SRT. A block with no timing line is refused in SRT and
 * kept in the WebVTT header before cues; later NOTE blocks keep their place.
 */
export function parseSubtitles(text) {
  const blocks = blocksOf(text);
  if (blocks.length === 0) throw new RangeError("subtitle text is empty");
  const format = /^WEBVTT(?:[ \t].*)?$/u.test(blocks[0].split("\n")[0]) ? "vtt" : "srt";
  const header = [];
  const cues = [];
  const interstitial = [];
  for (const [index, block] of blocks.entries()) {
    if (format === "vtt" && index === 0) { header.push(block); continue; }
    const cue = cueOf(block, format);
    if (cue !== undefined) cues.push(cue);
    else if (format === "vtt" && cues.length === 0) header.push(block);
    else if (format === "vtt" && /^NOTE(?:[ \t]|$)/u.test(block.split("\n")[0])) interstitial.push(Object.freeze({ beforeCue: cues.length, raw: block }));
    else throw new RangeError(`not a subtitle cue: ${block.split("\n")[0]}`);
  }
  if (cues.length === 0) throw new RangeError("subtitle text has no cues");
  return Object.freeze({ format, ...(format === "vtt" ? { header: header.join("\n\n"), interstitial: Object.freeze(interstitial) } : {}), cues: Object.freeze(cues.map((cue) => Object.freeze(cue))) });
}

/** Write a document back as SRT or WebVTT (its own format by default). */
export function serializeSubtitles(document, format = document.format) {
  if (format !== "srt" && format !== "vtt") throw new RangeError(`unknown subtitle format: ${format}`);
  const cues = document.cues.map((cue, index) => {
    const id = cue.id ?? (format === "srt" ? String(index + 1) : undefined);
    const timing = `${formatSubtitleTimestamp(cue.start, format)} --> ${formatSubtitleTimestamp(cue.end, format)}${format === "vtt" && cue.settings ? ` ${cue.settings}` : ""}`;
    return [...(id === undefined ? [] : [id]), timing, ...cue.lines].join("\n");
  });
  const blocks = [];
  for (let index = 0; index <= cues.length; index += 1) {
    for (const extra of format === "vtt" ? document.interstitial ?? [] : []) if (extra.beforeCue === index) blocks.push(extra.raw);
    if (index < cues.length) blocks.push(cues[index]);
  }
  const head = format === "vtt" ? [document.format === "vtt" && document.header ? document.header : "WEBVTT"] : [];
  return `${[...head, ...blocks].join("\n\n")}\n`;
}

/**
 * The measures of one cue: its longest line in characters (code points, so a
 * Han character counts once) and its reading speed in characters per second
 * over the cue's duration, spaces and line breaks excluded.
 */
export function measureSubtitleCue(cue) {
  const characters = cue.lines.join("").replace(/\s/gu, "");
  const seconds = (cue.end - cue.start) / 1000;
  return Object.freeze({
    longestLine: Math.max(0, ...cue.lines.map((line) => [...line].length)),
    characters: [...characters].length,
    charactersPerSecond: seconds > 0 ? [...characters].length / seconds : Infinity,
  });
}
