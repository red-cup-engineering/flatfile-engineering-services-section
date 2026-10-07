const NAMED_ENTITIES = Object.freeze({
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
});
/** Decode the five XML entities plus numeric and hexadecimal references. */
export function decodeHtmlEntities(value) {
    if (!value.includes("&"))
        return value;
    return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
        if (body[0] === "#") {
            const code = body[1] === "x" || body[1] === "X"
                ? Number.parseInt(body.slice(2), 16)
                : Number.parseInt(body.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        return NAMED_ENTITIES[body] ?? whole;
    });
}
function parseAttrs(attrText) {
    const attrs = {};
    const re = /([^\s/=>"']+)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
    let match;
    while ((match = re.exec(attrText)) !== null) {
        const name = match[1].toLowerCase();
        let value = match[2];
        if (value === undefined) {
            attrs[name] = "";
            continue;
        }
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        attrs[name] = decodeHtmlEntities(value);
    }
    return attrs;
}
/**
 * Scan start tags, skipping comments, declarations, processing instructions,
 * and script/style/template bodies. This is discovery, not sanitization.
 */
export function scanHtmlStartTags(html) {
    const out = [];
    let index = 0;
    while (index < html.length) {
        const lt = html.indexOf("<", index);
        if (lt === -1)
            break;
        if (html.startsWith("<!--", lt)) {
            const end = html.indexOf("-->", lt + 4);
            index = end === -1 ? html.length : end + 3;
            continue;
        }
        if (html[lt + 1] === "!" || html[lt + 1] === "?") {
            const end = html.indexOf(">", lt + 1);
            index = end === -1 ? html.length : end + 1;
            continue;
        }
        const gt = html.indexOf(">", lt);
        if (gt === -1)
            break;
        const isEnd = html[lt + 1] === "/";
        const inner = html.slice(lt + 1, gt);
        const nameMatch = /^\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)/.exec(inner);
        if (!nameMatch) {
            index = gt + 1;
            continue;
        }
        const name = nameMatch[1].toLowerCase();
        if (!isEnd) {
            const attrText = inner.slice(nameMatch[0].length).replace(/\/\s*$/, "");
            out.push(Object.freeze({ name, attrs: Object.freeze(parseAttrs(attrText)), index: lt }));
        }
        if (!isEnd && (name === "script" || name === "style" || name === "template")) {
            const close = new RegExp(`</${name}\\b`, "i").exec(html.slice(gt + 1));
            index = close ? gt + 1 + close.index : html.length;
            continue;
        }
        index = gt + 1;
    }
    return Object.freeze(out);
}
export function relTokens(attrs) {
    const rel = attrs["rel"];
    return rel ? Object.freeze(rel.trim().toLowerCase().split(/\s+/).filter(Boolean)) : Object.freeze([]);
}
export function htmlDocumentBase(html, fallbackUrl) {
    for (const tag of scanHtmlStartTags(html)) {
        if (tag.name === "base" && tag.attrs["href"] !== undefined) {
            try {
                return new URL(tag.attrs["href"], fallbackUrl).href;
            }
            catch {
                return fallbackUrl;
            }
        }
    }
    return fallbackUrl;
}
