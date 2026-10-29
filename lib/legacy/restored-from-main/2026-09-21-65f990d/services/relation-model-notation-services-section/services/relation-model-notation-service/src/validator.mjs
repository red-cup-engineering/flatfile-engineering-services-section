// Public boolean boundary over the sole admitted grammar; no second walker.
import { validateRmnTerm } from "./index.mjs";

export function isTerm(value) {
  try {
    validateRmnTerm(value);
    return true;
  } catch {
    return false;
  }
}
