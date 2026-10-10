// css-services-section ships plain .mjs without declarations; this states the surface this package takes from it.
declare module "@red-cup-engineering/css-services-section/css-style-resolution" {
  /** The carrier a CSS system styles: nodes addressed by id. */
  export interface CssCarrier {
    readonly kind: string;
    readonly nodes: readonly { readonly nodeId: string }[];
  }
  export interface CssDeclaration {
    readonly kind: "rendering.css.declaration";
    readonly nodeId: string;
    readonly property: string;
    readonly value: string;
    readonly priority?: number;
    readonly sourceOrder?: number;
  }
  /** Structural class tokens as a finite factor map over a constraint graph. */
  export interface CssClassFactorMap {
    readonly kind: "rendering.css.classFactorMap";
    readonly nodeIds: readonly string[];
    readonly classes: readonly number[];
    readonly alphabet: readonly string[];
    readonly constraintGraph: readonly (readonly unknown[])[];
  }
  export interface CssSystem<H extends CssCarrier = CssCarrier> {
    readonly kind: "rendering.css.system";
    readonly carrier: H;
    readonly declarations: readonly CssDeclaration[];
    readonly completionRegime: string;
    readonly classFactorMap?: CssClassFactorMap;
  }
  export interface CssVisualSite {
    readonly kind: "rendering.css.visualSite";
    readonly nodeId: string;
    readonly property: string;
    readonly value: string;
    readonly declaration: CssDeclaration;
  }
  export interface CssVisualValuation<H extends CssCarrier = CssCarrier> {
    readonly kind: "rendering.css.visualValuation";
    readonly carrier: H;
    readonly sites: readonly CssVisualSite[];
  }
  export interface CssSettleWitness<H extends CssCarrier = CssCarrier> {
    readonly kind: "rendering.css_settles_to_valuation:witness";
    readonly system: CssSystem<H>;
    readonly valuation: CssVisualValuation<H>;
    readonly cascadeClosed: true;
    readonly idempotent: true;
    readonly completionRegime: string;
  }
  export interface CssClassFactorMapWitness {
    readonly kind: "rendering.css_classes_are_factor_maps:witness";
    readonly classes: CssClassFactorMap;
    readonly factorMap: unknown;
    readonly finiteAlphabet: true;
  }
  export interface CssClassFactorMapObstruction {
    readonly kind: "rendering.css_classes_are_factor_maps-obstruction";
    readonly classes: CssClassFactorMap;
    readonly reason: string;
    readonly key: string;
    readonly factorMap?: unknown;
  }
  export type CssClassFactorMapJudgment = CssClassFactorMapWitness | CssClassFactorMapObstruction;
  export function resolveNodeStyles<H extends CssCarrier>(system: CssSystem<H>): CssVisualValuation<H>;
  export function checkStyleResolutionSettled<H extends CssCarrier>(system: CssSystem<H>): CssSettleWitness<H>;
  export function checkClassMapsValid(classes: CssClassFactorMap): CssClassFactorMapJudgment;
  export function cssTextFromResolvedStyles<H extends CssCarrier>(valuation: CssVisualValuation<H>, classes?: CssClassFactorMap): string;
}
