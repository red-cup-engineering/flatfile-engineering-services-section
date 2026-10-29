import { define } from "../../../../typed-resource-classification-kernel-service/src/index.mjs";
import { parse, canonicalChecked, parseLines, serializeLines } from "./json.mjs";
/** The JSON projector: recognizes any content that parses as JSON; reads it as a
 *  single carried value; writes one canonical document. */
export const jsonProjector = define({
    type: "json",
    corner: "data",
    rung: "identity",
    recognize: (resource) => {
        try {
            JSON.parse(resource.content);
            return true;
        }
        catch {
            return false;
        }
    },
    read: (resource) => [parse(resource.content)],
    write: (items) => (items.length === 0 ? "" : `${canonicalChecked(items[0], "json projector item")}\n`),
});
/** The JSON-lines projector reads each nonblank line as an independent carried value. */
export const jsonlProjector = define({
    type: "jsonl",
    corner: "data",
    rung: "identity",
    recognize: (resource) => {
        try {
            parseLines(resource.content);
            return true;
        }
        catch {
            return false;
        }
    },
    read: (resource) => parseLines(resource.content),
    write: (items) => serializeLines(items),
});
