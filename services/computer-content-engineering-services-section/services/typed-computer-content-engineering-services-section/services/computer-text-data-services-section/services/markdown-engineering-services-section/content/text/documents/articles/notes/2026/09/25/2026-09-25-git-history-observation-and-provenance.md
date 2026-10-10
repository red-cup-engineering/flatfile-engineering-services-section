---
title: "Git History Observation and Provenance"
description: "How Git commit graphs, tags, and external artifact references can supply bounded provenance evidence without treating mutable refs as semantic truth."
date-created: 2026-09-25
status: current
part-of: computer-data-engineering-services-section
provenance: "Supersedes the 2025-12-20 and 2026-03-06 semiotic-git archives."
date-modified: 2026-09-28
---

# Git History Observation and Provenance

Git supplies content-addressed objects, commit-parent edges, and mutable refs.
Those are useful provenance evidence, but they are not by themselves a semantic universe, a release policy, or an audit of every interaction.
The code-development engine's `git/observation` exposes bounded observations of that evidence; this note states the interpretation boundary needed when those observations are used in engineering or research.

## Carrier and observation

The carrier is one observed repository graph: immutable object IDs and their commit-parent relations, plus the values of refs at the time they are read.
A commit identifies its parent commits and a tree; refs name objects but can be moved or deleted.
An annotated tag is an object with a tagger statement and a target, but its `refs/tags/*` name is still mutable.

`observeGitHistory` retrieves bounded commit, ref, and tree evidence, and `observeGitPathHistory` one path's commits and dates.
`observeGitTagReachability` retrieves the annotated tag objects currently visible, their target commits, local branch reachability counts, and the commits in a selected revision that no currently visible annotated tag reaches.
This is an observation of the selected repository, not a claim that the tagged set is necessary, permanent, signed, published, or authorized.

A release assertion needs additional evidence: the chosen tag object ID, any signature verification, the remote or publication at which it was observed, and the release policy that makes that tag meaningful.
A query or automated decision likewise needs its own witness record; Git preserves commit history, not every command that a person or agent ran against it.

## Semiotic reading

The Git commit DAG can be read as a provenance graph.
A commit records a specific content state, parent witnesses, and author/committer declarations; branches and merges make alternate and reconciled histories observable.
For a bounded graph, ancestry-closed sets of commits are valid query results and can be useful fragments for semiotic analysis.

That reading is an interpretation, not a proof that Git implements an Interactive Semioverse.
In particular, no Git operation makes all ancestry-closed sets into semantic elements, records a category of query derivations, or turns annotated tags into an intrinsic modal closure.
Tip-removal, merge-base, ref filters, and metadata filters are distinct graph operations whose algebraic properties must be established for the particular carrier and policy; they must not be asserted from their Git names.

This leaves a precise, usable connection: persist an observation or witness alongside the semantic operation that consumed it, retain object IDs and ref values as its Git evidence, and state the external policy that interprets them.
The semantic system then owns its meanings and derivations instead of embedding them in a version-control adapter.

## Large artifacts

Large binaries are not automatically external artifacts, nor automatically Git LFS material.
Choose a carrier from retrieval, retention, integrity, replication, and hosting requirements.
When the repository contains a reference to an external artifact, retain its content digest, stable locator, and the evidence needed to retrieve it.
When Git LFS is used, the engine's `observeGitLfsState` reports the endpoint git-lfs resolves apart from the objects held in this machine's LFS store; a local cache count is not publication evidence.

The legacy advice to keep repositories text-first is therefore a possible operational policy, not a property of Git or a universal replacement for binary provenance.

## Legacy disposition

The legacy archive contributed three concerns: provenance-oriented reading of the commit graph, a tag/reachability measurement command, and advice about large artifacts.
The current note retains the useful interpretation while rejecting the unsupported claims about a canonical modality, stable fragment, and complete provenance fibration.
The code-development engine retains the actual tag/reachability observation, and its existing LFS-state observer retains the operational distinction needed for large objects.
No `semiotic-git` protocol or downstream system survives.
