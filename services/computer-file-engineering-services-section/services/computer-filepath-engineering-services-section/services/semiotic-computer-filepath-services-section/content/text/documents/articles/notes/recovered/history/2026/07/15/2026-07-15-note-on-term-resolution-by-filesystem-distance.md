---
date-created: 2026-07-15
date-updated: 2026-07-15
declared-by: executive-assistant
description: emsenn's rule for how a term resolves — the closest match by filesystem distance, neighbours or upward only, never downward — recorded verbatim, with what it means, what it forbids, and the day the recall-term script implemented its exact inverse while citing emsenn as the source.
in-service-of: lib/emsenn
kind: note
status: settled
tags:
  - resolution
  - glossary
  - scope
  - recall-term
  - fa
---

# Term resolution is by filesystem distance, upward only

## The rule

emsenn, verbatim (2026-07-15):

> the resolver is supposed to use the closest match, by filesystem distance
> (neighbors or upward only, never downward)

That is the whole rule. Everything below is what follows from it.

## What it is

This is **lexical scope resolution** — the same algorithm every well-designed
module system uses (Rust crates, OCaml functors, SML modules). A reference is
resolved from a *place*. The nearest binding visible from that place wins.
Bindings farther out are shadowed. Bindings *inside* a sub-scope are not visible
at all until the caller names them.

It is not new to the corpus. Part 6 of the archived `theoretical-overview.md`
("The slug-resolution algorithm") already specified it, in emsenn's own
correction of an over-design, and already named it for what it is:

> This is the standard scope-resolution algorithm of any well-designed module
> system (Rust crates, OCaml functors, SML modules), specialized to the
> predication-categorical setting …
>
> Sub-theories nested inside $T$ are *not* in $T$'s search path. A reference to
> an atom in a sub-theory must qualify it explicitly. This enforces the
> encapsulation discipline.

Its live location:
`lib/emsenn/src/archive/2026-07-05-561-group/working/hacking/composting/library/library/prose/rough/inbox/friction/theoretical-overview.md`,
Part 6.

## The three consequences

**1. Resolution has an asking point.** "What does this term mean?" is not a
well-formed question. "What does this term mean *from here*?" is. A resolver with
no asking point — one that starts at the git root and searches the whole tree —
is not implementing this rule at all, whatever its sort order.

**2. Shadowing is correct structure, not drift.** A term legitimately has many
homes at many depths. A nearer definition overriding an outer one is the entire
purpose of scope resolution; it is the mechanism by which a unit can mean
something specific by a general word without renaming it. Flattening those into
one file deletes the override.

**3. Never downward means never downward.** Nothing below the asking point, and
nothing off in a branch that is not an ancestor, resolves. Asking from the repo
root therefore sees only the root's own glossary and reports absence for
everything held inside a unit. That is the right answer, not a gap to paper over.
A caller reaching into a sub-scope must name it — that qualification *is* the
encapsulation discipline.

## What this corrects: "one term, one home, one answer"

法 says one term, one home, one answer. The phrase is sound and its uses in the
record are sound — in the markdown-tooling inventory it names two genuinely
contradictory rules live at once (one linter forbidding `[@key]` while another
treats it as canonical; `author` forbidden and `authors` required). Two answers
to one question, both law. That is the failure it points at.

A session on 2026-07-14 read the phrase as a **global file-uniqueness
constraint** — "a repo whose whole resolver premise is one term, one home, one
answer" — and it is not that.

The distinction, stated once so it stops being re-derived:

> **"One answer" is a property of the resolution from a given asking point. It
> is not a count of files in the tree.**

Under scope resolution a term may have twelve homes and still answer uniquely to
every caller. What 法 forbids is *ambiguity* — two bindings that a single asking
point sees at the same distance with different content, or two rules claiming to
govern the same question. What it does not forbid, and what it in fact requires,
is depth.

## How the mechanism failed, and what that teaches

Until 2026-07-15 the `/recall-term` script implemented the exact inverse of the
rule on every axis. It had no asking point (it started at `git rev-parse
--show-toplevel` and `find`-ed the entire tree downward, which is the direction
the rule forbids). It sorted `depth ASC`, so the *outermost* definition beat
every nearer one — closest-to-root rather than closest-to-asker. And it printed
any second definition as `⊤ drift … Consolidate the rest`, i.e. it identified
correct scope structure as a defect and instructed its caller to destroy it.

The instructive part is not the inversion. It is the armor. The script's header
read:

> SEARCH ORDER IS THE OPERATOR'S EXACT SPEC. Do not add heuristics, do not
> substitute repo-inferred conventions

and the skill said the same: *"the script's order is the operator's ruling."*
Dated 2026-07-14. No note recorded any such ruling — not in that day's notes, not
in the turn-by-turn transcript. A session heard something, transcribed it wrong,
attributed it to emsenn, and told every future session it was forbidden to check.
It stood for a day and would have stood indefinitely, because the only thing that
could have overturned it was emsenn noticing in conversation — which is exactly
the cost the objective function exists to remove.

Under 循名責實 — holding the deed against the name — **an unpublished rule cannot
be checked at all.** There was no name to hold the deed against. The armor was
load-bearing precisely because the record was empty.

So the settlement is not "sessions should transcribe more carefully." It is:

- **The rule lives in this note.** The script answers to the note. If they
  disagree, the note wins and the script is the defect. That sentence is in the
  script's header and the skill's body.
- **A rule attributed to emsenn with no note behind it is not law**, whatever the
  comment above it claims. It is a session's guess wearing emsenn's name, and the
  correct response to finding one is to check the record, not to obey the armor.
- **The mechanism enforces the rule by construction.** The rewritten script tests
  exact paths on an ancestor chain and has no downward search in it. "Never
  downward" is not a discipline the script observes; it is a thing the script
  cannot do. That is the 勢 form of the fix — position, not willpower — and it is
  what makes it survive a forgetful, rushed, or adversarial incumbent (明法).

## Where it is implemented

`.claude/skills/recall-term/` — `SKILL.md` and `scripts/recall-term.mjs`.

Verified 2026-07-15 against the live tree, four cases: resolution from a deep
asking point; upward walk past an intermediate scope that does not define the
term; shadowing of an outer definition by a nearer one; and absence at the root
scope reporting the out-of-scope definition without resolving to it.
