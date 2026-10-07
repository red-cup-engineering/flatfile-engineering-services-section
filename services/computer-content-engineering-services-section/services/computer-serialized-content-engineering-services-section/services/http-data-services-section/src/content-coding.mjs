import { PassThrough } from "node:stream";
import * as zlib from "node:zlib";
export function isCoding(value) {
    return value === "zstd" || value === "br" || value === "gzip" || value === "deflate" || value === "identity";
}
export function isCompressionCoding(value) {
    return value === "zstd" || value === "br" || value === "gzip" || value === "deflate";
}
export function parseContentEncoding(value) {
    const raw = typeof value === "string" ? value : Array.isArray(value) ? value.join(",") : undefined;
    if (!raw) return Object.freeze([]);
    const codings = [];
    for (const part of raw.split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean)){
        if (part === "identity") continue;
        if (isCompressionCoding(part)) codings.push(part);
        else throw new TypeError(`unsupported request content-encoding: ${part}`);
    }
    return Object.freeze(codings);
}
const zstd = zlib;
const BASE_CODINGS = [
    "br",
    "gzip",
    "deflate"
];
export function zstdSupported() {
    return typeof zstd.createZstdCompress === "function" && typeof zstd.createZstdDecompress === "function";
}
export function supportedCompressionCodings() {
    return zstdSupported() ? [
        "zstd",
        ...BASE_CODINGS
    ] : BASE_CODINGS;
}
export async function compress(body, coding) {
    if (coding === "identity") return body;
    return new Promise((resolve, reject)=>{
        const stream = compressStream(coding);
        const chunks = [];
        stream.on("data", (chunk)=>chunks.push(chunk));
        stream.on("end", ()=>resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
        stream.end(body);
    });
}
export async function decompress(body, coding) {
    if (coding === "identity") return body;
    return new Promise((resolve, reject)=>{
        const stream = decompressStream(coding);
        const chunks = [];
        stream.on("data", (chunk)=>chunks.push(chunk));
        stream.on("end", ()=>resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
        stream.end(body);
    });
}
export function compressStream(coding) {
    if (coding === "br") return zlib.createBrotliCompress({
        params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 4
        }
    });
    if (coding === "gzip") return zlib.createGzip({
        level: 6
    });
    if (coding === "deflate") return zlib.createDeflate({
        level: 6
    });
    if (coding === "zstd" && zstd.createZstdCompress) return zstd.createZstdCompress();
    if (coding === "identity") return new PassThrough();
    throw new RangeError(`unsupported content coding: ${coding}`);
}
export function decompressStream(coding) {
    if (coding === "br") return zlib.createBrotliDecompress();
    if (coding === "gzip") return zlib.createGunzip();
    if (coding === "deflate") return zlib.createInflate();
    if (coding === "zstd" && zstd.createZstdDecompress) return zstd.createZstdDecompress();
    if (coding === "identity") return new PassThrough();
    throw new RangeError(`unsupported content coding: ${coding}`);
}
export const CODINGS = supportedCompressionCodings();
