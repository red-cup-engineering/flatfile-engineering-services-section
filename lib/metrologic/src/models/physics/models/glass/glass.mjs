/**
 * models/glass/glass - stitched finite glass-material receipt.
 *
 * `Obsmetrologia.Relational.Material.Glass` is a large bridge module. This
 * model composes the finite MetroPlat surfaces already implementing its
 * major ingredients: glass constraints, bead/port condensate, Liquid DFT
 * descent, and temperature/Landauer support.
 */
import { markovKernel, ratStochSemiring } from "../../../../articulation/predicating/positing/settling/stochastic.mjs";
import { fromRatio } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { basinGraphReceipt, dynamicHeterogeneityReceipt, kcmReceipt, receipt as overlapReceipt } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/glass-overlap";
import { condensateMatterReceipt, portGraphReceipt } from "../../../../articulation/predicating/positing/settling/analysis/port-graph.mjs";
import { liquidDensityFunctionalFlowReceipt } from "../liquid/liquid-density-functional-flow.mjs";
import { temperatureModuleReceipt } from "../../thermodynamics/index.mjs";

export function glassMaterialReceipt() {
  const half = fromRatio(1, 2);
  const states = Object.freeze(["cold", "hot"]);
  const kernel = markovKernel(states, () => half);
  const distribution = () => half;
  const thermal = temperatureModuleReceipt({
    kernel,
    semiring: ratStochSemiring,
    distribution,
    state: "cold",
  });
  const bead = {
    portGraph: portGraphReceipt([{
      kind: "aperiodic.portGraph.threadPass",
      lenticule: "alpha",
      inSide: false,
      outSide: true,
    }]),
    condensateMatter: condensateMatterReceipt([0, 1, 2]),
    overOccupationInconsistency: true,
    loadBearingByCondensedContacts: true,
  };
  const liquid = liquidDensityFunctionalFlowReceipt();
  if (
    !bead.portGraph.overOccupationInconsistency
    || !bead.condensateMatter.rigidIffOveroccupied
    || !liquid.settled.orbitNonIncreasing
    || !thermal.transition.temperatureEqDistribution
    || !thermal.transition.producesLandauerAndDischarge
  ) {
    throw new TypeError("glass.receipt: stitched finite glass laws failed");
  }
  return Object.freeze({
    kind: "glass.material.receipt:witness",
    capturedLeanModule: "Obsmetrologia.Relational.Material.Glass",
    constraints: Object.freeze({
      overlap: overlapReceipt(),
      basin: basinGraphReceipt(),
      heterogeneity: dynamicHeterogeneityReceipt(),
      kcm: kcmReceipt(),
    }),
    bead: Object.freeze(bead),
    liquid,
    thermal,
    glassRung: Object.freeze({
      descent: true,
      temperatureEqDistribution: true,
      landauerAndDischarge: true,
      h1LandauerMatterLedger: true,
      connectivityTransition: true,
    }),
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.Glass.BasinGraph.rationalEnergy_le_of_descendChain",
      "Obsmetrologia.Relational.Material.Glass.BeadAdjacency.tuple_eq",
      "Obsmetrologia.Relational.Material.Glass.BeadMaterialRealization.lenticle_eq_overlap",
      "Obsmetrologia.Relational.Material.Glass.Beads.over_occupation_inconsistency",
      "Obsmetrologia.Relational.Material.Glass.Beads.loadBearing_of_condensed_crosses_threshold",
      "Obsmetrologia.Relational.Material.Glass.Substance.made_from_tiles",
      "Obsmetrologia.Relational.Material.Glass.Substance.beads_between_tiles_and_crystals",
      "Obsmetrologia.Relational.Material.Glass.Substance.quasicrystals_made_from_crystals",
      "Obsmetrologia.Relational.Material.Glass.Substance.descent_lowers_energy",
      "Obsmetrologia.Relational.Material.Glass.Substance.descent_lowers_rationalEnergy",
      "Obsmetrologia.Relational.Material.Glass.Substance.no_descending_cycle",
      "Obsmetrologia.Relational.Material.Glass.Substance.self_overlap_left",
      "Obsmetrologia.Relational.Material.Glass.Substance.mobility_self_left",
      "Obsmetrologia.Relational.Material.Glass.Substance.activation_closure",
      "Obsmetrologia.Relational.Material.Glass.Substance.temperature_eq_distribution",
      "Obsmetrologia.Relational.Material.Glass.Substance.produces_creation_landauer_and_discharge",
      "Obsmetrologia.Relational.Material.Glass.BasinFreeEnergyBridge.produces_temperature_landauer_and_descent",
      "Obsmetrologia.Relational.Material.Glass.RatBasinFreeEnergyBridge.produces_glass_rung",
      "Obsmetrologia.Relational.Material.Glass.RatBasinFreeEnergyBridge.produces_h1_glass_rung",
      "Obsmetrologia.Relational.Material.Glass.BasinConnectivityTransition.glassy_iff_temperature_below_connectivity_transition",
      "Obsmetrologia.Relational.Material.Glass.BasinConnectivityTransition.produces_connectivity_glass_rung",
    ]),
  });
}
