/**
 * writing/text — the plain-string boundary.
 *
 * The default wire form for the articulation family: a Mark payload is an opaque
 * string. This projector carries the raw content as a single JSON string value,
 * so it composes in one catalog with the JSON and EAVT projectors.
 */
import { define,                } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";

/** The string projector: recognizes any content, carries it verbatim as one value. */
export const stringProjector                       = define           ({
  type: "string",
  corner: "bottom",
  rung: "strict",
  recognize: () => true,
  read: (resource) => [resource.content],
  write: (items) => (items.length === 0 ? "" : String(items[0])),
});
