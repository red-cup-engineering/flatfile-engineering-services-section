---
title: "Reading a Filepath as a Proof Term"
description: "A guided, repeatable lesson: take one example path in this corpus, read each segment as a restriction morphism, round-trip it through the relating codec, attach a UDC code as a tag-morphism, and watch a node birth a subnode."
date-created: 2026-06-18
date-modified: 2026-06-18
keywords: ["category-theory", "curry-howard", "directionality", "filepath", "knowledge-organization", "library-science", "posix", "presheaf", "taxonomy", "yoneda-embedding"]
---


By the end of this lesson you will have read one POSIX filepath in this corpus not as a shelf coordinate but as a typed term — a proof of the proposition that is its type. You will trace each directory segment as a single entailment step, confirm the path round-trips through the real `lib/relating` codec, attach a UDC code as a tag rather than a folder, and then watch a node grow a subnode the way the corpus actually grows. Every step is concrete and repeatable; nothing here requires you to invent a path or guess at an API. We work from one example, end to end, and we use only symbols that exist in `lib/relating`.

## What you need

- A checkout of this repository, with `lib/relating/` and `content/` present.
- The ability to read three source files. We will name exact line-level behavior, but you do not need to run anything — every claim below is something you can confirm by opening the file. The three files are:
  - `lib/relating/src/holography/index.mts` — the projection kernel (`Projector<T>`, `restrict`, `entails`, `classify`).
  - `lib/relating/src/codecs/index.mts` — the term ⇄ path codec (`termKey`, `sanitizeSegment`, `address`, `termOf`).
  - `lib/relating/src/codecs/path/projector.mts` — the root of the path lattice (`pathProjector`, `isPathname`, `POSIX_PATHNAME_PATTERN`).

This is a learning-oriented walkthrough. We are not filing real material yet — that is the job of the guides. Here we only *read*, so the steps are safe to repeat as many times as you like.

## Our one example

We will use a single example throughout. It is a node that exists in this corpus right now:

```text
content/library/information/science-knowledge/posix-filepathing-with-curry-howard-directionality-by-yoneda-embedding/
```

For the codec steps, we will also use a deliberately small term so the encoding is legible by eye: the term `creatures/ada`, addressed under a root we will call `/store`. You can substitute any term you like once you have done it once; the small term is chosen only so you can see every character.

Hold both in mind. The big path is the thing we are learning to *read*; the small term is the thing we use to *verify* that reading against the codec.

## Step 1 — Confirm the string is a path at all

Open `lib/relating/src/codecs/path/projector.mts`. The root of the whole lattice is `pathProjector`, defined at the bottom of the file:

```ts
export const pathProjector: Projector<unknown> = define<unknown>({
  type: "path",
  recognize: (resource) => isPathname(resource.path),
});
```

`isPathname` tests the resource's `path` string against `POSIX_PATHNAME_PATTERN`. This is the first and most general proposition in the proof: *this is a path at all*. Our example string is a non-empty pathname with no NUL byte, so `pathProjector.recognize` would return `true` for it. Every restriction we add from here conjoins one more conjunct onto this base. You have just inhabited the root type.

Notice what `pathProjector` does *not* claim: it does not say the path is JSON, or a flatfile, or a topic node. It claims only that the string is a path. That is the point of a root — it is the weakest true proposition, and everything below it strengthens it.

## Step 2 — Read each segment as one restriction morphism

Now read the example path left to right. Each segment is one step in a proof, and each step *entails* the one before it. The kernel makes this literal. Open `lib/relating/src/holography/index.mts` and look at `restrict`:

```ts
export function restrict<T>(parent: Projector<T>, spec: RestrictSpec<T>): Projector<T> {
  const local = spec.recognize;
  return {
    type: spec.type,
    parent,
    recognize: (resource) => parent.recognize(resource) && (local ? local(resource) : true),
    ...
  };
}
```

The line that matters is `recognize: (resource) => parent.recognize(resource) && (local ? local(resource) : true)`. A child's recognition is the parent's recognition *conjoined* with one new local conjunct. The module comment states the entailment this enforces in plain words: "you cannot be a `json` without being a `flatfile` (Curry–Howard directionality)." Descending one segment is taking one step in a proof, and the step only holds if every step above it already held.

Read our example path that way, segment by segment, each line a conjunct added to the line above:

| Segment | The proposition this step adds | Entails |
| --- | --- | --- |
| `content` | "this lives in the knowledge store" | (root: is a path) |
| `library` | "...and it is promoted, organized material" | `content` |
| `information` | "...and it is about information" | `library` |
| `science-knowledge` | "...and specifically the science of knowledge" | `information` |
| `posix-filepathing-with-curry-howard-directionality-by-yoneda-embedding` | "...and specifically this topic" | `science-knowledge` |

This is exactly the shape of `restrict`: each row is a child whose `recognize` is the previous row's `recognize ∧ local`. The deepest row is the most specific true proposition about the node. You cannot truthfully be at `science-knowledge` without being at `information`, and you cannot be at `information` without being in `library`. The arrows are directed, and they only point one way.

The chain you just read by hand is what `entails` computes mechanically. From the same file:

```ts
export function entails<T>(projector: Projector<T>): Projector<T>[] {
  const chain: Projector<T>[] = [];
  let p: Projector<T> | null = projector;
  while (p) { chain.push(p); p = p.parent; }
  return chain;
}
```

`entails(projector)` walks `parent` edges back to the root and returns the whole list — the full proof, from your deepest conclusion back to the premise that it is a path at all. The five rows of the table above *are* `entails` for our node, written out.

## Step 3 — Confirm the path round-trips through the codec

A path is only a proof if it is genuinely the encoding of a term — if the term and the path are inverse to each other. This is the canonicality test, and it is decided by the codec in `lib/relating/src/codecs/index.mts`, not by taste. We verify it now with the small term `creatures/ada` so every character is visible.

First, `termKey` canonicalizes the term to a stable string. A plain string passes through unchanged (unless it collides with a reserved prefix), so `termKey("creatures")` is `"creatures"` and `termKey("ada")` is `"ada"`.

Second, `sanitizeSegment` encodes each key as one filesystem-safe POSIX segment. It keeps ASCII alphanumerics and `._-`, and percent-escapes everything else as `~hh` hex. Our two segments are already safe, so `sanitizeSegment("creatures")` is `"creatures"` and `sanitizeSegment("ada")` is `"ada"`.

Third, `address(root, term, type)` places the term in the tree and appends a leaf file named for the last segment with the type as its extension. Read the helper it calls, `addressOfSegments`:

```ts
const addressOfSegments = (root, segments, type) => {
  if (segments.length === 0) throw new TypeError("address: the empty term has no address");
  const leaf = segments[segments.length - 1]!;
  return join(root, ...segments, `${leaf}.${typeOf(type)}`);
};
```

So `address("/store", "creatures/ada", "md")` produces:

```text
/store/creatures/ada/ada.md
```

The leaf `ada.md` is named after the last segment `ada`. This is not decoration — it is how the directory portion and the file portion stay in agreement.

Fourth, run it backward. `termOf(root, path)` strips the root, drops the leaf filename, desanitizes the remaining segments, and joins with `/`:

```ts
export function termOf(root: string, path: string): string {
  return termSegmentsOfPath(root, path).join("/");
}
```

`termOf("/store", "/store/creatures/ada/ada.md")` returns `"creatures/ada"` — exactly the term we started with. The round-trip closed.

That closure is the canonicality test. A path is canonical *iff* it is `address(root, term, type)` for some term and `termOf` recovers that term. Our example node passes because each segment is a topical claim that `sanitizeSegment` leaves intact and `termOf` recovers. A path with a provenance segment — an ingestion date, a source-repo name — would not be the encoding of any topical claim, so it would not be the term, so the path would prove nothing the document is about. The codec is why "a path name is a claim about what the material is about" is enforced and not merely advised.

## Step 4 — Read off the deepest recognizing projector

We have the entailment chain (Step 2) and the round-trip (Step 3). The last piece of the kernel ties them together: `classify`. From `holography/index.mts`:

```ts
export function classify<T>(resource, catalog) {
  let best = null, bestDepth = -1;
  for (const projector of catalog) {
    if (!projector.recognize(resource)) continue;
    const depth = entails(projector).length;
    if (depth > bestDepth) { best = projector; bestDepth = depth; }
  }
  return best;
}
```

`classify` returns the *deepest* projector in the catalog that recognizes the resource — the longest entailment chain that still holds. That is the most-specific true proposition about the resource. The real codec catalog instantiates the lattice `path → object → attribute → file → flatfile → serialization → json → jsonl → eavt`; you can confirm the bottom of it in `lib/relating/src/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt/index.mts`, where `eavtProjector` is built by `restrict(jsonlProjector, …)` — one more conjunct on the chain.

The lesson to carry away: classifying a resource is not choosing a bucket. It is asking "how deep can I go and still be telling the truth?" The answer is the deepest projector that recognizes it, and that answer is forced by the conjunction in `restrict`, not selected by preference. Note too that the leaf carries the *least*, not the most: the `eavt` node's comment says it "carries no polarity and no operation" — it is `[entity, attribute, value, time]` evidence only. The deeper you go in the codec lattice, the less you are permitted to assert. The path you traversed bounds what you may express.

## Step 5 — Attach a UDC code as a tag-morphism, not a directory

Now the move that most often goes wrong, and the one this whole reading exists to get right. Our node is about the science of knowledge organization; a plausible Universal Decimal Classification code is `025.4` (subject analysis / classification in library science). The object-oriented instinct is to make a directory `025.4/` and file the node under it.

Do not. A classification code is a *morphism the document offers* — an arrow asserting "I claim membership in this scheme's class." An arrow is not a container. Recall from Step 2 that a directory segment is a `restrict` conjunct that *narrows the proposition the path proves*; a UDC code does not narrow what the path is about, it *attests* a parallel claim the document makes about itself. Those are different kinds of thing, and the codec proves it: a `025.4/` segment is not the encoding of the topical term, so it would break the Step 3 round-trip.

So the code lives in frontmatter, as a tag. Concretely, in this node's frontmatter you would record:

```yaml
tags: [..., udc-025-4]
```

The tag is a kebab-case slug for a topic the file actually asserts, exactly as `content/library/README.md` defines tags: "kebab-case slugs for key topics actually mentioned in the file, not redundant restatements of the path." A facet already spent as a path segment is never repeated as a tag, and a classification code never becomes a path segment.

There is a real division of labor worth stating, because it is easy to blur. Library of Congress *topical headings* may govern the path — they shape the broad-level claim, which is why `information/science-knowledge/` reads the way it does. But the classification *code* is a tag. The heading is a statement about what the material is about (so it belongs to the term); the code is an attestation the document makes about itself (so it belongs to the hom-set, as an arrow). Collapse the code into a directory and you have re-committed the object-oriented error in its most seductive form — and broken the round-trip in the process.

You have now attached an arrow to the node without disturbing the proof its path encodes. That is the whole discipline in one move.

## Step 6 — Watch a node birth a subnode

A node is not a leaf in a fixed tree. It is a representable presheaf, `𝒴(A) = Hom(−, A)`, that grows its own subtree as its content earns one. We will watch our example node grow one branch, the way the corpus actually grows.

Look at our node as it stands. It carries a topical *claim* (its directory name) and a `docs/` body — including the very tutorial you are reading. Suppose its treatment of the term ⇄ path codec accumulates "enough internal structure to deserve its own branch," in the README's phrasing — say enough reference material and worked examples that the codec deserves to be its own topic rather than a section. The recursive shape `content/library/README.md` fixes is `topic/content/topic/content`. So the node births a subnode by opening its `library/` and placing a narrower `topic/` inside it:

```text
posix-filepathing-with-curry-howard-directionality-by-yoneda-embedding/
  library/
    term-path-codec/
      term-path-codec.md
```

Read this categorically. The parent node is `𝒴(A)`; the new child `term-path-codec/` is `𝒴(B)` together with a morphism `B → A` — the same `parent` edge that `restrict` carries, one level up from code into the archive tree. The child's claim entails the parent's: a node about the term-path codec is, *a fortiori*, a node about reading filepaths as proof terms. You did not invent depth; you let the fiber earn it. The README is explicit: "Continue the pattern whenever a narrower topic has enough internal structure to deserve its own branch." You add the `library/` branch only when a narrower topic has earned it.

One more detail completes the picture, and it is pure Yoneda. Because an object *is* its arrows-in, evidence is recorded at the codomain: "the run is recorded only at the codomain, so a node's log accumulates its arrows-in." A morphism is logged at its destination, never at its origin. So as other material comes to reference `term-path-codec/`, those incoming arrows accumulate *at* the child node — its log becomes its hom-set `Hom(−, B)` materialized. The node's history is literally the bundle of arrows into it, exactly as the embedding requires.

You have now watched the unfolding: a claim (the directory name), a body (`library/`), and a narrower claim born inside it when, and only when, its content earned the branch.

## What you did

Working from one example path, you:

1. recognized the string as a path at all, inhabiting the root type `pathProjector`;
2. read each directory segment as one `restrict` conjunct — a directed entailment edge, where the child's recognition is the parent's `∧ local`;
3. confirmed the path round-trips through the real codec (`termKey → sanitizeSegment → address`, inverted by `termOf`), which is the canonicality test;
4. read off `classify` as "the deepest projector that still recognizes the resource" — the most-specific true proposition, with the leaf carrying the least;
5. attached a UDC code as a frontmatter tag-morphism rather than a directory, keeping the round-trip intact; and
6. watched the node birth a subnode by opening `library/` for a narrower claim its fiber had earned, with incoming arrows logged at the codomain.

The tree on disk never changed its shape, but you stopped reading it as the truth. You read the morphisms instead. The filepath is the Curry–Howard proof coordinate; the directory tree, read correctly, was always recording it.

## Where to go next

- For the *why* behind each move here — the Yoneda embedding, the Curry–Howard(-Lambek-Hoare) correspondence, and the holography lattice in full — read the sibling [`docs/explanations`](../explanations).
- For filing *real* material — placing a new node at its canonical path, routing intake through `triage/` and `archive/` into `library/`, resolving filename collisions — read the [`docs/guides`](../guides).
- For the exact symbol surface — `termKey`, `sanitizeSegment`, `address`, `termOf`, `pathProjector`, `POSIX_PATHNAME_PATTERN`, and the holography API — keep the [`docs/references`](../references) open.
