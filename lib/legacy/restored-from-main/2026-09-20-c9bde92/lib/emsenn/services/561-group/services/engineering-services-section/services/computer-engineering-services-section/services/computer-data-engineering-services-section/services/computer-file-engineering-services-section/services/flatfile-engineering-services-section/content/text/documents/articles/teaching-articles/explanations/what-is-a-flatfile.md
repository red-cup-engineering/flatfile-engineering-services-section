---
title: "What is a flatfile?"
description: "A general explanation of the flatfile classification: a file, narrowed to a regular file, narrowed again to one whose bytes carry no NUL -- the plain spine every text codec in this tree stands on."
date-created: 2026-08-30
type: explanation
name: what-is-a-flatfile
keywords:
  - flatfile
  - regular-file
  - binarity
---


A **flatfile** is a NUL-free regular file. That definition sounds
narrow, but it says exactly what makes a file safely readable as text:
nothing in it is the null byte that binary formats use as a
terminator or a structural marker.

## The spine: file, then regular file, then flatfile

Getting to "flatfile" is three questions asked in order, each one only
meaningful once the one before it is answered:

1. **File.** Does anything exist at this path, and what kind of thing
   is it -- an ordinary file, a directory, a symbolic link, something
   else? This is the broadest question, and it can be answered for
   any path at all.
2. **Regular file.** Narrow to the case where the path names an
   ordinary file, as opposed to a directory or a link or a device.
   Only a regular file can be read as a flat sequence of bytes in the
   first place.
3. **Flatfile.** Narrow once more: read the regular file's leading
   bytes and check whether any of them is NUL. If none is, the file is
   a flatfile -- safe to decode as text. If one is found, the file is
   binary instead.

Each step only makes sense once the step before it has been answered,
which is why this reads as a spine rather than three independent
checks: a directory is never asked whether it is NUL-free, because it
never passed the regular-file question to begin with.

## Why the definition stays this narrow

A flatfile system in the broader engineering sense -- one that stores
its data as plain files instead of behind a database process -- relies
on exactly this property holding for its files: a JSON document, a
Markdown note, a YAML manifest, a CSV table are all flatfiles by this
definition, because they are all regular files whose bytes are ordinary
text. The narrow, byte-level definition is what makes the broader claim
("any tool that can open a file can read the data") actually true: it
is true because the bytes contain no NUL, not because of the file's
extension or its declared format.

## What this explanation leaves out

Classifying a path this way is a plain question with a plain yes/no/
which-kind answer. A separate, richer reading exists in this tree that
lifts a path's POSIX attributes -- type, size, mode, modification
time -- into a charged, evidence-bearing category rather than a plain
value. That charged, holographic reading of a file belongs to the
stat/observation row of this decomposition, not to the flatfile row
described here.
