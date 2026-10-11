export type CensusEntry = Readonly<{ path: string; content: string }>;
export type CensusKind = "schema-document" | "schema-implementation" | "legacy-schema-document" | "legacy-implementation" | "other";
export type LegacyDisposition = "retain-as-evidence" | "retain-as-compatibility-input" | "supersede-with-explicit-migration" | "out-of-scope";
export type ArtifactRole = "schema-document" | "implementation" | "schema-declaration" | "consumer" | "test" | "documentation" | "package" | "other";
export type RecoveryDisposition = LegacyDisposition | "canonical-owner" | "retain-distinct-authority" | "consumer-of-canonical-owner" | "live-schema-law" | "test-evidence" | "documentation-evidence";
export type SchemaCapability = "authoring" | "canonicalization" | "census" | "reference-resolution" | "schema-assertion-trace" | "third-party-validation" | "validation";

export type ClassifiedCensusEntry = Readonly<{
  path: string;
  kind: CensusKind;
  role: ArtifactRole;
  generation: string;
  dialect: string | null;
  capabilities: readonly SchemaCapability[];
  recoveryDisposition: RecoveryDisposition | null;
  legacyDisposition: LegacyDisposition | null;
}>;

export type Census = Readonly<{
  entries: readonly ClassifiedCensusEntry[];
  counts: Readonly<Record<CensusKind, number>>;
  roleCounts: Readonly<Record<ArtifactRole, number>>;
}>;

const code = /\.(?:[cm]?[jt]s)$/u;
const documentation = /\.(?:md|rml|txt)$/u;
const archivedPath = /(?:^|\/)(?:legacy|_archive|archive|retired-carriers|content\/assets\/legacy)(?:\/|$)/u;
const schemaWords = /(?:JSON Schema|json-schema|read-a-schema|write-a-schema|\.schema\.json|\$schema|SchemaAssertion|schemaCorpus)/iu;
const implementationWords = /(?:export\s+function\s+(?:validateInstance|createSchema|schemaCorpus|resolveJsonPointer|resolvePointer|projectSchemaAssertions|cohereSchemaAssertions|unfoldSchema|foldSchema|schemaRegistry|validateSchemaInstance|admitSchema|resolveSchemaReference|censusSchemaArtifacts|transformSchemaAssertions)|function\s+(?:validate|schemaErrors)\s*\([^)]*schema|classifyCensusEntry\s*\()/u;

function generation(path: string): string {
  const dated = /content\/assets\/legacy\/([^/]+)/u.exec(path)?.[1];
  if (dated) return dated;
  if (path.includes("/lib/legacy/metroplat/")) return "metroplat";
  if (path.includes("/relating-experimental/")) return "relating-experimental";
  if (path.includes("/services/relating/")) return "relating";
  if (path.includes("/executive-office/")) return "executive-office";
  if (path.includes("/json-schema-service/")) return "json-schema-service";
  return "current";
}

function capabilities(content: string): SchemaCapability[] {
  const found: SchemaCapability[] = [];
  const add = (capability: SchemaCapability, pattern: RegExp): void => { if (pattern.test(content)) found.push(capability); };
  add("authoring", /(?:createSchema|write-a-schema|schemaErrors)/u);
  add("canonicalization", /(?:canonicalJson|canonicalBytes|canonical\()/u);
  add("census", /(?:json-schema-census|classifyCensusEntry)/u);
  add("reference-resolution", /(?:resolveJsonPointer|resolvePointer|schemaCorpus|schemaRegistry|\$ref)/u);
  add("schema-assertion-trace", /(?:SchemaAssertion|projectSchemaAssertions|unfoldSchema|cohereSchemaAssertions)/u);
  add("third-party-validation", /(?:new\s+Ajv|Ajv2020|zodToJsonSchema)/u);
  add("validation", /(?:validateInstance|function\s+validate\s*\([^)]*schema)/u);
  return found.sort();
}

function role(entry: CensusEntry, found: readonly SchemaCapability[]): ArtifactRole {
  const { path, content } = entry;
  if (path.endsWith(".schema.json")) return "schema-document";
  if (/(?:^|\/)test(?:\/|$)|\.test\.[cm]?[jt]s$/u.test(path) && schemaWords.test(content)) return "test";
  if (documentation.test(path) && schemaWords.test(content)) return "documentation";
  if (path.endsWith("package.json") && schemaWords.test(content)) return "package";
  if (code.test(path) && implementationWords.test(content)) return "implementation";
  if (code.test(path) && /(?:new\s+Ajv|Ajv2020|zodToJsonSchema)/u.test(content)) return "consumer";
  if (code.test(path) && schemaWords.test(content)) {
    if (/(?:^|\/)schema\.[cm]?[jt]s$/u.test(path) && found.length === 0) return "schema-declaration";
    return "consumer";
  }
  return "other";
}

function disposition(path: string, artifactRole: ArtifactRole, archived: boolean): RecoveryDisposition | null {
  if (archived) {
    if (artifactRole === "implementation") return "supersede-with-explicit-migration";
    if (artifactRole === "schema-document" || artifactRole === "schema-declaration" || artifactRole === "test" || artifactRole === "documentation") return "retain-as-evidence";
    return "out-of-scope";
  }
  if (path.includes("/json-schema-service/") && artifactRole === "implementation") return "canonical-owner";
  if (artifactRole === "implementation") return "retain-distinct-authority";
  if (artifactRole === "consumer") return "consumer-of-canonical-owner";
  if (artifactRole === "schema-document" || artifactRole === "schema-declaration") return "live-schema-law";
  if (artifactRole === "test") return "test-evidence";
  if (artifactRole === "documentation") return "documentation-evidence";
  return null;
}

/** Classify implementation, consumer, declaration, test, and documentary generations without promoting an archive. */
export function classifyCensusEntry(entry: CensusEntry): ClassifiedCensusEntry {
  const archived = archivedPath.test(entry.path);
  const found = capabilities(entry.content);
  const artifactRole = role(entry, found);
  const schemaDocument = artifactRole === "schema-document";
  const implementation = artifactRole === "implementation";
  const kind: CensusKind = schemaDocument
    ? (archived ? "legacy-schema-document" : "schema-document")
    : implementation
      ? (archived ? "legacy-implementation" : "schema-implementation")
      : "other";
  const recoveryDisposition = disposition(entry.path, artifactRole, archived);
  const legacyDisposition: LegacyDisposition | null = archived
    ? recoveryDisposition as LegacyDisposition
    : null;
  return Object.freeze({
    path: entry.path,
    kind,
    role: artifactRole,
    generation: generation(entry.path),
    dialect: /["']\$schema["']\s*:\s*["']([^"']+)["']/u.exec(entry.content)?.[1] ?? null,
    capabilities: Object.freeze(found),
    recoveryDisposition,
    legacyDisposition,
  });
}

export function census(entries: readonly CensusEntry[]): Census {
  return censusClassified(entries.map(classifyCensusEntry));
}

/** Count already-classified entries so filesystem census need not retain source bodies. */
export function censusClassified(entries: readonly ClassifiedCensusEntry[]): Census {
  const counts: Record<CensusKind, number> = { "schema-document": 0, "schema-implementation": 0, "legacy-schema-document": 0, "legacy-implementation": 0, other: 0 };
  const roleCounts: Record<ArtifactRole, number> = { "schema-document": 0, implementation: 0, "schema-declaration": 0, consumer: 0, test: 0, documentation: 0, package: 0, other: 0 };
  const classified = [...entries].sort((left, right) => left.path.localeCompare(right.path));
  for (const entry of classified) { counts[entry.kind] += 1; roleCounts[entry.role] += 1; }
  return Object.freeze({ entries: Object.freeze(classified), counts: Object.freeze(counts), roleCounts: Object.freeze(roleCounts) });
}

// — data/records census (record kinds and their carriers, DR-33, S6) —
//
// A records census reads the tracked file list (`git ls-files -s`), never a walked tree. Each file is
// keyed to a record kind by the first path segment after `data/records/`; loose files at a records root
// are keyed `(root).<extension>`. A kind is declared by a `.schema.json` carrying `x-codegen` and
// `x-record-kind` (S1: the declaration is the schema type, not a registry); its class, owner, readers and
// generator are that specification's `x-record-class`, `x-record-owner`, `x-record-readers` and
// `x-record-generator`. Readings are FOUR-valued by sides told (for, against): ⊥ (0,0) and f (0,1) file
// an obstruction, ⊤ (1,1) files a certificate, t (1,0) closes it.

export type Four = "⊥" | "t" | "f" | "⊤";
export type RecordClass = "derivation" | "act" | "observation" | "authored";
export type InferredRecordClass = RecordClass | "code" | "configuration" | "undetermined" | "mixed";
export type RecordsCensusEntry = Readonly<{
  path: string;
  blob: string;
  bytes: number;
  /** Leading text of the blob, for stated-generation markers; a census may bound it. */
  head?: string;
  /** Whole text, supplied for `.schema.json` files and READMEs. */
  content?: string;
}>;
export type RecordKindDeclaration = Readonly<{
  path: string;
  kind: string;
  class: string | null;
  owner: string | null;
  readers: readonly string[];
  generator: string | null;
}>;
export type RecordKindReadings = Readonly<{
  declared: Four;
  "has-reader": Four;
  "no-derivable-bytes": Four;
  "no-duplicate-bytes": Four;
  "no-code": Four;
  "schema-consumed": Four;
}>;
export type RecordKindCensus = Readonly<{
  kind: string;
  files: number;
  bytes: number;
  directories: number;
  declaredClass: string | null;
  inferredClass: InferredRecordClass;
  derivableBytes: number;
  derivableFiles: number;
  duplicateBytes: number;
  duplicateFiles: number;
  codeFiles: number;
  schemaFiles: number;
  schemasWithoutCodegen: number;
  readerCount: number;
  declarations: readonly string[];
  readings: RecordKindReadings;
}>;
export type DuplicateGroup = Readonly<{ blob: string; bytes: number; paths: readonly string[] }>;
export type RecordsCensus = Readonly<{
  totals: Readonly<{
    files: number; bytes: number; recordsDirectories: number; kindDirectories: number; kinds: number;
    schemaFiles: number; schemaDocuments: number; schemasWithoutCodegen: number; codeFiles: number;
    derivableBytes: number; duplicateGroups: number; duplicateFiles: number; duplicateBytes: number;
    kindsWithoutReader: number; declarations: number;
  }>;
  readingCounts: Readonly<Record<keyof RecordKindReadings, Readonly<Record<Four, number>>>>;
  kinds: readonly RecordKindCensus[];
  duplicateGroups: readonly DuplicateGroup[];
}>;

const recordsSegment = "/data/records/";
const recordClasses: readonly string[] = ["derivation", "act", "observation", "authored"];
const sourceFile = /\.(?:[cm]?[jt]s|mts|cts|py|sh|bash|rb|pl|go|rs|lean|hs)$/u;
const configurationFile = /(?:\.(?:toml|ya?ml|service|timer|socket|ini|conf|env)|(?:^|\/)(?:Dockerfile|Makefile|lakefile[^/]*))$/u;
const authoredFile = /\.(?:md|rml|txt|ttl|scm|bib)$/u;
const statedGeneration = /(?:generated by|auto-?generated|do not (?:hand-)?edit|not edited by hand|regenerate (?:it|this|them|with|from|by))/iu;

/** The records root and kind of a tracked path, or null when it is not under data/records. */
export function recordKindOfPath(path: string): Readonly<{ root: string; kind: string; directory: string }> | null {
  const at = `/${path}`.indexOf(recordsSegment);
  if (at < 0) return null;
  const root = path.slice(0, at + recordsSegment.length - 1);
  const rest = path.slice(at + recordsSegment.length - 1);
  const slash = rest.indexOf("/");
  if (rest === "") return null;
  if (slash < 0) {
    const dot = rest.lastIndexOf(".");
    return Object.freeze({ root, kind: `(root)${dot > 0 ? rest.slice(dot) : ""}`, directory: root });
  }
  const segment = rest.slice(0, slash);
  return Object.freeze({ root, kind: segment, directory: `${root}${segment}` });
}

const parseJson = (text: string | undefined): unknown => { if (text === undefined) return undefined; try { return JSON.parse(text); } catch { return undefined; } };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasCodegen = (schema: unknown): boolean => isRecord(schema) && Object.hasOwn(schema, "x-codegen");

/** A record kind declaration read from one `.schema.json` that carries `x-codegen` and `x-record-kind`. */
export function recordKindDeclaration(path: string, content: string): RecordKindDeclaration | null {
  const schema = parseJson(content);
  if (!isRecord(schema) || !hasCodegen(schema) || typeof schema["x-record-kind"] !== "string") return null;
  const text = (key: string): string | null => typeof schema[key] === "string" ? schema[key] as string : null;
  const readers = Array.isArray(schema["x-record-readers"]) ? (schema["x-record-readers"] as unknown[]).filter((reader): reader is string => typeof reader === "string") : [];
  return Object.freeze({ path, kind: schema["x-record-kind"] as string, class: text("x-record-class"), owner: text("x-record-owner"), readers: Object.freeze([...new Set(readers)].sort()), generator: text("x-record-generator") });
}

const four = (forTold: boolean, againstTold: boolean): Four => forTold ? (againstTold ? "⊤" : "t") : (againstTold ? "f" : "⊥");

function fileClass(path: string, derivable: boolean): InferredRecordClass {
  if (sourceFile.test(path)) return "code";
  if (derivable) return "derivation";
  if (configurationFile.test(path)) return "configuration";
  if (path.endsWith(".schema.json") || authoredFile.test(path)) return "authored";
  return "undetermined";
}

/**
 * Census the tracked files under data/records by record kind: files, bytes, class, derivable bytes,
 * duplicate bytes (by blob id), code files, schemas without `x-codegen`, and declared reader count, each
 * kind read in FOUR. Entries outside data/records are ignored; declarations may come from anywhere.
 */
export function censusRecords(entries: readonly RecordsCensusEntry[], declarations: readonly RecordKindDeclaration[] = []): RecordsCensus {
  const located = entries.flatMap((entry) => { const at = recordKindOfPath(entry.path); return at ? [{ entry, ...at }] : []; })
    .sort((left, right) => left.entry.path < right.entry.path ? -1 : left.entry.path > right.entry.path ? 1 : 0);

  // A README under a records root that states generation marks every file below its directory derivable.
  const generatedDirectories = located.filter(({ entry }) => /(?:^|\/)README\.md$/iu.test(entry.path) && statedGeneration.test(entry.content ?? entry.head ?? ""))
    .map(({ entry }) => entry.path.slice(0, entry.path.lastIndexOf("/") + 1));
  const derivable = (path: string, head: string | undefined): boolean => statedGeneration.test(head ?? "") || generatedDirectories.some((directory) => path.startsWith(directory) && !/(?:^|\/)README\.md$/iu.test(path));

  const byBlob = new Map<string, typeof located>();
  for (const item of located) { const group = byBlob.get(item.entry.blob) ?? []; group.push(item); byBlob.set(item.entry.blob, group); }
  const duplicateGroups: DuplicateGroup[] = [];
  const redundant = new Set<string>();
  for (const [blob, group] of byBlob) {
    if (group.length < 2) continue;
    duplicateGroups.push(Object.freeze({ blob, bytes: group[0]!.entry.bytes, paths: Object.freeze(group.map(({ entry }) => entry.path)) }));
    for (const { entry } of group.slice(1)) redundant.add(entry.path);
  }
  duplicateGroups.sort((left, right) => right.bytes * right.paths.length - left.bytes * left.paths.length || (left.blob < right.blob ? -1 : 1));

  const declared = new Map<string, RecordKindDeclaration[]>();
  for (const declaration of declarations) { const list = declared.get(declaration.kind) ?? []; list.push(declaration); declared.set(declaration.kind, list); }

  const byKind = new Map<string, typeof located>();
  for (const item of located) { const group = byKind.get(item.kind) ?? []; group.push(item); byKind.set(item.kind, group); }
  const kinds: RecordKindCensus[] = [];
  for (const [kind, group] of byKind) {
    let bytes = 0, derivableBytes = 0, derivableFiles = 0, duplicateBytes = 0, duplicateFiles = 0, codeFiles = 0, schemaFiles = 0, schemasWithoutCodegen = 0;
    const classes = new Set<InferredRecordClass>();
    for (const { entry } of group) {
      bytes += entry.bytes;
      const isDerivable = derivable(entry.path, entry.head ?? entry.content);
      if (isDerivable) { derivableBytes += entry.bytes; derivableFiles += 1; }
      if (redundant.has(entry.path)) { duplicateBytes += entry.bytes; duplicateFiles += 1; }
      const cls = fileClass(entry.path, isDerivable);
      if (cls === "code") codeFiles += 1;
      if (!/(?:^|\/)README\.md$/iu.test(entry.path)) classes.add(cls);
      if (/(?:^|\/)schema\//u.test(entry.path.slice(`/${entry.path}`.indexOf(recordsSegment) + recordsSegment.length - 1))) schemaFiles += 1;
      if (entry.path.endsWith(".schema.json") && !hasCodegen(parseJson(entry.content))) schemasWithoutCodegen += 1;
    }
    const kindDeclarations = declared.get(kind) ?? [];
    const declaredClasses = [...new Set(kindDeclarations.map((declaration) => declaration.class))];
    const declaredClass = declaredClasses.length === 1 ? declaredClasses[0] ?? null : null;
    const readers = new Set(kindDeclarations.flatMap((declaration) => declaration.readers));
    const inferredClass: InferredRecordClass = classes.size === 0 ? "authored" : classes.size === 1 ? [...classes][0]! : "mixed";
    const schemaDocuments = group.filter(({ entry }) => entry.path.endsWith(".schema.json")).length;
    const readings: RecordKindReadings = Object.freeze({
      // Told for by one declaration with a class of the four; told against by a classless or foreign class; ⊤ for two declarations.
      declared: kindDeclarations.length > 1 ? "⊤" : kindDeclarations.length === 0 ? "⊥" : four(true, !recordClasses.includes(kindDeclarations[0]!.class ?? "")),
      "has-reader": kindDeclarations.length === 0 ? "⊥" : four(readers.size > 0, readers.size === 0),
      // Derivable bytes, or a derivation declaration, tell against; a kind declared otherwise that states generation is contested.
      "no-derivable-bytes": derivableBytes > 0 && declaredClass !== null && declaredClass !== "derivation" ? "⊤"
        : four(derivableBytes === 0 && declaredClass !== "derivation", derivableBytes > 0 || declaredClass === "derivation"),
      "no-duplicate-bytes": four(duplicateFiles === 0, duplicateFiles > 0),
      "no-code": four(codeFiles === 0, codeFiles > 0),
      "schema-consumed": schemaDocuments === 0 ? "t" : four(schemasWithoutCodegen < schemaDocuments, schemasWithoutCodegen > 0),
    });
    kinds.push(Object.freeze({
      kind, files: group.length, bytes, directories: new Set(group.map((item) => item.directory)).size,
      declaredClass, inferredClass, derivableBytes, derivableFiles, duplicateBytes, duplicateFiles, codeFiles, schemaFiles, schemasWithoutCodegen,
      readerCount: readers.size, declarations: Object.freeze(kindDeclarations.map((declaration) => declaration.path).sort()), readings,
    }));
  }
  kinds.sort((left, right) => right.bytes - left.bytes || (left.kind < right.kind ? -1 : 1));

  const readingNames: (keyof RecordKindReadings)[] = ["declared", "has-reader", "no-derivable-bytes", "no-duplicate-bytes", "no-code", "schema-consumed"];
  const readingCounts = Object.fromEntries(readingNames.map((name) => {
    const counts: Record<Four, number> = { "⊥": 0, t: 0, f: 0, "⊤": 0 };
    for (const kind of kinds) counts[kind.readings[name]] += 1;
    return [name, Object.freeze(counts)];
  })) as Record<keyof RecordKindReadings, Readonly<Record<Four, number>>>;
  const sum = (key: "bytes" | "derivableBytes" | "duplicateBytes" | "duplicateFiles" | "codeFiles" | "schemaFiles" | "schemasWithoutCodegen"): number => kinds.reduce((total, kind) => total + kind[key], 0);
  return Object.freeze({
    totals: Object.freeze({
      files: located.length, bytes: sum("bytes"),
      recordsDirectories: new Set(located.map((item) => item.root)).size,
      kindDirectories: new Set(located.filter((item) => item.directory !== item.root).map((item) => item.directory)).size,
      kinds: kinds.length, schemaFiles: sum("schemaFiles"),
      schemaDocuments: located.filter(({ entry }) => entry.path.endsWith(".schema.json")).length,
      schemasWithoutCodegen: sum("schemasWithoutCodegen"), codeFiles: sum("codeFiles"), derivableBytes: sum("derivableBytes"),
      duplicateGroups: duplicateGroups.length, duplicateFiles: sum("duplicateFiles"), duplicateBytes: sum("duplicateBytes"),
      kindsWithoutReader: kinds.filter((kind) => kind.readings["has-reader"] !== "t").length, declarations: declarations.length,
    }),
    readingCounts: Object.freeze(readingCounts),
    kinds: Object.freeze(kinds),
    duplicateGroups: Object.freeze(duplicateGroups),
  });
}
