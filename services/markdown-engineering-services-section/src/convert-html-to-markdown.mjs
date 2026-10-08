function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/gu, (_all, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/giu, (_all, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&(amp|apos|lt|gt|nbsp|quot|#39);/giu, (_, entity) => ({
      amp: "&",
      apos: "'",
      lt: "<",
      gt: ">",
      nbsp: " ",
      quot: '"',
      "#39": "'",
    })[entity.toLowerCase()]);
}

function attribute(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function normalize(markdown) {
  return markdown.replace(/\r\n?/gu, "\n").replace(/[ \t]+\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim();
}

/** Convert ordinary structural HTML to Markdown without retaining active embedded content. */
export function convertHtmlToMarkdown(html) {
  if (typeof html !== "string") throw new TypeError("html must be a string");

  const codeBlocks = [];
  const inlineCodes = [];
  let source = html.replace(/<!--[\s\S]*?-->/gu, "");
  source = source.replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu, "");
  source = source.replace(/<\s*(script|style|iframe|object|embed)\b[^>]*\/?\s*>/giu, "");
  source = source.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/giu, (_all, code) => {
    const index = codeBlocks.push(decodeEntities(code).trim()) - 1;
    return `\u0000${index}\u0000`;
  });
  source = source.replace(/<code[^>]*>([\s\S]*?)<\/code\s*>/giu, (_all, code) => {
    const index = inlineCodes.push(decodeEntities(code).trim()) - 1;
    return `\u0001${index}\u0001`;
  });
  source = source.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote\s*>/giu, (_all, content) => `\n\n${normalize(convertHtmlToMarkdown(content)).split("\n").map((line) => `> ${line}`).join("\n")}\n\n`);

  const output = [];
  const links = [];
  const lists = [];
  const tokens = source.split(/(<[^>]+>)/gu);
  const newline = (count = 1) => output.push("\n".repeat(count));

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      output.push(decodeEntities(token)
        .replace(/\u0000(\d+)\u0000/gu, (_all, index) => `\n\n\`\`\`\n${codeBlocks[Number(index)]}\n\`\`\`\n\n`)
        .replace(/\u0001(\d+)\u0001/gu, (_all, index) => `\`${inlineCodes[Number(index)]}\``));
      continue;
    }

    const close = /^<\s*\//u.test(token);
    const match = /^<\s*\/?\s*([a-z0-9]+)/iu.exec(token);
    if (!match) continue;
    const tag = match[1].toLowerCase();

    if (/^h[1-6]$/u.test(tag)) {
      if (close) newline(2);
      else output.push(`${"#".repeat(Number(tag[1]))} `);
    } else if (["p", "div", "section", "article", "main", "header", "footer"].includes(tag)) {
      if (close) newline(2);
    } else if (tag === "br") newline();
    else if (tag === "strong" || tag === "b") output.push("**");
    else if (tag === "em" || tag === "i") output.push("*");
    else if (tag === "a") {
      if (close) {
        const href = links.pop();
        if (href !== null && href !== undefined) output.push(`](${href})`);
      }
      else {
        const href = attribute(token, "href");
        links.push(href === null ? null : decodeEntities(href));
        if (href !== null) output.push("[");
      }
    } else if (tag === "img" && !close) {
      const src = attribute(token, "src");
      const alt = decodeEntities(attribute(token, "alt") ?? "");
      output.push(src === null ? alt : `![${alt}](${decodeEntities(src)})`);
    } else if (tag === "ul" || tag === "ol") {
      if (close) {
        lists.pop();
        newline();
      } else {
        lists.push({ ordered: tag === "ol", number: 0 });
        newline();
      }
    } else if (tag === "li") {
      if (close) newline();
      else {
        const list = lists.at(-1) ?? { ordered: false, number: 0 };
        list.number += 1;
        output.push(`${"  ".repeat(Math.max(0, lists.length - 1))}${list.ordered ? `${list.number}.` : "-"} `);
      }
    } else if (tag === "hr") output.push("\n\n---\n\n");
  }

  return normalize(output.join(""));
}
