// json-services-section ships plain .mjs without declarations; this states the one function html-document-render-service takes from it.
declare module "@red-cup-engineering/json-services-section" {
  /** The RFC 8785 text of one JSON value. */
  export function canonical(value: unknown): string;
}
