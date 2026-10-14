/**
 * Source-owned NodeNext declarations for the actual JavaScript closure-regime
 * implementation in closure-regime.mjs. Values and algorithm remain in that
 * module; consumers must not invent another enum or historical-name adapter.
 */
export type ClosureRegimeName = "strict" | "scott" | "transfinite-bounded" | "aperiodic";
export declare const closureRegimeNames: readonly ClosureRegimeName[];
export declare function isClosureRegimeName(value: unknown): value is ClosureRegimeName;
export declare function regimeCost(name: ClosureRegimeName): number;
export declare function regimeDecidable(name: ClosureRegimeName): boolean;
export declare function regimeCohomologyVanishes(name: ClosureRegimeName): boolean;
export declare function costlierRegime(left: ClosureRegimeName, right: ClosureRegimeName): ClosureRegimeName;
export declare const closureRegimeSchema: Readonly<{ enum: readonly ClosureRegimeName[] }>;
