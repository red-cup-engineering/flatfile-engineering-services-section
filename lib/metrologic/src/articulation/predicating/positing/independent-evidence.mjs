/**
 * predicating/independent-evidence — a folded fiber of independent evidence as a Chu space over FOUR.
 *
 * A Fregean predication fixes ONE oriented (subject, predicate, object) point; evidence FOR it and
 * evidence AGAINST it are independent `Bool × Bool` coordinates — relational converse and
 * subject/object reversal are never denial. This is the executable form of
 * `Obsmetrologia.Language.Predicating.FregeanFourChu`: `independentEvidence : Bool × Bool -> FOUR`
 * is the EAVT section's `independentEvidenceRow`/`independentEvidenceSide` feeding its fold, and
 * `predicationChu` is what `sectionSpace` presents — predications as points, witnessing parties as
 * states, the FOUR-valued read as the matrix entry, on SignChain's Chu space.
 */
import { identifyContentAddressedRow } from "@red-cup-engineering/eavt/identify-content-addressed-row";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { chuSpace } from "../../../chu.mjs";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * sectionSpace(folded, rows, opts?) — lift a folded fiber-algebra into an explicit Chu space over
 * FOUR (SignChain's chu): the rich sibling of `section()`. The POINTS are the
 * folded cells (keyed `canonicalJson([predicate, object])`, the EAVT fold's point key), the STATES are the witnessing coordinate
 * `stateOf(row)` (e.g. the party in `t.by`), and the reading at (cell, state) is the FOUR face that
 * state witnesses: `potential` if it witnessed the positive face, `active` the converse, `stable`
 * both, `absurd` (open-world absent) neither. This is exactly the Chu presentation
 * `Obsmetrologia.predicationChu` names: predications as points, valuations (here, witnessing
 * parties) as states, evaluation as the matrix entry.
 */
export function sectionSpace(folded, rows = [], opts = {}) {
    const stateOf = opts.stateOf ?? ((r) => (r && r.t && typeof r.t === "object" ? r.t.by : r?.t));
    const absent = opts.absent ?? "absurd";
    const stateOfId = new Map();
    for (const r of rows) {
        const s = stateOf(r);
        if (s != null)
            stateOfId.set(identifyContentAddressedRow({ row: r }).identity, String(s));
    }
    const partiesOf = (ids) => {
        const out = new Set();
        for (const id of ids) {
            const s = stateOfId.get(id);
            if (s != null)
                out.add(s);
        }
        return out;
    };
    const cells = new Map();
    const posParties = new Map();
    const negParties = new Map();
    const stateSet = new Set();
    for (const c of folded.fiber) {
        if (opts.predicate !== undefined && c.predicate !== opts.predicate)
            continue;
        const key = canonicalJson([c.predicate, c.object]);
        cells.set(key, { predicate: c.predicate, object: c.object, value: c.value });
        const [posIds, negIds] = c.value.evidence;
        const pos = partiesOf(posIds);
        const neg = partiesOf(negIds);
        posParties.set(key, pos);
        negParties.set(key, neg);
        for (const s of pos)
            stateSet.add(s);
        for (const s of neg)
            stateSet.add(s);
    }
    const points = [...cells.keys()].sort();
    const states = [...stateSet].sort();
    const readingAt = (point, state) => {
        const pos = posParties.get(point)?.has(state) ?? false;
        const neg = negParties.get(point)?.has(state) ?? false;
        return !pos && !neg ? absent : readingOfSides("knowledge", pos, neg);
    };
    return {
        space: chuSpace(points, states, readingAt, { absent }),
        cellFor: (key) => cells.get(key),
        stateOfId,
    };
}
