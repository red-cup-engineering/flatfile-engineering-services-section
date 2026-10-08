export function parseRelocationCliArguments(argv) {
  if (argv.includes("--help")) return Object.freeze({ help: true });
  const [root, sourceDir, destDir, region = "", limitText, maxScanText] = argv;
  const parseBound = (text, label) => {
    if (text === undefined) return undefined;
    const value = Number(text);
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a nonnegative integer`);
    return value;
  };
  return Object.freeze({ help: false, root, sourceDir, destDir, region, limit: parseBound(limitText, "limit"), maxScan: parseBound(maxScanText, "max-scan") });
}

export function relocationCliUsage(command, effect) {
  return [
    `usage: ${command} <root> <sourceDir> <destDir> [relation-universe] [limit] [max-scan]`,
    `${effect} Markdown link rewrites only; move carriers separately.`,
    "",
  ].join(String.fromCharCode(10));
}
