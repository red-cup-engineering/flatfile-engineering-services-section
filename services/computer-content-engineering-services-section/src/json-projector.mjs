/** The typed-resource projector for JSON documents: recognizes content that
 *  parses as JSON, reads one carried value, writes one canonical document. */
import { canonicalJson, parse } from "@red-cup-engineering/json-services-section";
import { define } from "./typed-resource-classification.mjs";

export const jsonProjector = define({
  type: "json",
  corner: "data",
  rung: "strict",
  recognize: (resource) => {
    try {
      JSON.parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => [parse(resource.content)],
  write: (items) => (items.length === 0 ? "" : `${canonicalJson(items[0])}\n`),
});
