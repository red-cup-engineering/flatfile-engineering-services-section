/**
 * Legacy ESM entry point for the one canonical RMN proof-path implementation.
 *
 * Native .mts imports work in Node runtimes with TypeScript type stripping.
 * Node 22.16 and other runtimes without native .mts resolution instead strip
 * *only types* from that exact source. No alternative proof algorithm, codec
 * or coordinate identity is maintained here. A real parse/typing failure
 * propagates rather than falling back to another source.
 *
 * Both paths share the same module instance when native .mts loading works.
 */
const canonicalSource = new URL(
  '../services/proof-pathing-services-section/services/proof-path-structuration-service/src/index.mts',
  import.meta.url,
);

async function loadCanonicalImplementation() {
  try {
    return await import(canonicalSource.href);
  } catch (error) {
    if (error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error;
    const [{readFile}, {stripTypeScriptTypes}] = await Promise.all([
      import('node:fs/promises'),
      import('node:module'),
    ]);
    if (typeof stripTypeScriptTypes !== 'function') {
      throw new TypeError('canonical RMN source requires a runtime with TypeScript type-stripping support');
    }
    const source = await readFile(canonicalSource, 'utf8');
    const executable = stripTypeScriptTypes(source, {mode: 'strip'});
    return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(executable)}`);
  }
}

const core = await loadCanonicalImplementation();
export const GENERATORS = core.GENERATORS;
export const termKey = core.termKey;
export const sanitizeSegment = core.sanitizeSegment;
export const desanitizeSegment = core.desanitizeSegment;
export const termSegment = core.termSegment;
export const normalizeWitnesses = core.normalizeWitnesses;
export const settleProofCoordinate = core.settleProofCoordinate;
export const encodeProofCoordinate = core.encodeProofCoordinate;
export const renderProofCoordinate = core.renderProofCoordinate;
export const parseProofCoordinate = core.parseProofCoordinate;
export const proofPathOfCoordinate = core.proofPathOfCoordinate;
export const envelopeProofCoordinate = core.envelopeProofCoordinate;
export const witnessesOfCells = core.witnessesOfCells;
export const routeOf = core.routeOf;
export const astOfRoute = core.astOfRoute;
export const renderProofPathAst = core.renderProofPathAst;
export const parseProofPath = core.parseProofPath;
export const checkProofPathAst = core.checkProofPathAst;
export const structureSemioticAtom = core.structureSemioticAtom;
export const catalogProofPaths = core.catalogProofPaths;
export const chartProofPathCatalog = core.chartProofPathCatalog;
