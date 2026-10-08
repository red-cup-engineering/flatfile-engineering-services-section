/**
 * settling/dynamics/substitution/sofic — the sofic SFT cover of a substitution.
 *
 * A substitution tiling is SOFIC: it is a factor (forget a finite decoration) of a SHIFT OF FINITE
 * TYPE — a system defined by finitely many local matching rules / Wang adjacencies (Goodman-Strauss
 * 1998; Vereshchagin 2026: every finite-local-complexity substitution is sofic). This module builds the
 * canonical 1-block transition presentation: the SFT over the substitution's own alphabet whose allowed
 * transition `x → y` is exactly the pair `xy` that occurs consecutively in the substitution's language.
 * Its topological entropy is `log₂` of the Perron eigenvalue of the transition matrix — the genuine
 * entropy of the cover (which upper-bounds the zero entropy of the substitution subshift).
 *
 * Bounded: the 1-block follower SFT, the forgetful map the identity on letters. The genuine DECORATED
 * cover — a non-trivial forgetful map whose decorations carry the supertile hierarchy (the Mozes /
 * Goodman-Strauss construction) — is the deeper frontier and is not built here.
 *
 * @packageDocumentation
 */
import { substitute, sameSubstitutionSymbol } from "./index.mjs";
import { intIsZero, intOne, intZero } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { topologicalEntropy } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/information";
/** The 1-block (follower-set) SFT COVER of a substitution: the same alphabet, with `x → y` allowed
 *  exactly when `xy` occurs consecutively in a deep iterate (inflated until at least `sampleLength`
 *  tiles, so every admissible pair appears even for slow-growing rules; for a primitive rule the
 *  follower set then stabilises). The substitution subshift is a factor of this SFT. */
export function substitutionCoverSFT(substitution, alphabet, sampleLength = 256) {
    let word = alphabet.length > 0 ? [alphabet[0]] : [];
    for (let step = 0; word.length < sampleLength && step < 32; step += 1)
        word = substitute(substitution, word);
    const size = alphabet.length;
    const indexOf = (symbol) => alphabet.findIndex((candidate) => sameSubstitutionSymbol(candidate, symbol));
    const transitions = Array.from({ length: size }, () => Array.from({ length: size }, () => intZero));
    for (let position = 0; position + 1 < word.length; position += 1) {
        const from = indexOf(word[position]);
        const to = indexOf(word[position + 1]);
        if (from >= 0 && to >= 0)
            transitions[from][to] = intOne;
    }
    return Object.freeze({
        kind: "substitution.dynamics.sofic.sft",
        alphabet: Object.freeze([...alphabet]),
        transitions: Object.freeze(transitions.map((row) => Object.freeze(row))),
    });
}
/** The TOPOLOGICAL ENTROPY of a shift of finite type: `log₂` of the Perron eigenvalue of its transition
 *  matrix (the growth rate of admissible words). The entropy of the substitution's SFT cover — an upper
 *  bound on the (zero) entropy of the substitution subshift it factors onto. */
export function sftEntropy(sft) {
    return topologicalEntropy(sft.transitions);
}
/** The pairs FORBIDDEN by the SFT — the local matching rules, as the `(from, to)` symbol-index pairs
 *  with no allowed transition. A substitution is sofic precisely because finitely many such forbidden
 *  pairs (a finite-type constraint) suffice to present its cover. */
export function forbiddenPairs(sft) {
    const forbidden = [];
    sft.transitions.forEach((row, from) => row.forEach((entry, to) => { if (intIsZero(entry))
        forbidden.push([from, to]); }));
    return Object.freeze(forbidden);
}
