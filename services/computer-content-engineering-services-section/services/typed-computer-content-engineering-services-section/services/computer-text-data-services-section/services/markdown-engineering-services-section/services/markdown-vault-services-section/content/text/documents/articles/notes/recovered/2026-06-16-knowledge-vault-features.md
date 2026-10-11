# Knowledge Vault Feature Invariants

This note records the invariant feature surface for `research.
561.group` as a real markdown-vault knowledge system for humans and agents.
The goal is not a single search endpoint.
The goal is an HTTP-served vault computer whose readings, scripts, MCP surfaces, OpenAPI descriptions, and human web views are different projections of the same underlying relational carriers.

## MUST

- Accept a knowledge vault as a directory tree of messy Markdown files, attachments, frontmatter, links, and arbitrary organization.
- Treat files, frontmatter, links, paths, headings, citations, tags, and bodies as evidence, not as isolated DTOs.
- Normalize every core structure through relational carriers into `Mark`s in `Utterance`s.
- Preserve round-trippable descent: domain value -> carrier -> Mark -> Utterance -> settled topology / derived reading.
- Serve itself over HTTP through `@emsenn/web`, not through bespoke server logic.
- Serve concrete `scripts/<name>` computational surfaces over HTTP in the CGI/FastCGI lineage.
- Expose OpenAPI and MCP as HTTP projections of the same web/script gateway, not as separate ontologies.
- Provide agentic retrieval primitives: search, find, list/browse, open/read, summarize/derive, and iterate.
- Distinguish exact search, lexical search, path/name search, structural search, and graph traversal.
- Return evidence with paths, line/section anchors, frontmatter, links, and enough context to verify the result.
- Report uncertainty and gaps explicitly: "no evidence", "incidental mention", "supporting material", "dedicated concept home", "contradictory evidence", "stale/triage/dev-journal only".
- Detect when a query has no real concept infrastructure even if terms appear somewhere.
- Support human-operated browsing and agent-operated retrieval from the same underlying vault model.
- Support markdown-native concepts: wikilinks, markdown links, backlinks, headings, tags, embeds, aliases, and frontmatter.
- Build a vault graph: document nodes, concept nodes, term nodes, citation/reference nodes, path/category nodes, link edges, evidence edges.
- Provide graph readings, not just graph visualization.
- Support topic/concept home discovery and concept-home absence detection.
- Support content-gap analysis as a first-class reading.
- Support contradiction/paraconsistency rather than pretending retrieved documents form one consistent truth.
- Retain provenance for every derived result.
- Make every retrieval result auditable back to source files and utterances.
- Support incremental, per-request computation so changing scripts/code is not trapped inside stale semantic process state.
- Keep the persistent web process as transport/orchestration, not the semantic knowledge implementation.
- Use existing repo ancestry first: `relating`, `computing`, `gaming`, `web`, and `animating` before inventing anything.
- Avoid importing forbidden sibling/downstream packages for transport shortcuts.
- Support local agent access to "read prior thought on <topic>" with clean, low-noise evidence.
- Be robust against poisoned, adversarial, contradictory, or misleading vault content.
- Make results useful to agents without making humans read raw triage dumps first.
- Provide stable APIs for scripts, HTTP, MCP, and OpenAPI that describe the same capabilities.
- Be able to answer whether a concept exists, where it lives, how strong the evidence is, and what is missing.

## SHOULD

- Provide linked-data/RDF/JSON-LD/SPARQL-style projections where useful.
- Provide SHACL/OWL-like validation projections while preserving richer internal logic.
- Provide multi-hop traversal across notes, backlinks, citations, categories, and concept aliases.
- Provide agentic retrieval loops that can plan, search, inspect, refine, and stop with evidence.
- Provide summaries that cite source spans and name their confidence/gap status.
- Provide concept pages/readings generated from vault evidence without pretending generated text is source evidence.
- Provide "heat" or Laplacian-style measures for content gaps, contradiction density, orphaned nodes, and underdeveloped concepts.
- Provide vault health dashboards for humans: missing frontmatter, broken links, orphan notes, duplicate concepts, thin concepts, stale triage.
- Provide agent-oriented compact outputs and human-oriented rich HTML views from the same readings.
- Provide graph visualizations, backlink panes, local neighborhoods, and concept maps.
- Provide database-like views over frontmatter and derived carriers.
- Provide saved/replayable retrieval traces.
- Provide evaluation fixtures for retrieval quality: recall, factuality, evidence coverage, contradiction handling.
- Provide pluggable indexes without making any index the canonical model.
- Provide import compatibility with Obsidian-style vaults.
- Provide publishable web views of vault content.
- Provide permissions/auth boundaries for private vaults.
- Provide script gateway OpenAPI for all served scripts.
- Provide MCP tools generated from the same script/web descriptions.
- Provide clear "this is just a passing mention" diagnostics.
- Provide recommended next content operations: create concept home, split dev journal, promote triage note, add aliases, add backlinks, add citation.
- Provide stable anchors into markdown sections and line ranges.
- Provide change-aware indexing/caching, but never at the cost of serving stale semantics.
- Provide conflict-aware answers that preserve multiple incompatible claims.
- Provide term normalization, alias sets, slug suggestions, and taxonomy/category alignment.
- Provide citation/reference extraction and CSL/BibTeX-ish projections if the vault contains scholarly material.
- Provide batch scripts for vault audits and endomorphisms.
- Provide rich enough JSON for agents and readable HTML for humans.

## MAY

- Add full-text index engines, RDF stores, or graph DBs as replaceable accelerators.
- Add OWL, SHACL, SPARQL, JSON-LD, Turtle, or Schema.org exports.
- Add Obsidian plugin compatibility or import/export helpers.
- Add Canvas/map-style visual workspaces.
- Add sync/publish/deploy workflows.
- Add background indexing workers if they are cache projections, not the canonical vault model.
- Add LLM-generated introductions, guides, and concept pages once evidence/gap readings are reliable.
- Add multi-agent debate or recursive retrieval strategies for contradiction-heavy topics.
- Add poisoning/adversarial-content tests.
- Add ranking models beyond lexical scores, such as authority, centrality, freshness, contradiction, and gap heat.
- Add UI affordances for editing/promoting content, if write boundaries are explicit.
- Add MCP resources/prompts/tools, but only as HTTP/script gateway projections.
- Add OpenAPI descriptions for every script and reading.
- Add human annotation workflows.
- Add export bundles for other agents or sites.
- Add visual animations/game-like strategy views when the `gaming` model is actually doing work.
