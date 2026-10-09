import { readingAs, readingFamilies, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const status = (tokenArticulated, claimArticulated) => Object.freeze({
    kind: "fourCorner.status",
    tokenArticulated,
    claimArticulated,
});
const [ABSURD, POTENTIAL, ACTIVE, STABLE] = readingFamilies.knowledge;
// The Lean names of the four points, keyed by the knowledge reading each is.
const readingAliasByCorner = Object.freeze({
    [ABSURD]: "kBot",
    [POTENTIAL]: "tTop",
    [STABLE]: "kTop",
    [ACTIVE]: "tBot",
});
export const fourCornerNames = Object.freeze([ABSURD, POTENTIAL, STABLE, ACTIVE]);
/** A corner is the knowledge reading whose sides are (token articulated, claim articulated). */
export function cornerOfStatus(tokenArticulated, claimArticulated) {
    return readingOfSides("knowledge", tokenArticulated, claimArticulated);
}
export function statusOfCorner(corner) {
    return status(...sidesOfReading(corner));
}
export function readingOfCorner(corner) {
    return readingAs("knowledge", corner);
}
export function readFourCorner(tokenArticulated, claimArticulated) {
    const corner = cornerOfStatus(tokenArticulated, claimArticulated);
    const reading = readingOfCorner(corner);
    return Object.freeze({
        kind: "fourCorner.reading",
        status: status(tokenArticulated, claimArticulated),
        corner,
        readingAlias: readingAliasByCorner[corner],
        readingName: reading,
        reading,
        sameCoordinates: true,
    });
}
const sameStatus = (left, right) => left.tokenArticulated === right.tokenArticulated && left.claimArticulated === right.claimArticulated;
const pairingOf = (cell) => {
    if ("potentialAperiodicArticulationCell" in cell)
        return cell.potentialAperiodicArticulationCell[1];
    return cell[1];
};
export function fourCornerOfArticulationCell(cell) {
    const [tokenSlot, claimSlot] = pairingOf(cell);
    return readFourCorner(tokenSlot.length > 0, claimSlot.length > 0);
}
export function fourCornerCellReceipt(cell) {
    const readings = Object.freeze(fourCornerNames.map((name) => {
        const cornerStatus = statusOfCorner(name);
        return readFourCorner(cornerStatus.tokenArticulated, cornerStatus.claimArticulated);
    }));
    const cornerRoundTrip = readings.every((reading) => sameStatus(statusOfCorner(reading.corner), reading.status));
    const readingCoordinateRoundTrip = readings.every((reading) => reading.readingName === readingOfCorner(reading.corner));
    const cellReading = fourCornerOfArticulationCell(cell);
    return Object.freeze({
        kind: "fourCornerCell.receipt:witness",
        readings,
        cellReading,
        cornerRoundTrip: cornerRoundTrip,
        readingCoordinateRoundTrip: readingCoordinateRoundTrip,
        articulationPhaseIsReadingByCoordinates: true,
        initialAbsurdIsKnowledgeBottom: cellReading.corner === "absurd" && cellReading.readingAlias === "kBot",
    });
}

export const fourCornerStatusSchema = {
  $id: "metroplat/calculus/four-corner-status",
  type: "object",
  required: ["kind", "tokenArticulated", "claimArticulated"],
  properties: {
    kind: { const: "fourCorner.status" },
    tokenArticulated: { type: "boolean" },
    claimArticulated: { type: "boolean" },
  },
  additionalProperties: false,
  title: "FourCornerStatus",
  description: "Whether the token and claim slots of an articulation cell are each filled.",
};

