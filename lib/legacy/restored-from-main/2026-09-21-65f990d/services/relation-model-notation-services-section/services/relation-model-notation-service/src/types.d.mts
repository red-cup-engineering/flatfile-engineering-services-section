export type GeneratorName =
  | "specialization"
  | "converse"
  | "subjectProjection"
  | "objectProjection";

export type ChargeValueName = "unknown" | "held" | "denied" | "contested";

export type Ty =
  | readonly ["base"]
  | readonly ["arrow", Ty, Ty]
  | readonly ["prod", Ty, Ty]
  | readonly ["unit"]
  | readonly ["sum", Ty, Ty]
  | readonly ["charge"]
  | readonly ["effect"]
  | readonly ["relation", Ty, Ty]
  | readonly ["grounded", Ty, Ty]
  | readonly ["list", Ty]
  | readonly ["vector", Ty]
  | readonly ["wit", Ty];

export type EffectCell = Readonly<{
  caller: string;
  evidenceRoot: string;
  measures: readonly Readonly<{ dimension: string; quantity: string; unit: string }>[];
  outcome: Readonly<{ positiveEvidence: boolean; negativeEvidence: boolean }>;
  parent: string | null;
  provider: string;
}>;

export type Tm =
  | readonly ["var", number]
  | readonly ["lam", Tm]
  | readonly ["app", Tm, Tm]
  | readonly ["pair", Tm, Tm]
  | readonly ["fst", Tm]
  | readonly ["snd", Tm]
  | readonly ["star"]
  | readonly ["mark", string]
  | readonly ["four", boolean, boolean]
  | readonly ["effect", EffectCell]
  | readonly ["coincide", Tm, Tm]
  | readonly ["cond", Tm, Tm, Tm]
  | readonly ["fold", Tm, Tm, Tm]
  | readonly ["ascribe", Ty, Tm]
  | readonly ["left", Tm, Ty]
  | readonly ["right", Ty, Tm]
  | readonly ["nil", Ty]
  | readonly ["cons", Tm, Tm]
  | readonly ["vector", Ty, readonly Tm[]]
  | readonly ["constant", Ty, string]
  | readonly ["predicate", string, Ty, Ty]
  | readonly ["ground", Tm, Tm, Tm]
  | readonly ["witness", Tm, Tm, Tm, string];
