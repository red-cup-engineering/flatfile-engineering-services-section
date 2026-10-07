import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { carrierFrom, carrierToTerm, type FromSchema, type Tm } from "@emsenn/relating";
import { jsonResource } from "@emsenn/relating/writing";
import { decodeDailyIndicators, type DailyIndicatorsRecord } from "@emsenn/divining/divination/codecs";
import {
  claimStateBundle,
  effectiveClaims,
  PUBLISHED,
  STATUS_PREDICATE,
  type AssertedClaim,
  type ClaimStateBundle,
  type NewsClaim,
  type NewsClaimSet,
} from "@emsenn/producing-content/topology/news";

export const DivinationNewswireProjectionSchema = {
  $id: "producing-a-newswire/divination/projection",
  type: "object",
  title: "DivinationNewswireProjection",
  required: ["kind", "date", "subject", "claimCount", "sourceKinds"],
  properties: {
    kind: { const: "producing-a-newswire.divination.projection" },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    subject: { type: "string", minLength: 1 },
    claimCount: { type: "integer", minimum: 0 },
    sourceKinds: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export type DivinationNewswireProjection = FromSchema<typeof DivinationNewswireProjectionSchema>;

export const divinationNewswireProjectionCarrier = carrierFrom(DivinationNewswireProjectionSchema);

export type DivinationNewswireBundle = Readonly<{
  projection: DivinationNewswireProjection;
  bundle: ClaimStateBundle;
}>;

export type DivinationNewswireOptions = Readonly<{
  subjectPrefix?: string;
  assertedAt?: string;
  witness?: string;
  citationBase?: string;
  status?: "published" | "draft";
}>;

function subjectFor(date: string, prefix = "routine-read"): string {
  return `${prefix}-${date}`;
}

function slugAtom(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function citationFor(base: string | undefined, date: string): string | undefined {
  return base === undefined ? undefined : `${base.replace(/\/+$/, "")}/${date}`;
}

function claim(input: Readonly<{
  id: string;
  predicate: string;
  object: unknown;
  assertedAt: string;
  valid?: string;
  force: AssertedClaim["force"];
  witness: string;
  method?: string;
  citation?: string | undefined;
}>): AssertedClaim {
  return Object.freeze({
    id: input.id,
    proposition: Object.freeze({
      predicate: input.predicate,
      object: input.object,
    }),
    time: Object.freeze({
      asserted: input.assertedAt,
      ...(input.valid === undefined ? {} : { valid: input.valid }),
    }),
    force: input.force,
    provenance: Object.freeze({
      witness: input.witness,
      ...(input.method === undefined ? {} : { method: input.method }),
      ...(input.citation === undefined ? {} : { citation: input.citation }),
    }),
    status: "supported" as const,
  });
}

function motionText(indicators: DailyIndicatorsRecord): string {
  if (indicators.motion.kind === "aspect") {
    const hit = indicators.motion.aspect;
    return `${hit.bodyA} ${hit.aspect.name} ${hit.bodyB}`;
  }
  const ingress = indicators.motion.ingress;
  return `${ingress.body} enters ${ingress.signTo.name}`;
}

function tarotText(indicators: DailyIndicatorsRecord): string {
  const position = indicators.tarot.positions[0];
  return position === undefined ? "no card" : `${position.card.name}, ${position.orientation}`;
}

function summary(indicators: DailyIndicatorsRecord): string {
  return [
    `${indicators.moon.lunation.phase} Moon in ${indicators.moon.placement.sign.name}`,
    motionText(indicators),
    tarotText(indicators),
    `number ${indicators.numerology.value}`,
    indicators.lection.reference,
  ].join("; ");
}

export function divinationIndicatorsClaimStateBundle(
  indicators: DailyIndicatorsRecord,
  options: DivinationNewswireOptions = {},
): DivinationNewswireBundle {
  const subject = subjectFor(indicators.date, options.subjectPrefix);
  const assertedAt = options.assertedAt ?? `${indicators.date}T09:00:00-04:00`;
  const witness = options.witness ?? "cassia-lorne.diviner-cycle";
  const citation = citationFor(options.citationBase, indicators.date);
  const claims: AssertedClaim[] = [
    claim({ id: "title", predicate: "title", object: `Routine Read - ${indicators.date}`, assertedAt, force: "interprets", witness, citation }),
    claim({ id: "headline", predicate: "headline", object: `Routine Read - ${indicators.date}`, assertedAt, force: "interprets", witness, citation }),
    claim({ id: "summary", predicate: "summary", object: summary(indicators), assertedAt, force: "interprets", witness, citation }),
    claim({ id: "published-at", predicate: "published-at", object: assertedAt, assertedAt, force: "confirms", witness, citation }),
    claim({ id: "author", predicate: "author", object: "Cassia Lorne", assertedAt, force: "confirms", witness, citation }),
    claim({ id: "section", predicate: "section", object: "Routine Reads", assertedAt, force: "confirms", witness, citation }),
    claim({ id: "keyword:divination", predicate: "keyword", object: "divination", assertedAt, force: "confirms", witness, citation }),
    claim({ id: "tag:routine-read", predicate: "tag", object: "routine-read", assertedAt, force: "confirms", witness, citation }),
    claim({ id: "status", predicate: STATUS_PREDICATE, object: options.status === "draft" ? "draft" : PUBLISHED, assertedAt, force: "confirms", witness, citation }),
    claim({ id: "moon:phase", predicate: "moon-phase", object: indicators.moon.lunation.phase, assertedAt, valid: indicators.chartTime, force: "computes", witness: "divining.astrology", method: "lunationOf", citation }),
    claim({ id: "moon:sign", predicate: "moon-sign", object: indicators.moon.placement.sign.name, assertedAt, valid: indicators.chartTime, force: "computes", witness: "divining.astrology", method: "signPlacement", citation }),
    claim({ id: "motion:featured", predicate: "featured-motion", object: motionText(indicators), assertedAt, force: "interprets", witness, method: "featured motion selection", citation }),
    claim({ id: "tarot:card", predicate: "tarot-card", object: tarotText(indicators), assertedAt, force: "interprets", witness: "divining.cartomancy", method: indicators.tarot.provenance.method, citation }),
    claim({ id: "numerology:value", predicate: "numerology-value", object: indicators.numerology.value, assertedAt, force: "computes", witness: "divining.numerology", method: indicators.numerology.kind, citation }),
    claim({ id: "lection:reference", predicate: "lection", object: indicators.lection.reference, assertedAt, force: "quotes", witness: "divining.liturgy", method: indicators.lection.cycle, citation }),
  ];
  for (const [index, signal] of indicators.signals.entries()) {
    claims.push(claim({
      id: `signal:${index}`,
      predicate: `signal:${slugAtom(signal.kind)}`,
      object: signal.text,
      assertedAt,
      force: "interprets",
      witness: signal.synthesizer,
      citation,
    }));
  }
  const bundle = claimStateBundle(Object.freeze({
    subject,
    claims: Object.freeze(claims),
  }) as ClaimStateBundle) as unknown as ClaimStateBundle;
  const sourceKinds = ["moon", "motion", "tarot", "numerology", "lection", ...indicators.signals.map((signal) => signal.kind)];
  const projection = divinationNewswireProjectionCarrier.assert({
    kind: "producing-a-newswire.divination.projection" as const,
    date: indicators.date,
    subject,
    claimCount: bundle.claims.length,
    sourceKinds: [...new Set(sourceKinds.map(slugAtom))],
  }, "divination newswire projection");
  return Object.freeze({ projection, bundle });
}

export function divinationIndicatorsClaimSet(bundle: ClaimStateBundle): NewsClaimSet {
  const potential: NewsClaim[] = effectiveClaims(bundle).map((entry) => Object.freeze({
    predicate: entry.proposition.predicate,
    object: entry.proposition.object,
    ...(entry.provenance.citation === undefined ? {} : { citation: entry.provenance.citation }),
    claimedBy: entry.provenance.witness,
  }));
  return Object.freeze({
    subject: bundle.subject,
    potential: Object.freeze(potential),
  });
}

export function writeDivinationNewswireBundle(
  storeDir: string,
  indicators: DailyIndicatorsRecord,
  options: DivinationNewswireOptions & Readonly<{ overwrite?: boolean }> = {},
): DivinationNewswireBundle {
  const routed = divinationIndicatorsClaimStateBundle(indicators, options);
  mkdirSync(storeDir, { recursive: true });
  writeFileSync(
    join(storeDir, `${routed.bundle.subject}.json`),
    `${JSON.stringify(routed.bundle, null, 2)}\n`,
    { encoding: "utf8", flag: options.overwrite === true ? "w" : "wx" },
  );
  return routed;
}

export function readDailyIndicatorsFile(path: string): DailyIndicatorsRecord {
  return decodeDailyIndicators(readFileSync(path, "utf8"));
}

export function readDivinationIndicatorFiles(dir: string): readonly DailyIndicatorsRecord[] {
  return Object.freeze(readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readDailyIndicatorsFile(join(dir, name))));
}

export function divinationNewswireBundlesFromIndicatorsDir(
  dir: string,
  options: DivinationNewswireOptions = {},
): readonly DivinationNewswireBundle[] {
  return Object.freeze(readDivinationIndicatorFiles(dir).map((indicators) => divinationIndicatorsClaimStateBundle(indicators, options)));
}

export function divinationNewswireProjectionTerm(input: DivinationNewswireProjection): Tm {
  return carrierToTerm(jsonResource(divinationNewswireProjectionCarrier.assert(input), "divination newswire projection"));
}

export function subjectDate(subject: string): string {
  return basename(subject).replace(/^[a-z-]+-/, "");
}
