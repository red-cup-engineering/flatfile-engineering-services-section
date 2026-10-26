import { EAVT_ROW_PROFILE } from "@red-cup-engineering/eavt-services-section/profile";
export const SEAVT_PROFILE = Object.freeze({
  name: "seavt-row",
  base: EAVT_ROW_PROFILE.name,
  directSenCoordinates: Object.freeze(["e", "a", "v"]),
  witnessCoordinates: Object.freeze(["t"]),
});
