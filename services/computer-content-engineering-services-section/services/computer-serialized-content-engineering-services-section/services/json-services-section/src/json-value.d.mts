/** Portable JSON values. Runtime admission additionally requires finite numbers,
 * complete arrays, ordinary records and an acyclic value graph. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonRecord;
export type JsonRecord = { readonly [key: string]: JsonValue };
