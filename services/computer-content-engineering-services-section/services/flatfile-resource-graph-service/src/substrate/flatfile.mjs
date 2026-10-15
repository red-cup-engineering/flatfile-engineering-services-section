import { readMarkdownFrontmatter } from "@red-cup-engineering/read-markdown-frontmatter-service";

export class FrontmatterError extends Error {}

// Splits markdown text into { fm, body }. fm is null when the file has no
// frontmatter block — that's a "this isn't a note, skip" signal, not an
// error. Throws FrontmatterError on a malformed YAML block (the block
// exists but won't parse) — that is an error worth surfacing.
export function parseFrontmatter(text) {
  try {
    const parsed = readMarkdownFrontmatter(text, { frontmatterFormats: ["yaml"] });
    return { fm: parsed.frontmatter, body: parsed.body };
  } catch (error) {
    throw new FrontmatterError(error instanceof Error ? error.message : String(error));
  }
}

export function makeFlatfile({ slug, dir, kind, fm, body, path, mtime, revision }) {
  return Object.freeze({ slug, dir, kind, fm, body, path, mtime, ...(revision === undefined ? {} : {revision}) });
}


