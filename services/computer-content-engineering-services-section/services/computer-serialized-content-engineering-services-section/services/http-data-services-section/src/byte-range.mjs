import { firstHeader } from "./header-value.mjs";
function parseByteRangeSpec(spec, total) {
    const m = /^(\d*)-(\d*)$/.exec(spec.trim());
    if (!m) return 416;
    const startStr = m[1] ?? "";
    const endStr = m[2] ?? "";
    if (!startStr && !endStr) return 416;
    let start;
    let end;
    if (!startStr) {
        const suffix = parseInt(endStr, 10);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
        start = Math.max(0, total - suffix);
        end = total - 1;
    } else {
        start = parseInt(startStr, 10);
        if (!Number.isSafeInteger(start)) return 416;
        end = endStr ? parseInt(endStr, 10) : total - 1;
        if (!Number.isSafeInteger(end)) return 416;
    }
    if (start > end) return 416;
    if (start >= total) return null;
    return {
        start,
        end: Math.min(end, total - 1)
    };
}
export function parseRanges(value, total) {
    const h = firstHeader(value);
    if (!h || !h.startsWith("bytes=")) return null;
    if (!Number.isSafeInteger(total) || total < 0) return 416;
    if (total === 0) return 416;
    const specs = h.slice(6).split(",").map((part)=>part.trim());
    if (specs.some((part)=>part.length === 0)) return 416;
    const ranges = [];
    for (const spec of specs){
        const range = parseByteRangeSpec(spec, total);
        if (range === 416) return 416;
        if (range !== null) ranges.push(range);
    }
    return ranges.length ? Object.freeze(ranges) : 416;
}
export function parseRange(value, total) {
    const ranges = parseRanges(value, total);
    if (ranges === null || ranges === 416) return ranges;
    return ranges.length === 1 ? ranges[0] : 416;
}
export function contentRange(range, total) {
    return range === null ? `bytes */${total}` : `bytes ${range.start}-${range.end}/${total}`;
}
export function multipartRangeBoundary(total, ranges) {
    const material = `${total}:${ranges.map((range)=>`${range.start}-${range.end}`).join(",")}`;
    return `web-server-${Array.from(new TextEncoder().encode(material).subarray(0, 12), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}
export function byterangesPartHeader(boundary, type, range, total) {
    return `--${boundary}\r\nContent-Type: ${type}\r\nContent-Range: ${contentRange(range, total)}\r\n\r\n`;
}
export function byterangesCloseDelimiter(boundary) {
    return `--${boundary}--\r\n`;
}
export function multipartByterangesBody(body, ranges, type, boundary) {
    const chunks = [];
    for (const range of ranges){
        chunks.push(new TextEncoder().encode(byterangesPartHeader(boundary, type, range, body.length)));
        chunks.push(body.subarray(range.start, range.end + 1));
        chunks.push(new TextEncoder().encode("\r\n"));
    }
    chunks.push(new TextEncoder().encode(byterangesCloseDelimiter(boundary)));
    const result = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
}
