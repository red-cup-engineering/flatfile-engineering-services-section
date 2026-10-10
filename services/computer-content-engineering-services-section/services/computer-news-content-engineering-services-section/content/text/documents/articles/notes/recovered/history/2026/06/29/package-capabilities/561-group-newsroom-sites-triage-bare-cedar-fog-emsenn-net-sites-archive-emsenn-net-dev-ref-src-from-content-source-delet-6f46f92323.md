---
title: "Capability note: @561-group/newsroom"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom"
---

# Capability note: @561-group/newsroom

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: An autonomous agentic newswire: research -> write -> edit -> publish, over a website-server claim store. A masthead parameterizes an org of LLM agents (assignment desk, reporters, fact/copy/standards desks, editor-in-chief) that coordinate through the shared four-valued store (a blackboard); status gates make publishing governance-by-algebra. The model writes prose; we structure it ourselves with syntaxis (segmentation) and koine (quality). Topic-agnostic — a config is a newswire for any keywords; Filum Agentium (the agentic web) is the example.
- Capability tags from manifest/source hints: `application`, `service`, `cli`, `agent-harness`, `workspace-analysis`, `content-production`, `operations`, `knowledge`, `persistence`
- Bins: `newsroom`
- Export subpaths: `.`, `./package.json`, `./*`
- Scripts: `test`, `newsroom`
- Dependencies: `@561-group/semantic-site-server`, `@561-group/panini`, `@561-group/fowler`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom/README.md: An **autonomous newsroom**: research → write → edit → publish, run by a swarm of LLM agents over a [`website-server`](../website-server) claim store. Give it a **masthead** (keywords + sources + voices + domain) and it produces a cited, linked-data newswire for *any* topic. The example, `filum-agentium`, covers *the agentic web*; the software is topic-agnostic.
- Source hints: `bin/newsroom.mjs`, `examples/filum-agentium/seed.mjs`, `src/index.mjs`, `src/llm.mjs`, `src/newsroom.mjs`, `src/org.mjs`, `src/prose.mjs`, `src/sources/arxiv.mjs`, `src/sources/backoff.mjs`, `src/sources/index.mjs`, `src/sources/rss.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`, `agent-harness`, `content-production`, `operations`, `knowledge`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
