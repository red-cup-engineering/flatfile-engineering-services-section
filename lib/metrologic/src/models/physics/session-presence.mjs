/**
 * @packageDocumentation
 *
 * analysis/session-presence - a session's own presence diamond, one level up
 * from `run-causal-set.mts`'s per-turn diamond: `SessionStart` opens it,
 * `SessionEnd` settles it. A live session is a lower endpoint plus a growing
 * witnessed interior with no upper endpoint yet — deshrouded, exactly the
 * same shape a live turn takes while its `Stop` has not yet been witnessed.
 *
 * Absence of `SessionEnd` is never proof of life: a session may simply have
 * crashed before any exit hook fired, and — until `SessionEnd` is wired into
 * a harness's hook config — every one of that harness's sessions is
 * deshrouded forever by construction, whether it is running or long closed.
 * `lastEventAt` and `idleSeconds` are the only evidence this module reports,
 * and they are evidence of RECENCY, not of life: a caller chooses its own
 * staleness threshold (`presenceLabel`, `orderPresenceMeasurements` below take it
 * as a parameter); this module asserts no default staleness convention of
 * its own beyond `DEFAULT_STALE_AFTER_SECONDS`, which a caller may ignore.
 *
 * This module knows no harness's own event names either — it opens and
 * closes a presence diamond on whichever two `hookEventName` values its
 * caller supplies as `PresenceVocabulary`. Claude Code's own vocabulary
 * (`SessionStart`/`SessionEnd`) lives at the integration boundary that reads
 * Claude Code's hooks (`src/integrations/hooks`), not here.
 */

/** The two `hookEventName` values that open and close a session's presence diamond, in whatever harness supplied the observations. */

/** The default staleness convention a caller may use unmodified; not asserted as fact by this module. */
export const DEFAULT_STALE_AFTER_SECONDS = 600;

/** One session's presence measurement: the triple (state, lastEventAt, idleSeconds), never a boolean isLive. */

function maxObservationTime(observations) {
  let max = "";
  for (const observation of observations) if (observation.at > max) max = observation.at;
  return max;
}

/**
 * Fold one session's own observations (already filtered to that session, any
 * order) into its presence measurement, against `asOf` — pass the cut's own
 * date-time (not the process clock) so re-deriving a past date's cut stays
 * reproducible.
 */
export function sessionPresenceMeasurement(
  session,
  observations,
  asOf,
  vocabulary,
) {
  if (observations.length === 0) throw new TypeError(`sessionPresenceMeasurement: ${session} has no observations to fold`);
  const eventCounts = {};
  let openedAt;
  let settled = false;
  for (const observation of observations) {
    eventCounts[observation.hookEventName] = (eventCounts[observation.hookEventName] ?? 0) + 1;
    if (observation.hookEventName === vocabulary.opensPresence && (openedAt === undefined || observation.at < openedAt)) openedAt = observation.at;
    if (observation.hookEventName === vocabulary.closesPresence) settled = true;
  }
  const lastEventAt = maxObservationTime(observations);
  const idleSeconds = Math.max(0, Math.round((Date.parse(asOf) - Date.parse(lastEventAt)) / 1000));
  return Object.freeze({
    kind: "metroplat.run.sessionPresence",
    session,
    state: settled ? "settled" : "deshrouded",
    ...(openedAt === undefined ? {} : { openedAt }),
    lastEventAt,
    idleSeconds,
    eventCounts: Object.freeze(eventCounts),
  });
}

/** Fold a day's mixed observations, grouped per session, into each session's own presence measurement. */
export function sessionPresenceMeasurements(
  observations,
  asOf,
  vocabulary,
) {
  const bySession = new Map();
  for (const observation of observations) {
    const list = bySession.get(observation.session);
    if (list === undefined) bySession.set(observation.session, [observation]);
    else list.push(observation);
  }
  const measurements = [];
  for (const [session, list] of bySession) measurements.push(sessionPresenceMeasurement(session, list, asOf, vocabulary));
  return Object.freeze(measurements);
}

/**
 * The ringleader roll-call label: `settled` sessions read as `settled`
 * regardless of recency; a `deshrouded` session reads as `deshrouded-recent`
 * or `deshrouded-stale` against the caller's own `staleAfterSeconds`. This is
 * a display/ordering convention layered atop the state triple, never a
 * replacement for it — the triple is what a consumer should actually trust.
 */
export function presenceLabel(reading, staleAfterSeconds) {
  if (reading.state === "settled") return "settled";
  return reading.idleSeconds <= staleAfterSeconds ? "deshrouded-recent" : "deshrouded-stale";
}

const PRESENCE_LABEL_RANK = Object.freeze({
  "deshrouded-recent": 0,
  "deshrouded-stale": 1,
  settled: 2,
});

/**
 * Order presence measurements for the ringleader roll call — who's here, who's
 * gone quiet, who's closed — deshrouded-recent first, settled last; ties
 * within a group broken by most-recent event first.
 */
export function orderPresenceMeasurements(
  measurements,
  staleAfterSeconds,
) {
  return Object.freeze([...measurements].sort((left, right) => {
    const byLabel = PRESENCE_LABEL_RANK[presenceLabel(left, staleAfterSeconds)] - PRESENCE_LABEL_RANK[presenceLabel(right, staleAfterSeconds)];
    if (byLabel !== 0) return byLabel;
    return right.lastEventAt < left.lastEventAt ? -1 : right.lastEventAt > left.lastEventAt ? 1 : 0;
  }));
}
