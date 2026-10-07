// A relational table's records as EAVT rows. A wide table (`mode: "wide"`) has one record per entity:
// its `subjectColumn` names the entity (as `<table>/<id>` unless `prefixSubject` is false), every
// other non-null column is an attribute, and `citationColumn` (or the table name) is the row's time.
// An EAV table has one record per assertion, its columns named by `columns` ({ e, a, v, t }).
export function eavtRowsOfTable(records, config = {}) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  if (config.mode === "wide") {
    if (typeof config.subjectColumn !== "string" || typeof config.table !== "string") throw new TypeError("a wide table needs its table name and subjectColumn");
    return Object.freeze(records.flatMap((record) => {
      const id = String(record[config.subjectColumn] ?? "");
      const entity = config.prefixSubject === false ? id : `${config.table}/${id}`;
      const time = config.citationColumn ? record[config.citationColumn] : config.table;
      return Object.entries(record)
        .filter(([key, value]) => key !== config.subjectColumn && key !== config.citationColumn && value !== undefined && value !== null)
        .map(([key, value]) => Object.freeze({ e: entity, a: key, v: value, t: time }));
    }));
  }
  const columns = { e: "e", a: "a", v: "v", t: "t", ...(config.columns ?? {}) };
  return Object.freeze(records.map((record) => Object.freeze({
    e: String(record[columns.e] ?? ""),
    a: String(record[columns.a] ?? ""),
    v: record[columns.v],
    ...(record[columns.t] === undefined ? {} : { t: record[columns.t] }),
  })));
}
