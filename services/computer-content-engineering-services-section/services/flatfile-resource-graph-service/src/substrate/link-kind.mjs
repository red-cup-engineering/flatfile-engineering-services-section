export function classify(target) {
  if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:")) return "external";
  if (target.startsWith("#")) return "anchor";
  const path = target.split("#")[0].split("?")[0];
  if (!(path.endsWith(".md") || path.endsWith("/"))) return "asset";
  if (path.startsWith("/")) return "absolute";
  return "relative";
}


