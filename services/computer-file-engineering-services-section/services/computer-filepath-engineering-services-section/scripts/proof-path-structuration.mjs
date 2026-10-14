/**
 * Compatibility entry point for the existing file-path package export.
 *
 * The sole proof-path fold, canonical RMN coordinate codec, and POSIX AST
 * implementation are owned by proof-path-structuration-service/src/index.mts.
 * Both published import paths must use the exact same constructors and
 * refusal semantics. Do not revive the former independent SEN-named copy.
 */
export * from '../services/proof-pathing-services-section/services/proof-path-structuration-service/src/index.mts';
