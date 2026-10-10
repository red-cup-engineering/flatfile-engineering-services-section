import { mimeTypeEssence } from "../../../src/mime-type.mjs";
const EXT_TYPES = {
    mmd: "text/vnd.mermaid", mermaid: "text/vnd.mermaid",
    puml: "text/x-plantuml", plantuml: "text/x-plantuml",
    xmi: "application/xmi+xml", sen: "application/sen+json",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    mjs: "text/javascript",
    ts: "text/javascript",
    json: "application/json",
    jsonld: "application/ld+json",
    jsonl: "application/jsonl",
    jrd: "application/jrd+json",
    webmanifest: "application/manifest+json",
    xml: "application/xml",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    woff: "font/woff",
    woff2: "font/woff2",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    opus: "audio/ogg",
    wav: "audio/wav",
    flac: "audio/flac",
    pdf: "application/pdf",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
    md: "text/markdown",
    wasm: "application/wasm",
    atom: "application/atom+xml",
    rss: "application/rss+xml",
    ttl: "text/turtle",
    nq: "application/n-quads",
    zip: "application/zip",
    gz: "application/gzip"
};
export function extensionType(path, table = EXT_TYPES) {
    const dot = path.lastIndexOf(".");
    if (dot < 0) return "application/octet-stream";
    return table[path.slice(dot + 1).toLowerCase()] ?? "application/octet-stream";
}
/** The first extension the table gives a media type (parameters ignored), or "bin". */
export function typeExtension(type, table = EXT_TYPES) {
    const essence = mimeTypeEssence(type);
    return Object.keys(table).find((extension)=>table[extension] === essence) ?? "bin";
}
export function isCompressible(type) {
    const t = mimeTypeEssence(type) ?? "";
    return t.startsWith("text/") || t.endsWith("+json") || t.endsWith("+xml") || t === "application/json" || t === "application/jsonl" || t === "application/xml" || t === "application/javascript" || t === "text/javascript" || t === "image/svg+xml" || t === "application/atom+xml" || t === "application/rss+xml" || t === "text/turtle" || t === "application/n-quads" || t === "application/wasm";
}
