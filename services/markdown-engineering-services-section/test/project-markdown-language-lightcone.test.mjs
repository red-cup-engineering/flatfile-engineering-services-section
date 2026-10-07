import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  SEMANTIC_EDGE_VOCABULARY_PROFILE,
  admitSemanticEdgeVocabulary,
  expandSemanticLightcone,
  projectMarkdownLanguageLightcone,
  readProofPath,
  readSemanticEdgeVocabulary,
  runLanguageLightconeSearch,
  searchMarkdownLanguageLightcone,
} from "../src/project-markdown-language-lightcone.mjs";

const POLICY = {
  schemaVersion: 1,
  extensions: ["md"],
  excludedDirectoryNames: [".git", "node_modules"],
  vaults: [{ id: "all", region: ".", fallback: true }],
};
const VOCABULARY = {
  profile: SEMANTIC_EDGE_VOCABULARY_PROFILE,
  concepts: [
    {
      id: "proof-path",
      aliases: ["proof path"],
      pathTerms: ["proof-path"],
      sources: [],
      relations: [{ predicate: "projects-as", target: "language-cone" }],
    },
    {
      id: "language-cone",
      aliases: ["language cone"],
      pathTerms: ["language-cone"],
      sources: [],
      relations: [],
    },
    {
      id: "proof-path-condensation",
      aliases: ["proof path condensation"],
      pathTerms: ["proof-path-condensation"],
      sources: [],
      relations: [],
    },
  ],
};

test("reads and admits a vocabulary from an explicit path — there is no bundled default", async () => {
  const dir = await mkdtemp(join(tmpdir(), "markdown-language-lightcone-vocab-"));
  try {
    const path = join(dir, "vocabulary.json");
    await writeFile(path, JSON.stringify(VOCABULARY));
    const vocabulary = await readSemanticEdgeVocabulary(path);
    assert.equal(vocabulary.concepts.length, 3);
    const targets = new Set(vocabulary.concepts.map(({ id }) => id));
    assert.equal(vocabulary.concepts.every(({ relations }) => relations.every(({ target }) => targets.has(target))), true);
    await assert.rejects(() => readSemanticEdgeVocabulary(), TypeError);
    assert.throws(() => admitSemanticEdgeVocabulary({ ...VOCABULARY, profile: "wrong" }), /profile/u);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("reads every proof-path factor rather than reducing a path to its endpoint", () => {
  const proof = readProofPath("services/proof-path/content/note.md");
  assert.deepEqual(proof.edges.map(({ address }) => address), [
    "services",
    "services/proof-path",
    "services/proof-path/content",
    "services/proof-path/content/note.md",
  ]);
});

test("expands wise keyword readings over typed edges in both directions", () => {
  const cone = expandSemanticLightcone({ vocabulary: VOCABULARY, keywords: ["language cone"], depth: 1 });
  assert.deepEqual(cone.concepts.map(({ id, distance }) => [id, distance]), [
    ["language-cone", 0],
    ["proof-path", 1],
  ]);
});

test("wise keyword admission requires a complete declared reading", () => {
  const cone = expandSemanticLightcone({ vocabulary: VOCABULARY, keywords: ["proof path"], depth: 0 });
  assert.deepEqual(cone.concepts.map(({ id }) => id), ["proof-path"]);
});

test("projects proof paths, then reads only candidate Markdown carriers", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-"));
  try {
    await mkdir(join(root, "areas/proof-path"), { recursive: true });
    await mkdir(join(root, "areas/language-cone"), { recursive: true });
    await mkdir(join(root, "areas/unrelated"), { recursive: true });
    await mkdir(join(root, "areas/ess"), { recursive: true });
    await writeFile(join(root, "areas/proof-path/address.md"), "needle\n");
    await writeFile(join(root, "areas/language-cone/projection.md"), "needle\n");
    await writeFile(join(root, "areas/unrelated/false-positive.md"), "needle\n");
    await writeFile(join(root, "areas/ess/abbreviation-false-positive.md"), "needle\n");
    const projection = await projectMarkdownLanguageLightcone({
      root,
      keywords: ["proof path"],
      depth: 1,
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
    });
    assert.deepEqual(projection.candidates.map(({ path }) => path), [
      "areas/proof-path/address.md",
      "areas/language-cone/projection.md",
    ]);
    const result = await searchMarkdownLanguageLightcone({
      root,
      query: "needle",
      keywords: ["proof path"],
      depth: 1,
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
    });
    assert.deepEqual(result.search.matches.map(({ path }) => path).sort(), [
      "areas/language-cone/projection.md",
      "areas/proof-path/address.md",
    ]);
    assert.equal(result.receipt.persistedNoteIndex, false);
    assert.equal(result.receipt.searchedDocuments, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps a direct semantic seed ahead of a related semantic path", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-"));
  try {
    await mkdir(join(root, "areas/proof-path"), { recursive: true });
    await mkdir(join(root, "areas/language-cone"), { recursive: true });
    await writeFile(join(root, "areas/proof-path/address.md"), "needle\n");
    await writeFile(join(root, "areas/language-cone/projection.md"), "needle\n");
    const projection = await projectMarkdownLanguageLightcone({
      root,
      keywords: ["proof path"],
      depth: 1,
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
    });
    assert.deepEqual(projection.candidates.map(({ path }) => path), [
      "areas/proof-path/address.md",
      "areas/language-cone/projection.md",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns unmatched keywords as literal Unicode whole-word path evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-"));
  try {
    await mkdir(join(root, "language"), { recursive: true });
    await writeFile(join(root, "language/linguistics.md"), "needle\n");
    await writeFile(join(root, "language/languages.md"), "needle\n");
    await writeFile(join(root, "language/Lingüística.md"), "needle\n");
    const projection = await projectMarkdownLanguageLightcone({
      root,
      keywords: ["linguistics", "Lingüística"],
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
    });
    assert.deepEqual(projection.candidates.map(({ path }) => path), [
      "language/Lingüística.md",
      "language/linguistics.md",
    ]);
    assert.deepEqual(projection.candidates.map(({ evidence }) => evidence.proofPath), [[], []]);
    assert.deepEqual(projection.candidates.map(({ evidence }) => evidence.literalKeywordPath[0].keyword), [
      "lingüística",
      "linguistics",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("filters vault and generation before bounded carrier reads", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-"));
  const policy = {
    ...POLICY,
    vaults: [
      { id: "wanted", region: "wanted" },
      { id: "all", region: ".", fallback: true },
    ],
  };
  try {
    await mkdir(join(root, ".agents"), { recursive: true });
    await mkdir(join(root, "wanted/current"), { recursive: true });
    await mkdir(join(root, "wanted/legacy"), { recursive: true });
    for (let index = 0; index < 10; index += 1) await writeFile(join(root, `.agents/incidental-${index}.md`), "language needle\n");
    await writeFile(join(root, "wanted/current/answer.md"), "language needle\n");
    await writeFile(join(root, "wanted/legacy/old.md"), "language needle\n");
    const result = await searchMarkdownLanguageLightcone({
      root,
      query: "needle",
      keywords: ["language"],
      vocabulary: VOCABULARY,
      policy,
      vaultIds: ["wanted"],
      generation: "current",
      candidateLimit: 1,
      maximumCarrierReadings: 1,
    });
    assert.deepEqual(result.projection.candidates.map(({ path }) => path), ["wanted/current/answer.md"]);
    assert.deepEqual(result.search.matches.map(({ path }) => path), ["wanted/current/answer.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("genericPathWords defaults to a small portable core, extendable by the caller", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-generic-words-"));
  try {
    // "org" is not in the portable default core, so it carries evidence unless the
    // caller extends genericPathWords with its own organization-specific vocabulary.
    await mkdir(join(root, "org/proof-path"), { recursive: true });
    await writeFile(join(root, "org/proof-path/note.md"), "needle\n");
    const withoutExtension = await projectMarkdownLanguageLightcone({
      root,
      keywords: ["proof path"],
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
    });
    assert.deepEqual(withoutExtension.candidates.map(({ path }) => path), ["org/proof-path/note.md"]);
    const withExtension = await projectMarkdownLanguageLightcone({
      root,
      keywords: ["org"],
      vocabulary: VOCABULARY,
      policy: POLICY,
      includeCarrierReadings: false,
      genericPathWords: [...(await import("../src/project-markdown-language-lightcone.mjs")).DEFAULT_GENERIC_PATH_WORDS, "org"],
    });
    assert.deepEqual(withExtension.candidates, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("carrier limits count documents once and report only observed omissions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-carrier-cap-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "one.md"), "proof path\n".repeat(100));
  const options = { root, keywords: ["proof path"], vocabulary: VOCABULARY, policy: POLICY, maximumCarrierReadings: 1 };
  const complete = await projectMarkdownLanguageLightcone(options);
  assert.equal(complete.diagnostics.carrierCandidates, 1);
  assert.equal(complete.diagnostics.truncated, false);
  assert.equal(complete.candidates[0].evidence.carrierReading, true);
  await writeFile(join(root, "two.md"), "language cone\n");
  const bounded = await projectMarkdownLanguageLightcone(options);
  assert.equal(bounded.diagnostics.carrierCandidates, 1);
  assert.equal(bounded.diagnostics.truncated, true);
});

test("CLI policy and vocabulary paths reach both projection and narrowed search", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "markdown-lightcone-cli-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const policyPath = join(root, "policy.json"), vocabularyPath = join(root, "vocabulary.json");
  await writeFile(policyPath, JSON.stringify(POLICY));
  await writeFile(vocabularyPath, JSON.stringify(VOCABULARY));
  await writeFile(join(root, "answer.md"), "proof path needle\n");
  let output = "";
  const result = await runLanguageLightconeSearch([
    "--root", root, "--policy", policyPath, "--vocabulary", vocabularyPath,
    "--keyword", "proof path", "--query", "needle", "--carrier-limit", "1",
  ], { stdout: { write(value) { output += value; } } });
  assert.deepEqual(result.search.matches.map(({ path }) => path), ["answer.md"]);
  assert.equal(JSON.parse(output).projection.diagnostics.truncated, false);
  const projection = await projectMarkdownLanguageLightcone({ root, keywords: ["proof path"], policyPath, vocabularyPath });
  assert.deepEqual(projection.candidates.map(({ path }) => path), ["answer.md"]);
});
