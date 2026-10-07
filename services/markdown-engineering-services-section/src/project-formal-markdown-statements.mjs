const statementKinds = Object.freeze(["axiom", "theorem", "lemma", "corollary", "definition", "proposition"]);
const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;

function nearestSection(lines, at) {
  for (let index = at; index >= 0; index -= 1) {
    const match = heading.exec(lines[index]);
    if (match) return match[2].trim();
  }
  return null;
}

/** Project numbered formal declarations in ordinary Markdown lists or quotations. */
export function projectFormalMarkdownStatements(text, { source = "markdown", contextLines = 0 } = {}) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (!Number.isInteger(contextLines) || contextLines < 0) throw new TypeError("contextLines must be a non-negative integer");
  const lines = text.replace(/\r\n?/gu, "\n").split("\n"), statements = [];
  const pattern = /^(?:>\s*|-\s+)(Axiom|Theorem|Lemma|Corollary|Definition|Proposition)\s+(\d+(?:\.\d+)?)\s*\(([^)]+)\)/iu;
  for (const [index, line] of lines.entries()) {
    const match = pattern.exec(line);
    if (!match) continue;
    const kind = match[1].toLocaleLowerCase("en-US");
    if (!statementKinds.includes(kind)) continue;
    const start = Math.max(0, index - contextLines), end = Math.min(lines.length, index + contextLines + 1);
    statements.push(Object.freeze({ kind, number: match[2], name: match[3].trim(), normalizedName: match[3].trim().toLocaleLowerCase("en-US").replace(/[–—]/gu, "-"), source, line: index + 1, section: nearestSection(lines, index), ...(contextLines === 0 ? {} : { context: lines.slice(start, end).join("\n") }) }));
  }
  return Object.freeze({ kind: "red-cup-engineering.markdown.formal-statements", source, statements: Object.freeze(statements) });
}

/** Compare formal statement labels without deciding whether their mathematical content agrees. */
export function compareFormalMarkdownStatements(left, right, { threshold = 0.7 } = {}) {
  if (!Array.isArray(left) || !Array.isArray(right)) throw new TypeError("left and right must be statement arrays");
  if (typeof threshold !== "number" || threshold < 0 || threshold > 1) throw new TypeError("threshold must be between zero and one");
  const score = (a, b) => {
    const longer = Math.max(a.length, b.length); if (longer === 0) return 1;
    let row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) { const next = [i]; for (let j = 1; j <= b.length; j += 1) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); row = next; }
    return 1 - row[b.length] / longer;
  };
  return Object.freeze(left.map((statement) => {
    const matches = right.map((candidate) => Object.freeze({ candidate, similarity: score(statement.normalizedName, candidate.normalizedName) })).filter((match) => match.similarity >= threshold).sort((a, b) => b.similarity - a.similarity);
    return Object.freeze({ statement, matches: Object.freeze(matches) });
  }));
}
