import { applyReadingClosure, iterateReadingOperation, knowledgeJoinClosure, } from "../../closure-operator-fiber.mjs";
const assertNatural = (value, caller) => {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError(`${caller}: expected a natural number`);
};
export function structuralOperationalReading(input) {
    for (const value of [
        input.claims,
        input.refutations,
        input.peers,
        input.plays,
        input.dialecticaWitnesses,
        input.dialecticaChallenges,
        input.transcriptMessages,
        input.ticketedPeers,
        input.matchedPlayers,
        input.pairwiseMatches,
        input.pairwiseStreams,
    ])
        assertNatural(value, "structuralOperationalReading");
    return Object.freeze({ kind: "verificationTournament.structuralOperationalReading", ...input });
}
export function survivorReading(input) {
    assertNatural(input.settledStrategy, "survivorReading");
    assertNatural(input.survivingClaim, "survivorReading");
    return Object.freeze({ kind: "verificationTournament.survivorReading", ...input });
}
export const dialecticaObjectMapped = (reading) => reading.dialecticaWitnesses === reading.claims && reading.dialecticaChallenges === reading.refutations;
export const transportRosterWitnessed = (reading) => reading.transcriptMessages === reading.claims + reading.refutations + reading.plays;
export const matchmakingOnceOnly = (reading) => reading.ticketedPeers === reading.peers
    && reading.matchedPlayers <= reading.peers
    && reading.ticketsUnique
    && reading.matchedPlayersUnique
    && reading.matchedPlayersKnown;
export const strategyPlayWitnessed = (reading) => reading.pairwiseMatches === reading.plays && reading.pairwiseStreams === reading.plays;
export function operationalWitnessesOfStructuralReading(reading) {
    return Object.freeze({
        kind: "verificationTournament.operationalWitnesses",
        dialecticaObjectMap: dialecticaObjectMapped(reading),
        transportRosterWitnessed: transportRosterWitnessed(reading),
        matchmakingOnceOnly: matchmakingOnceOnly(reading),
        strategyPlayWitnessed: strategyPlayWitnessed(reading),
    });
}
export const nashNoDeviation = (reading) => reading.fixedPoint && reading.pure && reading.noDominantRefutation;
export const dialecticaWitnessSurvives = (reading) => reading.settledRole === "claim"
    && reading.settledStrategy === reading.survivingClaim
    && reading.allRefutationsAnswered;
export const equilibriumMatchesSurvivor = (reading) => reading.fixedPoint && reading.pure && reading.settledStrategy === reading.survivingClaim;
export function survivorCorrespondenceOfUniqueDominantClaim(reading) {
    const nashStable = nashNoDeviation(reading);
    const witnessSurvives = dialecticaWitnessSurvives(reading);
    const equilibriumMatches = equilibriumMatchesSurvivor(reading);
    if (!nashStable || !witnessSurvives || !equilibriumMatches) {
        throw new TypeError("survivorCorrespondenceOfUniqueDominantClaim: survivor reading does not settle a unique dominant claim");
    }
    return Object.freeze({
        kind: "verificationTournament.survivorCorrespondence:witness",
        reading,
        nashNoDeviation: true,
        dialecticaWitnessSurvives: true,
        equilibriumMatchesSurvivor: true,
    });
}
export function runtimeObligationsOfReading(ops, reading) {
    return Object.freeze({
        kind: "verificationTournament.runtimeObligations",
        dialecticaObjectMap: ops.dialecticaObjectMap,
        transportRosterWitnessed: ops.transportRosterWitnessed,
        matchmakingOnceOnly: ops.matchmakingOnceOnly,
        strategyPlayWitnessed: ops.strategyPlayWitnessed,
        nashStable: nashNoDeviation(reading),
        dialecticaWitnessSurvives: dialecticaWitnessSurvives(reading),
        equilibriumMatchesSurvivor: equilibriumMatchesSurvivor(reading),
    });
}
export function noPeriodicOrbitFixedPoint(closure, seed, period) {
    assertNatural(period, "noPeriodicOrbitFixedPoint");
    if (period < 1)
        throw new RangeError("noPeriodicOrbitFixedPoint: period must be positive");
    return iterateReadingOperation((value) => applyReadingClosure(closure, value), seed, period) !== seed
        || applyReadingClosure(closure, seed) === seed;
}
export function settledVerdictOfClosureCertificate(closure, seed, period, certificate) {
    const cycleReturns = iterateReadingOperation((value) => applyReadingClosure(closure, value), seed, period) === seed;
    const fixedPoint = noPeriodicOrbitFixedPoint(closure, seed, period);
    if (!cycleReturns
        || !fixedPoint
        || !certificate.noProfitableDeviation
        || !certificate.dialecticaWitnessSurvives
        || !certificate.equilibriumMatchesSurvivor) {
        throw new TypeError("settledVerdictOfClosureCertificate: certificate obligations did not settle");
    }
    return Object.freeze({
        kind: "verificationTournament.settledVerdict:witness",
        closure,
        seed,
        period,
        cycleReturns: true,
        fixedPoint: true,
        certificate,
        stableForSeed: true,
        correspondsToSurvivor: true,
    });
}
export function receipt() {
    const structural = structuralOperationalReading({
        claims: 2,
        refutations: 1,
        peers: 3,
        plays: 2,
        dialecticaWitnesses: 2,
        dialecticaChallenges: 1,
        transcriptMessages: 5,
        ticketedPeers: 3,
        matchedPlayers: 2,
        pairwiseMatches: 2,
        pairwiseStreams: 2,
        ticketsUnique: true,
        matchedPlayersUnique: true,
        matchedPlayersKnown: true,
    });
    const operational = operationalWitnessesOfStructuralReading(structural);
    const survivor = survivorReading({
        settledStrategy: 1,
        survivingClaim: 1,
        settledRole: "claim",
        fixedPoint: true,
        pure: true,
        allRefutationsAnswered: true,
        noDominantRefutation: true,
    });
    const survivorCorrespondence = survivorCorrespondenceOfUniqueDominantClaim(survivor);
    const runtimeObligations = runtimeObligationsOfReading(operational, survivor);
    if (!runtimeObligations.dialecticaObjectMap
        || !runtimeObligations.transportRosterWitnessed
        || !runtimeObligations.matchmakingOnceOnly
        || !runtimeObligations.strategyPlayWitnessed) {
        throw new TypeError("verificationTournament.receipt: structural operational witnesses failed");
    }
    const verdict = settledVerdictOfClosureCertificate(knowledgeJoinClosure("potential"), "stable", 1, Object.freeze({
        kind: "verificationTournament.certificate",
        noProfitableDeviation: runtimeObligations.nashStable,
        dialecticaWitnessSurvives: runtimeObligations.dialecticaWitnessSurvives,
        equilibriumMatchesSurvivor: runtimeObligations.equilibriumMatchesSurvivor,
    }));
    return Object.freeze({
        kind: "verificationTournament.receipt:witness",
        structural,
        operational,
        survivor,
        survivorCorrespondence,
        runtimeObligations,
        verdict,
        runtimeBoundary: "transport, matchmaking, and Dialectica execution are supplied transcript obligations",
    });
}
