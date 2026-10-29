import { predicationSeed } from "./predication.mjs";
import { mark, utterance } from "./utterance.mjs";
import { canonicalStatementValue } from "@lenticule-science/metrologic/settling/records/persistence";

export function utteredClaimIdentity(tokenValue, claimMark) {
  const seeded = predicationSeed(utterance(mark(tokenValue), mark(claimMark)));
  const plainCell = JSON.parse(JSON.stringify(seeded));
  return Object.freeze({ cell: seeded, address: canonicalStatementValue(plainCell) });
}
