import { parseContentType } from "./content-type.mjs";
import { quoteHeaderValue } from "./header-value.mjs";
export function parseMultipartForm(body, boundary) {
    if (!boundary || /[\r\n]/.test(boundary)) throw new TypeError("multipart boundary must be a non-empty token");
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "binary");
    const delimiter = Buffer.from(`--${boundary}`);
    const fields = new URLSearchParams();
    const files = [];
    const parts = [];
    let offset = 0;
    while(offset < buffer.length){
        const start = buffer.indexOf(delimiter, offset);
        if (start < 0) break;
        let cursor = start + delimiter.length;
        if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("--"))) break;
        if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("\r\n"))) cursor += 2;
        const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
        if (headerEnd < 0) break;
        const headers = parsePartHeaders(buffer.subarray(cursor, headerEnd).toString("latin1"));
        const next = buffer.indexOf(delimiter, headerEnd + 4);
        if (next < 0) break;
        const dataEnd = buffer.subarray(next - 2, next).equals(Buffer.from("\r\n")) ? next - 2 : next;
        const data = Buffer.from(buffer.subarray(headerEnd + 4, dataEnd));
        offset = next;
        const disposition = parseContentDisposition(headers["content-disposition"]);
        const name = disposition.params["name"];
        if (!name || disposition.type !== "form-data") continue;
        const part = multipartPart(name, data, headers, disposition.params["filename"]);
        parts.push(part);
        if (part.filename !== undefined) files.push(part);
        else fields.append(name, part.text());
    }
    return Object.freeze({
        fields,
        files: Object.freeze(files),
        parts: Object.freeze(parts),
        get: (name)=>fields.get(name),
        getAll: (name)=>fields.getAll(name),
        file: (name)=>files.find((part)=>part.name === name),
        filesFor: (name)=>Object.freeze(files.filter((part)=>part.name === name))
    });
}
export function serializeMultipartForm(parts, boundary) {
    if (!boundary || /[\r\n]/.test(boundary)) throw new TypeError("multipart boundary must be a non-empty token");
    const chunks = [];
    for (const part of parts){
        const disposition = [
            `Content-Disposition: form-data; name=${quoteHeaderValue(part.name)}`,
            ...part.filename !== undefined ? [
                `; filename=${quoteHeaderValue(part.filename)}`
            ] : []
        ].join("");
        const headers = [
            `--${boundary}`,
            disposition,
            ...part.contentType !== undefined ? [
                `Content-Type: ${part.contentType}`
            ] : [],
            "",
            ""
        ].join("\r\n");
        chunks.push(Buffer.from(headers, "utf8"));
        chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data, "utf8"));
        chunks.push(Buffer.from("\r\n", "utf8"));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
    return Buffer.concat(chunks);
}
function parsePartHeaders(raw) {
    const headers = {};
    for (const line of raw.split("\r\n")){
        const colon = line.indexOf(":");
        if (colon <= 0) continue;
        const key = line.slice(0, colon).trim().toLowerCase();
        const value = line.slice(colon + 1).trim();
        if (key) headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
    }
    return headers;
}
function parseContentDisposition(value) {
    return parseContentType(value) ?? Object.freeze({
        type: "",
        params: Object.freeze({})
    });
}
function multipartPart(name, data, headers, filename) {
    const contentType = parseContentType(headers["content-type"]);
    const part = {
        name,
        headers: Object.freeze({
            ...headers
        }),
        data,
        text (encoding = "utf8") {
            return data.toString(encoding);
        }
    };
    if (filename !== undefined) part.filename = filename;
    if (contentType?.type) part.contentType = contentType.type;
    return Object.freeze(part);
}
