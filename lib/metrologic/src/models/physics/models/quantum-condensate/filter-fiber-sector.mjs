/**
 * models/quantum-condensate/filter-fiber-sector - filters, fibers, and sector sections.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.FilterFiberSector`: filters select admissible points
 * inside an already-indexed fiber, sectors are axis-indexed fibers, and material
 * phase points are sections across distinct axes rather than one collapsed ladder.
 */

export const structuralSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/structural-sector",
  type: "object",
  required: ["kind", "basin", "heterogeneity"],
  properties: {
    kind: { const: "relational.material.structuralSector" },
    basin: { type: "string" },
    heterogeneity: { type: "string" },
  },
  additionalProperties: false,
  title: "StructuralSector",
  description: "The structural axis of a material sector: its basin and heterogeneity readout.",
};

export const transportSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/transport-sector",
  type: "object",
  required: ["kind", "ordinal", "moduliPoint", "readout"],
  properties: {
    kind: { const: "relational.material.transportSector" },
    ordinal: { type: "string" },
    moduliPoint: { type: "string" },
    readout: { enum: ["metallizable", "blocked", "unknown"] },
  },
  additionalProperties: false,
  title: "TransportSector",
  description: "The transport axis of a material sector: its ordinal, moduli point, and readout.",
};

export const topologicalSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/topological-sector",
  type: "object",
  required: ["kind", "conducting"],
  properties: {
    kind: { const: "relational.material.topologicalSector" },
    conducting: { type: "boolean" },
  },
  additionalProperties: false,
  title: "TopologicalSector",
  description: "The topological axis of a material sector: whether it conducts.",
};

const nonempty = (value, name) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new TypeError(`${name} must be nonempty`);
  return trimmed;
};

const assertNat = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe natural number`);
  return value;
};

const normalizeFamily = (family) =>
  Object.freeze([...new Set(family.map((member) => nonempty(member, "cover family member")))].sort());

export function filteredFiber(
  id,
  accepts,
) {
  return Object.freeze({
    kind: "relational.filteredFiber",
    id: nonempty(id, "filteredFiber id"),
    accepts,
  });
}

export function filteredFiberTotal(base, point) {
  return Object.freeze({
    kind: "relational.filteredFiber.total",
    base,
    point,
  });
}

export function acceptsTotal(
  fiber,
  total,
) {
  return fiber.accepts(total.base, total.point);
}

export function acceptsKeepsBase(
  fiber,
  base,
  point,
) {
  if (!fiber.accepts(base, point)) throw new TypeError("acceptsKeepsBase: point is not accepted in its fiber");
  return Object.freeze({
    kind: "relational.filteredFiber.acceptsKeepsBase:witness",
    filteredFiber: fiber.id,
    base,
    point,
    accepted: true,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.FilteredFiber.accepts_keeps_base",
  });
}

const isBelowBase = (member, base) =>
  member === base || member.startsWith(`${base}/`);

export function siteJoinList(family) {
  const normalized = normalizeFamily(family);
  const shortest = normalized.reduce((current, member) => member.length < current.length ? member : current, normalized[0] ?? "");
  return shortest;
}

export const siteCoverFilter = filteredFiber(
  "Obsmetrologia.Relational.FilterFiberSector.siteCoverFilter",
  (base, family) => {
    const normalizedBase = nonempty(base, "site cover base");
    const normalized = normalizeFamily(family);
    return normalized.length > 0
      && normalized.every((member) => isBelowBase(member, normalizedBase))
      && siteJoinList(normalized) === normalizedBase;
  },
);

export function siteCoverFilterIsFiberLocal(base, family) {
  const normalizedBase = nonempty(base, "site cover base");
  const normalizedFamily = normalizeFamily(family);
  if (!siteCoverFilter.accepts(normalizedBase, normalizedFamily)) {
    throw new TypeError("siteCoverFilterIsFiberLocal: family is not a cover of the base clopen");
  }
  return Object.freeze({
    kind: "relational.filterFiberSector.siteCoverFilter:witness",
    base: normalizedBase,
    family: normalizedFamily,
    allMembersBelowBase: true,
    joinEqualsBase: true,
    fiberLocal: true,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.siteCoverFilter_is_fiber_local",
  });
}

export function sectorFamily(
  id,
  axes,
  sector,
) {
  const normalizedAxes = Object.freeze([...new Set(axes.map((axis) => nonempty(axis, "sector axis")))]);
  if (normalizedAxes.length === 0) throw new TypeError("sectorFamily: expected at least one axis");
  return Object.freeze({
    kind: "relational.sectorFamily",
    id: nonempty(id, "sectorFamily id"),
    axes: normalizedAxes,
    sector,
  });
}

export function sectorTotal(
  family,
  axis,
) {
  if (!family.axes.includes(axis)) throw new TypeError(`sectorTotal: axis ${axis} is not in ${family.id}`);
  return Object.freeze({
    kind: "relational.sectorFamily.total",
    axis,
    point: family.sector(axis),
  });
}

export function sectorSection(family) {
  return Object.freeze(Object.fromEntries(family.axes.map((axis) => [axis, family.sector(axis)])));
}

export function fockSectorTotal(modes) {
  return Object.freeze({
    kind: "relational.fock.sectorTotal",
    particleNumber: assertNat(modes.length, "particleNumber"),
    modes: Object.freeze([...modes]),
  });
}

export function fockSectorTotalToFockSpace(sector) {
  return Object.freeze({
    kind: "relational.fock.space",
    particleNumber: sector.particleNumber,
    modes: sector.modes,
  });
}

export function fockSpaceToFockSectorTotal(space) {
  if (space.particleNumber !== space.modes.length) throw new TypeError("fockSpaceToFockSectorTotal: particle number does not match modes");
  return Object.freeze({
    kind: "relational.fock.sectorTotal",
    particleNumber: space.particleNumber,
    modes: space.modes,
  });
}

export function fockSectorTotalRoundtrip(sector) {
  const fockSpace = fockSectorTotalToFockSpace(sector);
  const back = fockSpaceToFockSectorTotal(fockSpace);
  const roundtrip = back.particleNumber === sector.particleNumber
    && back.modes.length === sector.modes.length
    && back.modes.every((mode, index) => Object.is(mode, sector.modes[index]));
  if (!roundtrip) throw new TypeError("fockSectorTotalRoundtrip: Fock total-space identification failed");
  return Object.freeze({
    kind: "relational.fockSectorTotal.roundtrip:witness",
    sectorTotal: sector,
    fockSpace,
    roundtrip: true,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.fockSectorTotal_roundtrip",
  });
}

export function materialSectorSectionOfPoint(point) {
  return Object.freeze({
    kind: "relational.material.sectorSection",
    structural: point.structural,
    transport: point.transport,
    topological: point.topological,
  });
}

export function materialSectorSectionMetallicTransportConducts(point) {
  const section = materialSectorSectionOfPoint(point);
  if (section.transport.readout !== "metallizable" || section.topological.conducting !== true) {
    throw new TypeError("materialSectorSectionMetallicTransportConducts: material bridge is not metallizable and conducting");
  }
  return Object.freeze({
    kind: "relational.material.sectorSection.metallicTransportConducts:witness",
    section,
    metallizableTransport: true,
    conductingTopology: true,
    sectorsRemainDistinct: true,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.materialSectorSection_metallic_transport_conducts",
  });
}

export function filterFiberSectorReceipt() {
  const base = "site/clopen/U";
  const family = Object.freeze([base, `${base}/left`, `${base}/right`]);
  const filtered = acceptsKeepsBase(siteCoverFilter, base, family);
  const siteCover = siteCoverFilterIsFiberLocal(base, family);
  const fockRoundtrip = fockSectorTotalRoundtrip(fockSectorTotal(["mode-a", "mode-b"]));
  const materialBridge = materialSectorSectionMetallicTransportConducts(Object.freeze({
    kind: "relational.material.sectorPhasePoint",
    structural: Object.freeze({
      kind: "relational.material.structuralSector",
      basin: "basin-alpha",
      heterogeneity: "finite",
    }),
    transport: Object.freeze({
      kind: "relational.material.transportSector",
      ordinal: "kappa",
      moduliPoint: "moduli-alpha",
      readout: "metallizable",
    }),
    topological: Object.freeze({
      kind: "relational.material.topologicalSector",
      conducting: true,
    }),
    thermalControl: "retained-control",
  }));
  return Object.freeze({
    kind: "relational.filterFiberSector.receipt:witness",
    filteredFiber: filtered,
    siteCover,
    fockRoundtrip,
    materialBridge,
    capturedLeanModule: "Obsmetrologia.Relational.FilterFiberSector",
  });
}
