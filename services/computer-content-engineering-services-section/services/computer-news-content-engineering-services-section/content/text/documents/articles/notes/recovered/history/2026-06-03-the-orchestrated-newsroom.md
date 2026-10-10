# The orchestrated newsroom

Date: 2026-06-03

## Question

How do we go from one assembly line (ingest → write → edit → publish) to a *whole newsroom* — many
departments and agents, picking their own stories, running an economy — while staying
topic-agnostic and grounded in this repo's four-valued claim substrate?

## The frame: an org of agents over one shared claim store

A newsroom here is a set of **semiotic-worker agents over a single shared, four-valued,
append-only claim store** (the same store the site serves). Agents do **not** message each other.
They **affirm claims** and **read the settled algebra** — coordination by stigmergy (a blackboard),
exactly the "consensus as sheafing, not voting" / "a thing is its log" model.

Every hand-off is a **status gate** expressed as a claim. Each stage is its *own* predicate, affirmed
once by the responsible office (`assigned`, `reported`, `fact-checked`, `copy-cleared`,
`standards-cleared`, then `status: published`). The editor-in-chief's publish step reads the settled
algebra and only fires when the prerequisite gates are present — **governance-by-algebra**, and the
whole chain of command is auditable by replaying the trace.

(We model stages as distinct gate predicates, not one functional `status` that progresses — a
progressing single value would knowledge-join to `⊤`. A gate is affirmed-once; re-affirming folds
idempotently. Genuine disputes — two sources, two findings — still settle to `⊤` and are *shown*.)

## The org chart (department → agents → reads / affirms)

| Dept | Agents (personas) | Reads | Affirms |
| --- | --- | --- | --- |
| Wire desk | source monitors (one per feed/adapter) | live RSS/arXiv/web | source subjects + claims |
| Assignment desk | assignment editor | the claim graph (clusters, novelty, gaps, audience/revenue) | **story assignments** + `assigned` |
| Reporting (beats) | reporters (beat personas) | a story's settled sources | `draft` headline + findings, `reported` |
| Fact desk | fact-checkers (adversarial) | drafts vs sources | per-finding `verdict`, `fact-checked`; witness reputation |
| Copy desk | copy editors | drafts | koine `lint`, `copy-cleared` |
| Standards/Legal | standards editor | drafts + verdicts | ethics/legal flags, `standards-cleared` |
| Opinion | columnists (distinct voices) | settled claims | labeled `opinion` pieces |
| Editor-in-chief | the conductor | everything | `publish-approval`, `status: published`, priorities, budget |
| Production/Web | web producer | approved algebra | rendered HTML/RDF/feeds (the carrier: website-server) |
| Audience/Distribution | syndication, newsletter, analytics | published stories + engagement | POSSE pushes, **engagement claims** (feed back to assignment) |
| Revenue/Business | ad-placement, sponsorship, revenue-ops | published stories + topic metadata + cost ledger | ad slots, **P&L per story** |
| Archive/Librarian | librarian | the whole graph | dedup, related-story links, ontology upkeep |
| Corrections | corrections agent | new evidence vs published claims | corrections (new affirmations → `⊤` surfaces) |

Each agent is a **persona config**: `{ name, dept, voice, model, capabilities, budget }`. Per-agent
model selection is the cost lever (a columnist on a 70B; a wire-summarizer on an 8B).

## Story lifecycle

`tip` (wire) → `assigned` → `reported` → `fact-checked` → `copy-cleared` → `standards-cleared` →
`published` → `syndicated` → (`corrected`). Append-only means **corrections are first-class**: new
contradicting evidence settles a published claim to `⊤`, triggers the corrections agent, and the
page *shows the dispute* rather than silently editing. That is the trust moat.

## The autonomy + economy loop (the profit engine)

- **Assignment by predicted value under a token budget.** The assignment desk scores candidate
  stories (novelty × audience interest × revenue potential) and spends the cycle's LLM budget on the
  best — it *discovers* what to cover from the wire + graph gaps, no fixed query.
- **Two ledgers → per-story P&L.** A **cost ledger** (LLM tokens/$ per agent per story) and a
  **revenue ledger** (ads/subs/engagement). Revenue-ops folds them; the result feeds assignment
  priorities, so the swarm **learns which beats pay**.
- **Ads/sponsorship** ride the linked-data topic metadata we already emit (contextual placement).

## Trust as the moat

Four-valued substrate (disagreement shown, not hidden); provenance/witness on every claim;
corrections first-class; a standards office (ethics, the "citing-for-containment" guard against false
narrative closure); the whole org auditable by replaying the trace. A generic AI content farm can't
make that claim.

## Code mapping

- **website-server** stays the **substrate (claim store) + production/distribution carrier** — generic, parameterized.
- **The org is an orchestration layer** shaped like SWARM (offices, capability governance, leader-mediated writes, cost ledger). Because SWARM is churning, we build a lean local layer now (a `masthead` + org functions over the store, with the self-contained `llm.mjs`); SWARM can subsume it later (the INBOX items still stand).
- **Existing seeds**: adapters = wire desk; `synthesizeFromStore` = a reporter; `review`/koine = copy/standards; `publish` = the EIC gate; `serve` = production; the daemon = the orchestrator heartbeat; `llm.mjs` = staff capability with per-agent models.

## The parameterization: a masthead

A site = a **masthead** (departments + agent personas + policies + budget + cadence) + sources +
domain. "Give it keywords → a newswire" generalizes to "give it a masthead → it runs a newsroom."
filum-agentium's masthead is just the first; the software stays topic-agnostic.

## Staging (each department shippable on its own over the store)

1. **Masthead config + assignment desk** — the keystone: the org *picks its own stories* from the wire (multiple stories per cycle), not one fixed beat. **(this increment)**
2. **Status-gate lifecycle + editorial offices** (report → fact-check → copy → standards → EIC publish), governance-by-algebra. **(this increment)**
3. **Cost ledger** (metered LLM, per story). **(this increment)**
4. Opinion/columnists; corrections agent; librarian (related-story links).
5. Distribution (POSSE, newsletter) + analytics feedback into assignment.
6. Revenue/ads + per-story P&L closing the autonomy loop.
