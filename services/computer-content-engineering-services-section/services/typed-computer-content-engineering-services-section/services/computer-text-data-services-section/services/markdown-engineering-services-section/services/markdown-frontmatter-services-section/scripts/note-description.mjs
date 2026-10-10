import { admitDescription } from "@red-cup-engineering/computer-content-engineering-services-section/description";

const COMPLETE_SENTENCE = /[.!?](?:["'\u201d\u2019)\]])*$/u;

/** Admits the concise frontmatter description inferred from one note's content. */
export function admitNoteDescription(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("note description must be nonempty text");
  const text = value.replace(/\s+/gu, " ").trim();
  const sentences = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
  if (sentences.length !== 1 || !COMPLETE_SENTENCE.test(sentences[0])) {
    throw new RangeError("note description must be one complete sentence");
  }
  const words = text.match(/[\p{L}\p{N}]+(?:['\u2019-][\p{L}\p{N}]+)*/gu) ?? [];
  if (words.length < 15 || words.length > 30) throw new RangeError("note description must contain 15 to 30 words");
  if (/^this note\b/iu.test(text)) throw new RangeError("note description must describe the content directly");

  return admitDescription({
    type: "Description",
    version: 1,
    subject: { kind: "note" },
    consumer: { kind: "note-index-reader", decision: "decide whether the note contains material relevant to the reader's purpose" },
    text,
    predicates: [{ claim: text, grounds: ["note-content"], separatesFrom: ["generic note summaries"] }],
    neighbors: [{ kind: "note", contrast: "generic note summaries" }],
  }, { minimumSentences: 1, maximumSentences: 1 });
}
