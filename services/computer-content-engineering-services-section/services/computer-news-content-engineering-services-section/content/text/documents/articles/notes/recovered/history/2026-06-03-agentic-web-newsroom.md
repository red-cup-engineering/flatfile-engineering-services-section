# The agentic-web newsroom

Date: 2026-06-03

## Question

The carrier (`settle → serve`) and the linked-data citizenship are done, but the example site was
domain-agnostic scaffolding. What should this server actually *cover* — and can the choice of beat
make the server itself better?

The answer is dogfooding. The example site is now an autonomous news site **about the agentic web**:
AI agents acting on the web (tool use, browser/web agents, protocols, interoperability, standards).
It scrapes real research and synthesizes its own coverage of the very research that would make this
server better software. The newsroom reads the literature on the thing it is.

## Decisions

### 1. The LLM writes PROSE; WE own the predicates

Asking a model to invent predicates was silly — the predicate vocabulary is the algebra's spine and
must stay controlled. So the split is: the model writes prose (a headline + findings), and the
prose becomes the **object** of a cell under a predicate **we** own. The real sources are the
**witnesses**.

`newsroom.mjs:19` fixes the only three predicates that ever enter a cell:

- `draws-on` — one per source paper (object = title, witness = the paper's URL). This is the
  bilattice of research papers the coverage rests on.
- `headline` — the synthesized clickbait (object = the headline, witness = the asserting model).
- `finds` — each finding (object = a prose sentence, witness = the source paper it rests on).

The model never touches the algebra. Prose fills objects; sources put the charge where it is.

### 2. arXiv is the source

`src/sources/arxiv.mjs` pulls real papers from the arXiv Atom API (`export.arxiv.org/api/query`,
no key needed). The parser is pure (`parseArxivAtom`, `arxivQueryUrl`); the fetch is the only effect
(`fetchArxiv`). Each paper is a real, citable source whose `url` becomes a claim's witness. The
default beat query is `AGENTIC_WEB_QUERY` (`newsroom.mjs:15`).

### 3. The inference call is injected; SWARM is wired at the edges

`runBeat`/`synthesize` take an `ask(prompt) -> text` function (`newsroom.mjs:67,82`). The core is
provider-agnostic and testable without a network or a key. The live edges wire SWARM's `nim`/`groq`
via `message()`; SWARM is **not** a hard dependency of the core — same regime discipline as the rest
of the package (the carrier note's decision 1).

### 4. koine is the content-quality gate

Each piece of generated prose is linted by `koine` (the voidmath prose linter,
`@561/development.experimental.koine`) via `lintProse(text) -> { clean, diagnostics, violations }`
(`newsroom.mjs:39`). This lets us actually *see* whether the newsroom is making good content. koine
is loaded behind a dynamic import (`newsroom.mjs:26`) so its alpha state can never break a beat —
`lintProse` returns `{ clean: null }` if koine is unavailable. koine is now a dependency.

### 5. Per-cell settle (correctness fix)

`settle` (`src/finite.mjs`) now projects the four-valued belief **per cell** (via the predicate
algebra's `exclude` + `negate`, `finite.mjs:78`), not collapsed per predicate. A subject can rest on
**many** witnessed claims under the same predicate at once — essential here: many `draws-on` papers,
many `finds`. Each citation is read straight off the settled charge (`finite.mjs:88-90`): the
positive mark affirms, the negative denies, `⊤` carries both. The earlier collapse would have kept
only one paper and one finding per subject.

### 6. The base IRI

The default public base IRI is now
`https://example.website-server.experimental.development.561.group/` (`src/serve.mjs:26`),
overridable via `WEBSITE_BASE` or the `start`/`handler` `base` option.

## Filed to SWARM (`development/lab/swarm/INBOX.md`)

Generic capabilities we'd rather consume than reimplement, with the injectable `ask` as the seam
until they land:

1. A reusable, lightweight inference client — `ask({provider, model, prompt, system?, json?}) ->
   { text, provenance }`, returning reply + stable provenance (`apiKeyEnv` the var *name*, never the
   key).
2. Asserter provenance as a first-class, persistable witness (`prov:wasAttributedTo`) — keep
   `infer`'s `{ provider, model, usage, apiKeyEnv }` shape stable.
3. A governed source-fetch tool — ledgered outbound HTTP GET (and an arXiv helper) under tool-policy,
   so *what the newsroom read* is recorded as evidence.
4. Structured-output / JSON-mode passthrough — we ask for prose, then extract our own SPOTs, but the
   extraction step wants reliable JSON.
5. A reporter/newsroom persona ("Nik Koios") or a clean custom-agent registration path, through the
   governed write boundary.

## Deferred

- **Multi-source contradiction.** Run `groq` AND `nim` on the same bundle; where their findings
  disagree, the cell settles to `⊤` and the page shows the contested claim — the paraconsistency
  the carrier already supports, now actually exercised.
- **A prose layer.** `render` still shows the algebra faithfully; a downstream renderer turns the
  settled findings back into reading prose.
- **The Nik Koios SWARM persona** (INBOX item 5), once SWARM ships the seam.
- **A continuous beat** — schedule `runBeat` so the trace climbs on its own.
