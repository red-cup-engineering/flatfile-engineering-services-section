/**
 * Finite FOUR-valued specialization of Obsmetrologia/Calculus/Order/
 * TarskiSheafClosure.lean: Edge, IsCompatible, driveFn, settle_le_of_compatible.
 *
 * For monotone rho, join{rho(q) | q <= x} = rho(x): every summand is <= rho(x)
 * and q=x occurs. Thus four positive threshold rules per directed edge compile
 * its restriction exactly into the existing immediate-consequence operator.
 * The finite closure is the least compatible assignment above its seed. This
 * binding neither implements arbitrary transfinite iteration nor computes H1.
 */
import { readValuationFiber } from '../../valuation-fiber-algebra.mjs';
import { closureRule, closureRuleSystem, eventualClosure, valuation } from './closure-rule-system.mjs';
import { isReading, readingFamilies, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const leq = (a, b) => knowledgeJoinReading(a, b) === b;
/** Validate the complete finite restriction tables and the theorem's monotonicity premise. */
export function admitTarskiSheafComplex(input) {
    if (input === null || typeof input !== 'object')
        return Object.freeze({ kind: 'refused', reason: 'invalid-carrier' });
    const value = input;
    if (!Array.isArray(value.vertices) || value.vertices.length === 0
        || value.vertices.some(v => typeof v !== 'string' || v.length === 0)
        || new Set(value.vertices).size !== value.vertices.length || !Array.isArray(value.edges)) {
        return Object.freeze({ kind: 'refused', reason: 'invalid-carrier' });
    }
    const edges = [];
    for (const [edge, e] of value.edges.entries()) {
        if (e === null || typeof e !== 'object' || !value.vertices.includes(e.src)
            || !value.vertices.includes(e.tgt) || e.restrict === null || typeof e.restrict !== 'object'
            || readingFamilies.knowledge.some(q => !Object.hasOwn(e.restrict, q) || typeof e.restrict[q] !== 'string' || !isReading(e.restrict[q], "knowledge"))) {
            return Object.freeze({ kind: 'refused', reason: 'invalid-edge', edge });
        }
        if (readingFamilies.knowledge.some(a => readingFamilies.knowledge.some(b => leq(a, b) && !leq(e.restrict[a], e.restrict[b])))) {
            return Object.freeze({ kind: 'refused', reason: 'nonmonotone-restriction', edge });
        }
        edges.push(Object.freeze({ src: e.src, tgt: e.tgt, restrict: Object.freeze({
                absurd: e.restrict.absurd, potential: e.restrict.potential, active: e.restrict.active, stable: e.restrict.stable,
            }) }));
    }
    return Object.freeze({ kind: 'admitted', complex: Object.freeze({ kind: 'tarski.four-complex',
            vertices: Object.freeze([...value.vertices]), edges: Object.freeze(edges) }) });
}
/** Representation compilation, with no second fixed-point solver. */
export function compileTarskiSheaf(complex) {
    const admission = admitTarskiSheafComplex(complex);
    if (admission.kind === 'refused')
        throw new TypeError(`compileTarskiSheaf: ${admission.reason}`);
    return closureRuleSystem(complex.vertices, complex.edges.flatMap((edge, index) => readingFamilies.knowledge.map(q => closureRule(`restriction:${index}:${q}`, [{ cell: edge.src, atLeast: q }], { cell: edge.tgt, reading: edge.restrict[q] }))));
}
export function isTarskiCompatible(complex, section) {
    return complex.edges.every(edge => leq(edge.restrict[readValuationFiber(section, edge.src)], readValuationFiber(section, edge.tgt)));
}
export function settleTarskiSheaf(complex, seed) {
    const system = compileTarskiSheaf(complex);
    const section = eventualClosure(system, valuation(complex.vertices, seed));
    return Object.freeze({ kind: 'tarski.four-settlement', section, compatible: isTarskiCompatible(complex, section) });
}
