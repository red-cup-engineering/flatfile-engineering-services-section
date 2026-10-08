/**
 * `hash-seed` — the house's one FNV-1a string-to-32-bit-seed fold, previously re-derived
 * bit-for-bit in cast, parlor-kernel, card-table, energy-bank, and flickering-561-group.
 * Those packages now import this instead of copying it.
 */

/**
 * Fold a string into a 32-bit unsigned seed via FNV-1a — stable across processes, Node
 * versions, and platforms (32-bit integer arithmetic only).
 *
 * @param {string} text
 * @returns {number} a 32-bit unsigned integer
 * @throws {TypeError} if `text` is not a string
 */
export function hashSeed(text) {
  if (typeof text !== 'string') {
    throw new TypeError('hashSeed: text must be a string');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
