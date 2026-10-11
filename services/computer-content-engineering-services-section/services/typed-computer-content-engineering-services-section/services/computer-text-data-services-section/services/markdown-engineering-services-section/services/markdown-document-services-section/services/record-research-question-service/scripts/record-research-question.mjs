import { lstat, mkdir, open, realpath } from "node:fs/promises";
import { dirname, posix, resolve, sep } from "node:path";

const QUESTION_DIRECTORY = "content/text/documents/articles/research-articles/questions";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STATUSES = new Set(["open", "partially-addressed", "resolved"]);
const RESERVED = new Set(["body", "date-created", "status", "title", "type"]);

function requireNonemptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

/** Return the conventional relative address for one section-owned research question. */
export function researchQuestionPath({ sectionPath, slug }) {
  const section = requireNonemptyString(sectionPath, "sectionPath");
  const name = requireNonemptyString(slug, "slug");
  if (posix.isAbsolute(section) || section.split("/").includes("..")) throw new TypeError("sectionPath must be a confined relative path");
  if (!SLUG.test(name)) throw new TypeError("slug must contain lowercase letters, digits, and single hyphens");
  return posix.join(section, QUESTION_DIRECTORY, `${name}.md`);
}

function yamlScalar(value) {
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value !== "string") throw new TypeError("frontmatter values must be strings, numbers, booleans, or arrays of those values");
  return JSON.stringify(value);
}

function encodeFrontmatter(record) {
  const lines = [];
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(key)) throw new TypeError(`frontmatter key ${key} is not a lowercase kebab-case key`);
    if (Array.isArray(value)) {
      if (value.length === 0) lines.push(`${key}: []`);
      else {
        lines.push(`${key}:`);
        for (const entry of value) lines.push(`  - ${yamlScalar(entry)}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function createQuestionDocument({ frontmatter, title, dateCreated, status, question, research }) {
  const body = `## Question\n\n${question}\n${research ? `\n${research}\n` : ""}`;
  const head = encodeFrontmatter({ ...frontmatter, "date-created": dateCreated, status, title, type: "question" });
  return `---\n${head}---\n${body}`;
}

function validateQuestionDocument({ text, title, question }) {
  const findings = [];
  if (!text.startsWith("---\n") || !text.includes("\n---\n")) findings.push("missing-yaml-frontmatter");
  if (!text.includes("\ntype: \"question\"\n")) findings.push("missing-question-type");
  if (!text.includes("\nstatus: ")) findings.push("missing-status");
  if (!text.includes(`## Question\n\n${question}`)) findings.push("missing-question-body");
  if (text.includes(`# ${title}\n`)) findings.push("title-duplicates-h1");
  return Object.freeze({ conformant: findings.length === 0, findings: Object.freeze(findings) });
}

async function createConfinedFile({ root, relativePath, text }) {
  const canonicalRoot = await realpath(root);
  const destination = resolve(canonicalRoot, relativePath);
  if (destination !== canonicalRoot && !destination.startsWith(`${canonicalRoot}${sep}`)) throw new Error("question path escapes root");
  let cursor = canonicalRoot;
  for (const component of relativePath.split("/").slice(0, -1)) {
    cursor = resolve(cursor, component);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) throw new Error("question path escapes root through a symbolic link");
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  await mkdir(dirname(destination), { recursive: true });
  const canonicalParent = await realpath(dirname(destination));
  if (canonicalParent !== canonicalRoot && !canonicalParent.startsWith(`${canonicalRoot}${sep}`)) throw new Error("question path escapes root through a symbolic link");
  const handle = await open(destination, "wx", 0o644);
  try {
    await handle.writeFile(text, "utf8");
  } finally {
    await handle.close();
  }
  return Object.freeze({ path: destination, relativePath, bytes: Buffer.byteLength(text), created: true, changed: true });
}

/**
 * Create and validate a first-class question document, then write it in
 * create-only mode beneath the supplied workspace root.
 */
export async function recordResearchQuestion(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request must be a JSON object");
  const root = requireNonemptyString(request.root, "root");
  const title = requireNonemptyString(request.title, "title");
  const question = requireNonemptyString(request.question, "question");
  const dateCreated = requireNonemptyString(request.dateCreated, "dateCreated");
  const status = request.status ?? "open";
  if (!STATUSES.has(status)) throw new TypeError("status must be open, partially-addressed, or resolved");
  if (request.research !== undefined && typeof request.research !== "string") throw new TypeError("research must be a string when supplied");
  const frontmatter = request.frontmatter ?? {};
  if (frontmatter === null || typeof frontmatter !== "object" || Array.isArray(frontmatter)) throw new TypeError("frontmatter must be a JSON object");
  for (const key of Object.keys(frontmatter)) {
    if (RESERVED.has(key)) throw new TypeError(`frontmatter cannot override reserved key ${key}`);
  }

  const research = request.research?.trim();
  const text = createQuestionDocument({ frontmatter, title, dateCreated, status, question, research });
  const validation = validateQuestionDocument({ text, title, question });
  if (!validation.conformant) {
    throw new Error(`generated research question is not conformant: ${validation.findings.join("; ")}`);
  }
  const relativePath = researchQuestionPath(request);
  const receipt = await createConfinedFile({ root, relativePath, text });
  return Object.freeze({ kind: "red-cup-engineering.research-question-write", relativePath, receipt, validation });
}
