/**
 * analysis/kz-coherent-sheaf - finite executable shadow of
 * RelMath.Cohomology.KZCoherentSheaf.
 *
 * Lean defines KZ-coherence as a sheaf-level descent condition equating section
 * maps along KZ-connected parallel 1-cells. In the strict/Scott runtime slice,
 * those KZ 2-cells collapse extensional 1-cells, so every sheaf is coherent.
 */
const uniqueSorted = (values) => Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
export const zeroCell = (name) => {
    if (name.length === 0)
        throw new TypeError("zeroCell: name must be nonempty");
    return Object.freeze({ kind: "kzSheaf.zeroCell", name });
};
export const oneCell = (label, source, target, predicateLeg) => {
    if ([label, source, target, predicateLeg].some((value) => value.length === 0)) {
        throw new TypeError("oneCell: label/source/target/predicateLeg must be nonempty");
    }
    return Object.freeze({ kind: "kzSheaf.oneCell", label, source, target, predicateLeg });
};
export const oneCellKey = (cell) => `${cell.source}\u0000${cell.target}\u0000${cell.predicateLeg}`;
export const parallel = (left, right) => left.source === right.source && left.target === right.target;
export const kzConnected = (left, right) => parallel(left, right) && oneCellKey(left) === oneCellKey(right);
export function kz2Cell(left, right) {
    if (!kzConnected(left, right))
        throw new TypeError("kz2Cell: cells are not KZ-connected in the strict runtime slice");
    return Object.freeze({
        kind: "kzSheaf.2cell:witness",
        left,
        right,
        parallel: true,
        extensionalEquality: true,
        invertible: true,
    });
}
export function sheaf(zeroNames, oneCells, sections, restId) {
    const zeroCells = uniqueSorted(zeroNames).map(zeroCell);
    for (const cell of oneCells) {
        if (!zeroNames.includes(cell.source) || !zeroNames.includes(cell.target)) {
            throw new TypeError(`sheaf: one-cell ${cell.label} mentions an unknown zero-cell`);
        }
    }
    const sectionRecord = {};
    for (const cell of oneCells) {
        const key = oneCellKey(cell);
        const section = sections[key];
        if (section === undefined)
            throw new TypeError(`sheaf: missing section for ${cell.label}`);
        sectionRecord[key] = section;
    }
    const idRecord = {};
    for (const cell of zeroCells)
        idRecord[cell.name] = restId[cell.name] ?? `id:${cell.name}`;
    return Object.freeze({
        kind: "kzSheaf.sheaf",
        zeroCells: Object.freeze(zeroCells),
        oneCells: Object.freeze([...oneCells]),
        sections: Object.freeze(sectionRecord),
        restId: Object.freeze(idRecord),
    });
}
const sectionOf = (carrier, cell) => carrier.sections[oneCellKey(cell)] ?? "";
const allKzCells = (carrier) => Object.freeze(carrier.oneCells.flatMap((left) => carrier.oneCells.filter((right) => kzConnected(left, right)).map((right) => kz2Cell(left, right))));
export function kzCoherenceReceipt(carrier) {
    const kzCells = allKzCells(carrier);
    const identifiesParallel = kzCells.every((cell) => sectionOf(carrier, cell.left) === sectionOf(carrier, cell.right));
    if (!identifiesParallel)
        throw new TypeError("kzCoherenceReceipt: KZ-connected routes had different section maps");
    return Object.freeze({
        kind: "kzSheaf.coherence:witness",
        sheaf: carrier,
        kzCells,
        identifiesParallel: true,
        everySheafCoherentStrict: true,
    });
}
export function postcompose(carrier, transform) {
    const sections = Object.fromEntries(Object.entries(carrier.sections).map(([key, value]) => [key, transform[value] ?? value]));
    const restId = Object.fromEntries(Object.entries(carrier.restId).map(([key, value]) => [key, transform[value] ?? value]));
    return sheaf(carrier.zeroCells.map((cell) => cell.name), carrier.oneCells, sections, restId);
}
export function descentReceipt(carrier = defaultSheaf) {
    const restricted = postcompose(carrier, {
        "section:advance": "restricted:advance",
        "id:start": "restricted:id:start",
        "id:done": "restricted:id:done",
    });
    return Object.freeze({
        kind: "kzSheaf.descent:witness",
        source: carrier,
        restricted,
        sourceCoherent: kzCoherenceReceipt(carrier),
        restrictedCoherent: kzCoherenceReceipt(restricted),
        closedUnderRestriction: true,
        strictRegimeUniversality: true,
    });
}
const routeA = oneCell("route-a", "start", "done", "advance");
const routeB = oneCell("route-b", "start", "done", "advance");
export const defaultSheaf = sheaf(["start", "done"], [routeA, routeB], { [oneCellKey(routeA)]: "section:advance" }, { start: "id:start", done: "id:done" });
export function receipt() {
    return Object.freeze({
        kind: "kzSheaf.receipt:witness",
        coherence: kzCoherenceReceipt(defaultSheaf),
        descent: descentReceipt(defaultSheaf),
        aperiodicFrontier: "non-trivial aperiodic 2-cells remain proof-side",
        openFrontier: Object.freeze([
            "The runtime KZ 2-cell is the strict/Scott extensional equality of parallel 1-cells.",
            "Aperiodic non-identity 2-cells, where coherence is a genuine restriction, remain proof-side.",
            "The site-layer sheaf gluing is inherited from existing finite sheaf/cohomology surfaces, not rebuilt as a 2-site.",
        ]),
    });
}
