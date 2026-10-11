// The canonical semantic content identity ships JavaScript without declarations.
// Keep the local surface exact to what this package consumes.
declare module "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity" {
  export const EMPTY_WITNESS_ROOT: string;
  export function identifyJsonSemanticContent(request: { objectKind: string; value: unknown; witnessRoot: string }): { readonly token: string };
}
