# Typed resource classification

This Data capability classifies an addressed resource (`path`, `content`) by recognition and restriction. The runtime is `src/index.mjs`; its shared `Resource`, `Projector`, `RootSpec`, and `RestrictSpec` declarations are beside it. The module imports nothing and requires no compilation.

`restrict` conjoins parent and child recognition, preserving the entailment chain. `classifyAt` chooses the recognizing ancestor shared by sibling views; unrelated families do not participate in each other's dispatch. `transcode` composes representation reads and writes only across comparable content-commitment corners. Formats define their own projectors where their carriers live.

Run `node --test test/*.test.mjs` to demonstrate entailment, classification, representation conversion, and closure-grade behavior over actual resource values.
