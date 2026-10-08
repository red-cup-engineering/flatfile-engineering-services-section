import { freezeJson } from "@red-cup-engineering/json-services-section";
import { semanticId } from "./resource-term.mjs";
import { classifyResource, compileCatalog } from "./catalog.mjs";

const MAX_CONE_LEGS = 64;

function requireLeg(leg, names) {
  if (leg === null || typeof leg !== "object" || Array.isArray(leg)) throw new TypeError("language-cone leg must be an object");
  if (typeof leg.name !== "string" || leg.name.length === 0) throw new TypeError("language-cone leg.name must be nonempty");
  if (names.has(leg.name)) throw new TypeError(`duplicate language-cone leg: ${leg.name}`);
  names.add(leg.name);
  if (typeof leg.declaredApex !== "string" || leg.declaredApex.length === 0) throw new TypeError(`${leg.name}.declaredApex must be nonempty`);
  if (leg.resource === null || typeof leg.resource !== "object") throw new TypeError(`${leg.name}.resource must be an object`);
}

/**
 * Compare a catalog's classification, declared apex, literal locator seating,
 * and caller-supplied normal-form evidence for 1..64 uniquely named legs.
 *
 * Normal forms are compared through the existing resource-term identity law.
 * `undefined` is missing; null and other JSON values are supplied. Agreement is
 * supplied-equal only when every present leg supplies the same identity, partial
 * when some are missing, unknown when all are missing, and contradicted when
 * supplied identities differ. These are declarations, not derived resource
 * normal forms, codec execution, or a cross-language equivalence proof.
 *
 * Seating is exact equality or slash-delimited descent from a nonempty string
 * region. Empty, absent, or non-string regions remain unconstrained. Locators
 * are not decoded or normalized; this is not filesystem/security containment.
 * Existing catalog, resource, identity, and leg-shape refusals remain in force.
 */
export function checkLanguageCone(compiledOrDeclaration, cone, options = {}) {
  const compiled = compiledOrDeclaration?.projectors ? compiledOrDeclaration : compileCatalog(compiledOrDeclaration, options);
  if (cone === null || typeof cone !== "object" || Array.isArray(cone)) throw new TypeError("language cone must be an object");
  if (typeof cone.apex !== "string" || cone.apex.length === 0) throw new TypeError("language cone.apex must be nonempty");
  if (!Array.isArray(cone.legs) || cone.legs.length === 0 || cone.legs.length > MAX_CONE_LEGS) throw new TypeError(`language cone.legs must contain 1 to ${MAX_CONE_LEGS} legs`);
  const names = new Set();
  for (const leg of cone.legs) requireLeg(leg, names);
  const legs = cone.legs.map((leg) => {
    const classification = classifyResource(compiled, leg.resource);
    const apexDisposition = leg.declaredApex === cone.apex ? "at-apex" : "misbound";
    const registration = classification.disposition === "classified" ? "registered" : "unregistered";
    const placement = typeof cone.region !== "string" || cone.region.length === 0
      || leg.resource.path === cone.region
      || leg.resource.path.startsWith(cone.region.endsWith("/") ? cone.region : `${cone.region}/`)
      ? "seated"
      : "scattered";
    const normalForm = leg.normalForm === undefined ? null : semanticId(leg.normalForm);
    return freezeJson({
      name: leg.name,
      declaredApex: leg.declaredApex,
      apexDisposition,
      registration,
      placement,
      normalForm,
      normalFormEvidence: normalForm === null ? "missing" : "supplied",
      resource: classification.resource,
      classification,
    });
  });
  const required = Array.isArray(cone.requiredLegs) ? cone.requiredLegs : [];
  const missing = required.filter((name) => !names.has(name));
  const unregistered = legs.filter((leg) => leg.registration === "unregistered").map((leg) => leg.name);
  const misbound = legs.filter((leg) => leg.apexDisposition === "misbound").map((leg) => leg.name);
  const scattered = legs.filter((leg) => leg.placement === "scattered").map((leg) => leg.name);
  const missingNormalForms = legs.filter((leg) => leg.normalForm === null).map((leg) => leg.name);
  const suppliedNormalForms = [...new Set(legs.filter((leg) => leg.normalForm !== null).map((leg) => leg.normalForm))].sort();
  const agreement = suppliedNormalForms.length > 1 ? "contradicted"
    : suppliedNormalForms.length === 0 ? "unknown"
    : missingNormalForms.length > 0 ? "partial" : "supplied-equal";
  const disposition = missing.length > 0 || unregistered.length > 0 || misbound.length > 0 || scattered.length > 0 || agreement === "contradicted"
    ? "open"
    : agreement === "supplied-equal" ? "coherent" : "unproven";
  const receipt = {
    profile: "org.red-cup-engineering.language-cone-check.v1",
    catalog: compiled.id,
    apex: cone.apex,
    disposition,
    agreement,
    agreementScope: "caller-supplied-normal-forms",
    normalForms: suppliedNormalForms,
    missingNormalForms,
    missing,
    unregistered,
    misbound,
    scattered,
    legs,
    obligations: [
      ...missing.map((leg) => ({ kind: "missing-leg", leg })),
      ...unregistered.map((leg) => ({ kind: "unregistered-leg", leg })),
      ...misbound.map((leg) => ({ kind: "misbound-leg", leg })),
      ...scattered.map((leg) => ({ kind: "scattered-leg", leg, expectedRegion: cone.region })),
      ...missingNormalForms.map((leg) => ({ kind: "missing-normal-form", leg })),
      ...(agreement === "unknown" ? [{ kind: "leg-agreement-unwitnessed" }] : []),
      ...(agreement === "contradicted" ? [{ kind: "leg-agreement-contradicted", normalForms: suppliedNormalForms }] : []),
    ],
  };
  return freezeJson({ ...receipt, id: semanticId(receipt) });
}
