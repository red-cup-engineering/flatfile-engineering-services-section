// The canonical NI service currently ships JavaScript without declarations.
// Keep the local surface exact to the byte-only API this package consumes.
declare module "@red-cup-engineering/computer-data-engine/identity" {
  export function makeNiUri(source: Uint8Array): string;
}
