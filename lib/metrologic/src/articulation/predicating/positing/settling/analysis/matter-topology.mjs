/**
 * analysis/matter-topology - finite contact-network rigidity receipts.
 *
 * Executable shadow of RelMath.Aperiodic.MatterTopology: a material bears load
 * exactly when its contact nerve has nonzero H1 cycle rank, and one redundant
 * contact raises that rank by one.
 */
import { coverNerve, forestEquality, h1Rank } from "./coordination-cohomology.mjs";
export const loadBearing = (nerve) => h1Rank(nerve) > 0;
export function redundantContact(nerve) {
    return coverNerve(nerve.entities, nerve.cells + 1, nerve.components);
}
export function receipt(nerve = coverNerve(3, 3, 1)) {
    const rank = h1Rank(nerve);
    const notForest = !forestEquality(nerve);
    const loadBearingIffNotForest = loadBearing(nerve) === notForest;
    const jammed = redundantContact(nerve);
    const jammedH1Rank = h1Rank(jammed);
    const jammingClick = jammedH1Rank === rank + 1;
    if (!loadBearingIffNotForest || !jammingClick) {
        throw new TypeError("matterTopology.receipt: finite contact-network topology laws failed");
    }
    return Object.freeze({
        kind: "aperiodic.matterTopology.receipt:witness",
        nerve,
        h1Rank: rank,
        loadBearing: loadBearing(nerve),
        notForest,
        loadBearingIffNotForest: true,
        jammed,
        jammedH1Rank,
        jammingClick: true,
        percolationFrontier: "condensate density does not alone force load-bearing topology",
    });
}
