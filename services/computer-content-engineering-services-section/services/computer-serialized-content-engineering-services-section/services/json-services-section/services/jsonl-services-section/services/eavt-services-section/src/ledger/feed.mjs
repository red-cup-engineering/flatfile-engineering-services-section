// ledger/feed - pure description of how observations become witness rows.

/**
 * Description of how one observation enters the witness ledger.
 *
 * Callers provide the domain-specific part: a stable feed name, a cellizer that
 * turns one observation into EAVT rows, and the attributes whose projected state
 * should be latest-witness-wins. Filesystem persistence and state writes live in
 * `services/filesystem-store`.
 */

