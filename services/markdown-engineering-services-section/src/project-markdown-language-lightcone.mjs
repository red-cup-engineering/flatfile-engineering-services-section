/**
 * project-markdown-language-lightcone — projects a bounded set of keywords
 * through a declared semantic-edge vocabulary and each candidate carrier's
 * proof path (the reading of every path segment in turn), ranking Markdown
 * carriers by how directly their proof path and any admitted carrier
 * reading agree with the keyword-seeded lightcone, then optionally narrows
 * a text search to just those candidates. Never persists a note index.
 *
 * The semantic-edge vocabulary is domain content, not code: it is read from
 * a JSON file supplied by the caller (a CLI flag, an env var, or a config
 * path argument), never bundled as a package default. Likewise the set of
 * path words treated as too generic to carry semantic evidence on their own
 * (`genericPathWords`) defaults to a small, portable core and is extended by
 * the caller for its own repository's naming conventions.
 *
 */
import { confineExistingPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/filepath";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { resolve } from "node:path";
import { readFlagValue, readRepeatedFlagValues } from "@red-cup-engineering/computer-text-content-engineering-services-section/read-flag-token-values";
import {
  admitVaultPolicy,
  enumerateMarkdownPaths,
  generationForPath,
  readVaultPolicy,
  vaultForPath,
} from "./observe-markdown-vaults.mjs";
import { searchMarkdownVaults } from "./search-markdown-vaults.mjs";

export const SEMANTIC_EDGE_VOCABULARY_PROFILE = "org.red-cup-engineering.markdown-vault.semantic-edge-vocabulary.v1";

const WORD = /[\p{L}\p{N}]+/gu;
export const DEFAULT_GENERIC_PATH_WORDS = Object.freeze([
  "lib", "services", "section", "content", "documents", "articles", "notes",
  "src", "test", "data", "assets", "readme", "md", "markdown",
]);

export function normalizeSemanticKeyword(value) {
  if (typeof value !== "string") throw new TypeError("semantic keyword must be a string");
  return [...value.normalize("NFKC").toLocaleLowerCase("en-US").matchAll(WORD)]
    .map(([word]) => word)
    .join(" ");
}

function requireStrings(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new TypeError(`${name} must be a nonempty string array`);
  }
  return value;
}

export function admitSemanticEdgeVocabulary(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("vocabulary must be an object");
  if (value.profile !== SEMANTIC_EDGE_VOCABULARY_PROFILE) throw new TypeError(`vocabulary.profile must be ${SEMANTIC_EDGE_VOCABULARY_PROFILE}`);
  if (!Array.isArray(value.concepts) || value.concepts.length === 0) throw new TypeError("vocabulary.concepts must be nonempty");
  const ids = new Set();
  const concepts = value.concepts.map((concept) => {
    if (typeof concept?.id !== "string" || concept.id.length === 0 || ids.has(concept.id)) throw new TypeError(`invalid or duplicate concept id ${concept?.id}`);
    ids.add(concept.id);
    requireStrings(concept.aliases, `${concept.id}.aliases`);
    requireStrings(concept.pathTerms, `${concept.id}.pathTerms`);
    if (!Array.isArray(concept.relations)) throw new TypeError(`${concept.id}.relations must be an array`);
    return Object.freeze({
      id: concept.id,
      aliases: Object.freeze([...concept.aliases]),
      pathTerms: Object.freeze([...concept.pathTerms]),
      sources: Object.freeze([...(concept.sources ?? [])]),
      relations: Object.freeze(concept.relations.map((edge) => Object.freeze({ predicate: edge.predicate, target: edge.target }))),
    });
  });
  for (const concept of concepts) for (const edge of concept.relations) {
    if (typeof edge.predicate !== "string" || edge.predicate.length === 0 || !ids.has(edge.target)) throw new TypeError(`${concept.id} has an invalid semantic edge`);
  }
  return Object.freeze({ profile: value.profile, maturity: value.maturity ?? null, concepts: Object.freeze(concepts) });
}

/**
 * Reads and admits a semantic-edge vocabulary JSON file. There is no bundled
 * default path: the caller names the vocabulary file for its own deployment.
 * @param {string} path
 */
export async function readSemanticEdgeVocabulary(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path is required");
  return admitSemanticEdgeVocabulary(JSON.parse(await readFileText(path)));
}

function readingsOf(concept) {
  return [...new Set([concept.id, ...concept.aliases, ...concept.pathTerms])];
}

function conceptSeeds(vocabulary, keywords) {
  const normalized = keywords.map(normalizeSemanticKeyword).filter(Boolean);
  const seeds = [];
  for (const concept of vocabulary.concepts) {
    const readings = readingsOf(concept).map(normalizeSemanticKeyword);
    const evidence = normalized.filter((keyword) => readings.includes(keyword));
    if (evidence.length > 0) seeds.push(Object.freeze({ id: concept.id, evidence: Object.freeze(evidence) }));
  }
  return { normalized, seeds };
}

export function expandSemanticLightcone({ vocabulary, keywords, depth = 2 } = {}) {
  const admitted = admitSemanticEdgeVocabulary(vocabulary);
  requireStrings(keywords, "keywords");
  if (!Number.isInteger(depth) || depth < 0 || depth > 8) throw new TypeError("depth must be an integer from 0 through 8");
  const byId = new Map(admitted.concepts.map((concept) => [concept.id, concept]));
  const { normalized, seeds } = conceptSeeds(admitted, keywords);
  const reached = new Map(seeds.map((seed) => [seed.id, { id: seed.id, distance: 0, via: null, predicate: "keyword-reading", direction: "seed", evidence: seed.evidence }]));
  const queue = [...reached.values()];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.distance >= depth) continue;
    const outgoing = byId.get(current.id).relations.map((edge) => ({ ...edge, neighbor: edge.target, direction: "forward" }));
    const incoming = admitted.concepts.flatMap((concept) => concept.relations
      .filter((edge) => edge.target === current.id)
      .map((edge) => ({ ...edge, neighbor: concept.id, direction: "reverse" })));
    for (const edge of [...outgoing, ...incoming]) {
      if (reached.has(edge.neighbor)) continue;
      const reading = { id: edge.neighbor, distance: current.distance + 1, via: current.id, predicate: edge.predicate, direction: edge.direction, evidence: [] };
      reached.set(edge.neighbor, reading);
      queue.push(reading);
    }
  }
  const concepts = [...reached.values()].map((reading) => Object.freeze({
    ...reading,
    aliases: Object.freeze(readingsOf(byId.get(reading.id))),
    sources: byId.get(reading.id).sources,
  }));
  const unmatchedKeywords = normalized.filter((keyword) => !seeds.some((seed) => seed.evidence.includes(keyword)));
  return Object.freeze({
    type: "SemanticLanguageLightcone",
    keywords: Object.freeze(normalized),
    unmatchedKeywords: Object.freeze(unmatchedKeywords),
    depth,
    concepts: Object.freeze(concepts),
  });
}

export function readProofPath(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be nonempty");
  const segments = path.replaceAll("\\", "/").replace(/^\.\//u, "").split("/").filter(Boolean);
  let parent = ".";
  const edges = segments.map((segment, ordinal) => {
    const address = parent === "." ? segment : `${parent}/${segment}`;
    const edge = Object.freeze({ ordinal, parent, address, segment, reading: normalizeSemanticKeyword(segment), predicate: "proof-path:descends-through" });
    parent = address;
    return edge;
  });
  return Object.freeze({ type: "ProofPathReading", path: segments.join("/"), edges: Object.freeze(edges) });
}

function carrierPatterns(lightcone) {
  const patterns = [];
  for (const concept of lightcone.concepts) for (const alias of concept.aliases) {
    const normalized = normalizeSemanticKeyword(alias);
    const words = normalized.split(" ");
    if (words.length >= 2 || normalized.length >= 8) patterns.push(alias);
  }
  for (const keyword of lightcone.unmatchedKeywords) if (keyword.length >= 3) patterns.push(keyword);
  return [...new Set(patterns)].slice(0, 128);
}

function compilePathReadings(lightcone) {
  const readings = [];
  for (const concept of lightcone.concepts) {
    const observed = new Set();
    for (const alias of concept.aliases) {
      const needle = normalizeSemanticKeyword(alias);
      if (!needle || observed.has(needle)) continue;
      observed.add(needle);
      readings.push(Object.freeze({
        concept: concept.id,
        distance: concept.distance,
        alias,
        needle,
        queryAgreement: concept.distance === 0 && concept.evidence.includes(needle),
      }));
    }
  }
  return Object.freeze(readings);
}

function pathEvidence(path, compiledReadings, genericPathWords) {
  const proof = readProofPath(path);
  const readings = [];
  for (const compiled of compiledReadings) {
    for (const edge of proof.edges) if (
      !genericPathWords.has(edge.reading)
      && containsWholeWords(edge.reading, compiled.needle)
    ) {
        readings.push(Object.freeze({
          concept: compiled.concept,
          distance: compiled.distance,
          alias: compiled.alias,
          queryAgreement: compiled.queryAgreement,
          ordinal: edge.ordinal,
          segment: edge.segment,
          address: edge.address,
        }));
    }
  }
  return { proof, readings };
}

function containsWholeWords(reading, needle) {
  const words = needle.split(" ");
  const observed = reading.split(" ");
  return observed.some((_, index) => words.every((word, offset) => observed[index + offset] === word));
}

function literalKeywordPathEvidence(proof, keywords, genericPathWords) {
  const readings = [];
  for (const keyword of keywords) for (const edge of proof.edges) if (
    !genericPathWords.has(edge.reading)
    && containsWholeWords(edge.reading, keyword)
  ) readings.push(Object.freeze({
    keyword,
    queryAgreement: true,
    ordinal: edge.ordinal,
    segment: edge.segment,
    address: edge.address,
  }));
  return readings;
}

function selectMarkdownPaths(paths, policy, vaultIds, generation) {
  if (!Array.isArray(vaultIds) || vaultIds.length === 0) throw new TypeError("vaultIds must be a nonempty array when supplied");
  if (!["all", "current", "legacy", "reference", "triage"].includes(generation)) throw new TypeError("generation must be all, current, legacy, reference, or triage");
  const known = new Set(policy.vaults.map(({ id }) => id));
  for (const id of vaultIds) if (!known.has(id)) throw new TypeError(`unknown vault id ${id}`);
  const selected = new Set(vaultIds);
  return paths.filter((path) => selected.has(vaultForPath(path, policy).id) && (generation === "all" || generationForPath(path) === generation));
}

/**
 * @param {object} options
 * @param {string} options.root
 * @param {readonly string[]} options.keywords
 * @param {import("../types/project-markdown-language-lightcone.d.mjs").SemanticEdgeVocabulary} [options.vocabulary]
 * @param {string} [options.vocabularyPath] - read and admitted when `vocabulary` is not supplied; no bundled default
 * @param {import("./observe-markdown-vaults.mjs").MarkdownVaultPolicy} [options.policy]
 * @param {readonly string[]} [options.genericPathWords] - extends {@link DEFAULT_GENERIC_PATH_WORDS} with this deployment's own generic path vocabulary (e.g. an organization or account name that recurs in every path)
 */
export async function projectMarkdownLanguageLightcone({
  root,
  keywords,
  depth = 2,
  limit = 500,
  maximumCarrierReadings = 500,
  includeCarrierReadings = true,
  vocabulary,
  vocabularyPath,
  policy,
  policyPath,
  vaultIds,
  generation = "all",
  genericPathWords = DEFAULT_GENERIC_PATH_WORDS,
  command = "rg",
} = {}) {
  requireStrings(keywords, "keywords");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  if (!Number.isInteger(maximumCarrierReadings) || maximumCarrierReadings < 0) throw new TypeError("maximumCarrierReadings must be nonnegative");
  const admittedGenericPathWords = new Set(genericPathWords);
  const admittedRoot = (await confineExistingPath({ root })).root;
  const admittedVocabulary = vocabulary ? admitSemanticEdgeVocabulary(vocabulary) : await readSemanticEdgeVocabulary(vocabularyPath);
  const admittedPolicy = policy ? admitVaultPolicy(policy) : await readVaultPolicy(policyPath);
  const selectedVaultIds = vaultIds ?? admittedPolicy.vaults.map(({ id }) => id);
  const lightcone = expandSemanticLightcone({ vocabulary: admittedVocabulary, keywords, depth });
  const compiledReadings = compilePathReadings(lightcone);
  const enumeration = await enumerateMarkdownPaths({ root: admittedRoot, policy: admittedPolicy, command });
  const selectedPaths = selectMarkdownPaths(enumeration.paths, admittedPolicy, selectedVaultIds, generation);
  const records = new Map();
  for (const path of selectedPaths) {
    const evidence = pathEvidence(path, compiledReadings, admittedGenericPathWords);
    const literalEvidence = literalKeywordPathEvidence(evidence.proof, lightcone.unmatchedKeywords, admittedGenericPathWords);
    if (evidence.readings.length === 0 && literalEvidence.length === 0) continue;
    // Distance is the primary order. Accumulating dozens of weak readings must
    // never allow a broad archive path to outrank one direct seed proof.
    const specificity = evidence.readings.length === 0 ? 0 : Math.max(...evidence.readings.map((reading) => {
      const alias = normalizeSemanticKeyword(reading.alias);
      const segment = normalizeSemanticKeyword(reading.segment);
      const exact = alias === segment ? 50 : 0;
      const queryAgreement = reading.queryAgreement ? 1_000 : 0;
      return 10_000 - reading.distance * 1_000 + queryAgreement + exact + Math.min(alias.length, 200);
    })) + new Set(evidence.readings.map(({ concept }) => concept)).size;
    const literalSpecificity = literalEvidence.length === 0 ? 0 : 11_000 + Math.max(...literalEvidence.map(({ keyword }) => keyword.length));
    records.set(path, {
      path,
      score: Math.max(specificity, literalSpecificity),
      proofPathEvidence: evidence.readings,
      literalKeywordPathEvidence: literalEvidence,
      carrierReading: false,
    });
  }
  const patterns = carrierPatterns(lightcone);
  const carrierSearch = includeCarrierReadings && maximumCarrierReadings > 0 && patterns.length > 0 && selectedPaths.length > 0
    ? await searchMarkdownVaults({
      root: admittedRoot,
      query: patterns,
      policy: admittedPolicy,
      vaultIds: selectedVaultIds,
      generation,
      paths: selectedPaths,
      matchMode: "document",
      limit: maximumCarrierReadings,
      command,
    })
    : null;
  const carrier = { paths: carrierSearch?.matches.map(({ path }) => path) ?? [], truncated: carrierSearch?.truncated ?? false };
  for (const path of carrier.paths) {
    const existing = records.get(path) ?? { path, score: 0, proofPathEvidence: [], literalKeywordPathEvidence: [], carrierReading: false };
    existing.score += 2;
    existing.carrierReading = true;
    records.set(path, existing);
  }
  const ranked = [...records.values()].sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const candidates = ranked.slice(0, limit).map((record) => {
    const vault = vaultForPath(record.path, admittedPolicy);
    return Object.freeze({
      path: record.path,
      vaultId: vault.id,
      generation: generationForPath(record.path),
      score: record.score,
      evidence: Object.freeze({
        proofPath: Object.freeze(record.proofPathEvidence),
        literalKeywordPath: Object.freeze(record.literalKeywordPathEvidence),
        carrierReading: record.carrierReading,
      }),
    });
  });
  return Object.freeze({
    type: "MarkdownLanguageLightcone",
    root: admittedRoot,
    vocabulary: Object.freeze({ profile: admittedVocabulary.profile, path: vocabulary ? null : resolve(vocabularyPath), maturity: admittedVocabulary.maturity }),
    lightcone,
    carrierPatterns: Object.freeze(patterns),
    candidates: Object.freeze(candidates),
    diagnostics: Object.freeze({
      markdownAddressesObserved: enumeration.paths.length,
      markdownAddressesSelected: selectedPaths.length,
      proofPathCandidates: [...records.values()].filter((record) => record.proofPathEvidence.length > 0).length,
      carrierCandidates: carrier.paths.length,
      availableCandidates: ranked.length,
      truncated: ranked.length > limit || carrier.truncated,
      persistedNoteIndex: false,
    }),
  });
}

export async function searchMarkdownLanguageLightcone({
  root,
  query,
  keywords,
  depth = 2,
  candidateLimit = 500,
  maximumCarrierReadings = 500,
  includeCarrierReadings = true,
  vocabulary,
  vocabularyPath,
  policy,
  policyPath,
  vaultIds,
  generation = "all",
  genericPathWords = DEFAULT_GENERIC_PATH_WORDS,
  caseSensitive = false,
  regularExpression = false,
  limit = 50,
  command = "rg",
} = {}) {
  if (typeof query !== "string" || query.length === 0) throw new TypeError("query must be a nonempty string");
  if (!Number.isInteger(limit) || limit < 1) throw new TypeError("limit must be a positive integer");
  if (!["all", "current", "legacy", "reference", "triage"].includes(generation)) throw new TypeError("generation must be all, current, legacy, reference, or triage");
  const admittedPolicy = policy ? admitVaultPolicy(policy) : await readVaultPolicy(policyPath);
  if (vaultIds !== undefined) {
    if (!Array.isArray(vaultIds) || vaultIds.length === 0) throw new TypeError("vaultIds must be a nonempty array when supplied");
    const known = new Set(admittedPolicy.vaults.map(({ id }) => id));
    for (const id of vaultIds) if (!known.has(id)) throw new TypeError(`unknown vault id ${id}`);
  }
  const projection = await projectMarkdownLanguageLightcone({
    root,
    keywords,
    depth,
    limit: candidateLimit,
    maximumCarrierReadings,
    includeCarrierReadings,
    vocabulary,
    vocabularyPath,
    policy: admittedPolicy,
    vaultIds,
    generation,
    genericPathWords,
    command,
  });
  const search = projection.candidates.length === 0
    ? Object.freeze({
      type: "MarkdownVaultSearchResult",
      root: projection.root,
      query,
      options: Object.freeze({ vaultIds: Object.freeze(vaultIds ?? admittedPolicy.vaults.map(({ id }) => id)), generation, caseSensitive, regularExpression, limit, narrowedPaths: 0 }),
      matches: Object.freeze([]),
      matchedDocuments: 0,
      truncated: false,
      supplier: Object.freeze({ command, mode: "not-invoked; empty semantic lightcone" }),
    })
    : await searchMarkdownVaults({
      root: projection.root,
      query,
      policy: admittedPolicy,
      vaultIds,
      paths: projection.candidates.map(({ path }) => path),
      generation,
      caseSensitive,
      regularExpression,
      limit,
      command,
    });
  return Object.freeze({
    type: "MarkdownLanguageLightconeSearchResult",
    projection,
    search,
    receipt: Object.freeze({
      addressSelection: "proof-path-and-semantic-edge-projection",
      carrierReading: "bounded-ripgrep",
      persistedNoteIndex: false,
      candidateDocuments: projection.candidates.length,
      searchedDocuments: search.options.narrowedPaths,
    }),
  });
}

const LIGHTCONE_KNOWN_FLAGS = ["--root", "--query", "--keyword", "--policy", "--vocabulary", "--vault", "--generation", "--depth", "--candidate-limit", "--carrier-limit", "--no-carrier-reading", "--limit", "--case-sensitive", "--regex"];

export function parseLanguageLightconeSearchArguments(argv) {
  for (const token of argv) if (token.startsWith("--") && !LIGHTCONE_KNOWN_FLAGS.includes(token)) throw new TypeError(`unrecognized argument: ${token}`);
  const depthText = readFlagValue("--depth", argv);
  const candidateLimitText = readFlagValue("--candidate-limit", argv);
  const carrierLimitText = readFlagValue("--carrier-limit", argv);
  const limitText = readFlagValue("--limit", argv);
  const options = {
    root: readFlagValue("--root", argv) ?? process.cwd(),
    query: readFlagValue("--query", argv),
    keywords: readRepeatedFlagValues("--keyword", argv),
    policyPath: readFlagValue("--policy", argv),
    vocabularyPath: readFlagValue("--vocabulary", argv),
    vaultIds: readRepeatedFlagValues("--vault", argv),
    generation: readFlagValue("--generation", argv),
    ...(depthText === undefined ? {} : { depth: Number(depthText) }),
    ...(candidateLimitText === undefined ? {} : { candidateLimit: Number(candidateLimitText) }),
    ...(carrierLimitText === undefined ? {} : { maximumCarrierReadings: Number(carrierLimitText) }),
    ...(argv.includes("--no-carrier-reading") ? { includeCarrierReadings: false } : {}),
    ...(limitText === undefined ? {} : { limit: Number(limitText) }),
    caseSensitive: argv.includes("--case-sensitive"),
    regularExpression: argv.includes("--regex"),
  };
  if (options.vaultIds.length === 0) delete options.vaultIds;
  return options;
}

export async function runLanguageLightconeSearch(argv, io) {
  const options = parseLanguageLightconeSearchArguments(argv);
  options.policyPath ??= process.env.MARKDOWN_VAULT_POLICY_PATH;
  options.vocabularyPath ??= process.env.MARKDOWN_LANGUAGE_LIGHTCONE_VOCABULARY_PATH;
  const result = await searchMarkdownLanguageLightcone(options);
  io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export const command = Object.freeze({
  run: ({ argv, stdout, stderr }) => runLanguageLightconeSearch(argv, { stdout, stderr }),
  formatError: (error) => `search-markdown-language-lightcone: ${error.message}\n`,
  exitCode: 64,
});
