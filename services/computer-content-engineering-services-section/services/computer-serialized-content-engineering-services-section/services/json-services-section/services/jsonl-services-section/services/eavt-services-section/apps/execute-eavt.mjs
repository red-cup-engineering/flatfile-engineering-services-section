import { readEavtTrace } from "../scripts/read-eavt-trace.mjs";
import { appendEavtRow } from "../scripts/append-eavt-row.mjs";
import { row } from "../scripts/admit-row.mjs";
import { encode } from "../scripts/encode-row.mjs";
import { decode } from "../scripts/decode-row.mjs";
import { identify } from "../scripts/identify-row.mjs";
import { unique } from "../scripts/deduplicate-rows.mjs";
import { entities } from "../scripts/list-entities.mjs";
import { current } from "../scripts/current-facts.mjs";
import { latest } from "../scripts/latest-attributes.mjs";
import { relations } from "../scripts/select-relations.mjs";
import { settle } from "../scripts/read-contradictions.mjs";
import { consent } from "../scripts/filter-consent.mjs";
import { constitute } from "../scripts/constitute-entity.mjs";
import { relationNerve } from "../scripts/count-relation-nerve.mjs";
export function execute(request) {
  switch (request.operation) {
    case "validate":
      return row(request.row);
    case "encode":
      return { line: encode(request.row) };
    case "decode":
      return decode(request.line);
    case "read":
      return readEavtTrace({ path: request.path }).rows;
    case "append":
      return appendEavtRow({ path: request.path, row: request.row });
    case "entities":
      return entities(request.rows);
    case "current":
      return current(request.rows);
    case "latest":
      return latest({ rows: request.rows, attributes: request.attributes });
    case "relations":
      return relations({
        rows: request.rows,
        attribute: request.attribute,
        value: request.value,
      });
    case "constitute":
      return constitute({
        kind: request.kind,
        attributes: request.attributes,
        t: request.t,
      });
    case "settle":
      return settle({ rows: request.rows, entity: request.entity });
    case "filter-consent":
      return consent({ rows: request.rows, audience: request.audience });
    case "relation-nerve":
      return relationNerve({
        rows: request.rows,
        attribute: request.attribute,
      });
    default:
      throw new TypeError(`unknown EAVT operation: ${request.operation}`);
  }
}
