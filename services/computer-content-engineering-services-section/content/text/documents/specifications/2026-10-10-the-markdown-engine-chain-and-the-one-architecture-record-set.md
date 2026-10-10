---
title: "Specification: the markdown engine chain and the one architecture's record set"
description: "Specifies the markdown engine as the last link of a chain from the computer data engine through the content and text engines, owned by one markdown-engineering services section, and the SAS/HLD/LLD record set with hard capability-to-package links."
date-created: 2026-10-10
type: specification
version: 0.1.0
provenance:
  utterances:
    - ni:///sha-256;3CGmR70ynxMDp9ieK5DFM42MOhn3gYZYLWaAfp_cxgs
    - ni:///sha-256;2C3iBzirxZR0ljnUyze3MxuMUe6Mg6K2ml3KrNr2szw
    - ni:///sha-256;aLHwBvEbw3uoOsnByildVZI-WzNeEpgyoXTQhDJKdEc
    - ni:///sha-256;FT7NZPpbNe3nAAg8pVTG3d2LBDe2QP4BqeqjmcDnwpw
    - ni:///sha-256;7dmHrCZPU6X5vZ10Hv9tla3IfmRuNW2Epqpbaek-rDg
    - ni:///sha-256;kgzbG-iswe7UOVMVCacz_72F3ToXPBA6cAxuO6_Zz_8
    - ni:///sha-256;szTgHn7PqUCSExRqKBk0ekK_z6nvLbLEJOPSUowxTE0
    - ni:///sha-256;FKGF2TvFAFVz7ibrBQ4RCHGl0xciMyrRDLPjKme7mIs
    - ni:///sha-256;vWhQO2XVz53o5Qb86jvqjcx2q77Mmp5P4CPpmaMBCKw
    - ni:///sha-256;ySZNrRBoCLXocY3WCY02WK0MqrG8VB2OqPFKllN0TR0
    - ni:///sha-256;qURorQhEyIzsdWPZc9nQz6BEhJH5GnkEzbbrLsFk9vc
    - ni:///sha-256;TzthdxFnkBnij2YNLFSlFoz_A2xZJW5_AuNSOQCm1sw
  requirements:
    - lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/content/requirements/one-markdown-engine-downstream-of-text-content-and-data-engines.json
    - lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/content/requirements/one-categorical-typed-functional-architecture-across-the-ecosystem.json
  builds-on: lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/services/emsenn-services-section/content/text/documents/articles/notes/2026/07/14/2026-07-14-inventory-of-prior-markdown-software-tooling.md
---

## 1. Place and chain

The chain runs from primitive to composed, as the house orders data before code before networking before systems:

1. **Computer data engine** (`computer-data-engineering-services-section`): files, serialized data, cryptographic data.
2. **Computer content engine** (`computer-content-engineering-services-section`, this section): content addresses, content graph, provenance, documents, media, text, typed content.
3. **Computer text engine** (`computer-text-content-engineering-services-section`): character-text transformations.
4. **Markdown engine**: owned by one `markdown-engineering-services-section`, downstream of the text engine. It owns the engine and the underlying source code the Leader names.

Each link imports only the links above it. A consumer of markdown (MetroPlat's codec, the glossary delivery services, the article engine, the publishing lines, the Emacs services) imports the markdown engine and nothing below it for markdown work.

## 2. What the markdown engine owns

From the 2026-07-14 inventory, which found one live codec (MetroPlat's, 2,284 lines, dependency free), eight allowlisted `markdown-*` verbs, a validating hook and about two dozen archived generations: the codec with its round-trip laws; the required-key and forbidden-key validation; the broken-reference repair, orphan detection, genre crosswalk and vault census that only archived tooling computes; and the Semiotic Markdown dialect of the 2026-08-31 specification (frontmatter, wikilinks, transclusions, callouts, inline fields, citations, deterministic slugs).

## 3. Write path

The engine is the only means by which markdown is written. A write through it is checked at write time against the Group's norms (frontmatter keys, links, slugs, form), so the norms stick instead of drifting. A cheaper model class can write notes through the engine, because the engine, and not the model, holds the norms. A senior model does not hand-write `.md` files.

## 4. Consolidation

The scattered markdown code is judged before it moves (rule existing-work-is-judged-before-it-is-discarded): each unit is recorded as elevated into the engine, standing alone with a reason, or superseded. The 2026-07-14 verdicts are the starting judgments.

## 5. The architecture's record set

For each package the architecture holds three records, linked:

- **SAS**: the package's place in the one categorical typed functional architecture, with its capabilities.
- **HLD**: the package's components and the packages it composes.
- **LLD**: the package's types and functions.

Each capability record carries a **hard link** to the one package that owns it. A task names the capability; the record names the package; an implementation uses the package. A capability with no owning package is recorded as a gap, not filled by a parallel mechanism (rule use-and-improve-the-groups-own-software). Divergent implementations found while recording are consequences of the missing link, and are removed by establishing the architecture.

## 6. Open

- Whether the markdown engine's home is a new `markdown-engineering-services-section` under the text engine or the existing codec package's section is not settled by the Leader's words; the words fix the chain and the single owner.
- The categorical structure of the shared architecture (which category, which functors) is research for the science sections and is not derived here.
- Which Obsmetrologia results apply to the write-time check are not derived here.
