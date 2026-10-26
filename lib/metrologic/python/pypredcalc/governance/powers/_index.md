---
title: "Powers"
type: index
status: open
---

# Powers

Power, privilege, and immunity records — the active-side jural relations of the
Hohfeldian eightfold. Each record names the action it covers, the scope, the duties that
attach (for powers), and the correlate position (liability for powers, no-right for
privileges, disability for immunities).

This directory carries all four active-side jural-relation kinds:

- **Power** — admits the holder to change a normative position; correlate is liability.
- **Privilege** — admits the holder to act without duty; correlate is no-right.
- **Immunity** — protects the holder from having a duty imposed; correlate is disability.

Duties (the constraint side) live separately under [`../duties/`](../duties/).

All records use `type: jural-relation` with a `kind:` sub-classifier per
[`governance-records-use-jural-relation-schema`](../decisions/governance-records-use-jural-relation-schema.md).

## Powers by office

### Steward

| Slug | What |
|---|---|
| [`amend-hard-core`](amend-hard-core.md) | Propose an amendment to C1–C4; initiates novation. |
| [`create-office`](create-office.md) | Add a new office to operative structure O. |
| [`dissolve-office`](dissolve-office.md) | Remove an office from O. |
| [`install-personnel`](install-personnel.md) | Induct a candidate into an office. |
| [`revoke-installation`](revoke-installation.md) | End a candidate's incumbency. |
| [`ratify-governance-rule`](ratify-governance-rule.md) | Confirm a guidelines-tier change without novation. |
| [`immunity-from-non-captain-c-amendment`](immunity-from-non-captain-c-amendment.md) | *Immunity* — only the captain ratifies amendments to C. |

### Executive Officer

| Slug | What |
|---|---|
| [`queue-intent`](queue-intent.md) | Place an intent in the substrate's heartbeat queue. |
| [`dispatch-task-to-office`](dispatch-task-to-office.md) | Assign a ready task to an eligible office. |
| [`route-inbox-inquiry`](route-inbox-inquiry.md) | Classify an inbox inquiry and route it to an office. |
| [`create-triage-note`](create-triage-note.md) | File a triage note for items needing routing. |
| [`close-execution-loop`](close-execution-loop.md) | Close a dispatched task with completion or stall classification. |
| [`read-any-substrate-record`](read-any-substrate-record.md) | *Privilege* — read any substrate record without duty incurred. |

### Corpus Tracker

| Slug | What |
|---|---|
| [`read-any-corpus-entity`](read-any-corpus-entity.md) | *Privilege* — read any predication-categories entity. |
| [`read-any-pypredcalc-source`](read-any-pypredcalc-source.md) | *Privilege* — read any file under `src/`. |
| [`file-realization-gap-task`](file-realization-gap-task.md) | Create a task record naming an unrealized corpus atom. |
| [`run-corpus-binding-audit`](run-corpus-binding-audit.md) | Execute `governance/skills/running-corpus-binding-audit/audit.py` and produce a coverage report. |

### Corpus Reader

| Slug | What |
|---|---|
| [`produce-realization-brief`](produce-realization-brief.md) | Write a realization brief at `work/briefs/`. |

### Developer

| Slug | What |
|---|---|
| [`write-pypredcalc-source`](write-pypredcalc-source.md) | Create or modify files under `src/`. |
| [`create-task-record`](create-task-record.md) | Create a task record for breaking down realization work. |
| [`immunity-from-spec-violating-duty`](immunity-from-spec-violating-duty.md) | *Immunity* — no duty can require code that violates corpus or charter. |

### Test Author

| Slug | What |
|---|---|
| [`write-test-source`](write-test-source.md) | Create or modify files under `tests/`. |
| [`run-test-suite`](run-test-suite.md) | Invoke pytest. (Shared with developer, quality-officer, release-officer.) |

### Quality Officer

| Slug | What |
|---|---|
| [`run-type-check`](run-type-check.md) | Invoke `mypy --strict`. |
| [`run-lint`](run-lint.md) | Invoke `ruff`. |
| [`review-change`](review-change.md) | Read a diff and produce a review verdict. |
| [`request-revision`](request-revision.md) | File a formal revision request gating merge closed. |

### Release Officer

| Slug | What |
|---|---|
| [`bump-version`](bump-version.md) | Update the `version` field in `pyproject.toml`. |
| [`publish-release`](publish-release.md) | Tag and publish a release. |
| [`declare-deprecation`](declare-deprecation.md) | Mark a Stable name deprecated, attach replacement. |
| [`write-changelog-entry`](write-changelog-entry.md) | Append a release entry to `CHANGELOG.md`. |
| [`manage-build-config`](manage-build-config.md) | Edit `pyproject.toml`, `flake.nix`, CI configs. |

### Docs Officer

| Slug | What |
|---|---|
| [`write-prose-document`](write-prose-document.md) | Author prose under `docs/` or `prose/`. |
| [`render-mkdocs`](render-mkdocs.md) | Invoke `mkdocs build --strict`. |
| [`update-readme`](update-readme.md) | Edit `README.md`. |

### Records Officer

| Slug | What |
|---|---|
| [`create-governance-record`](create-governance-record.md) | Create a new file under `governance/`. |
| [`modify-governance-record`](modify-governance-record.md) | Edit frontmatter or body of an existing governance record. |
| [`create-work-record`](create-work-record.md) | Create a new file under `work/`. |
| [`modify-work-record`](modify-work-record.md) | Edit frontmatter or body of an existing work record. |

### Subpackage specialists

All seven specialist offices ([algebra](pypredcalc-algebra-specialist.md),
[predication](pypredcalc-predication-specialist.md),
[combinatorics](pypredcalc-combinatorics-specialist.md),
[topology](pypredcalc-topology-specialist.md),
[lattice](pypredcalc-lattice-specialist.md), [sheaf](pypredcalc-sheaf-specialist.md),
[dynamics](pypredcalc-dynamics-specialist.md)) hold:

- [`write-pypredcalc-source`](write-pypredcalc-source.md), scoped to their subpackage
  via the office's `jurisdiction:` field.
- [`create-task-record`](create-task-record.md) for breaking down their subpackage's
  realization work.
- [`read-any-corpus-entity`](read-any-corpus-entity.md) and
  [`read-any-pypredcalc-source`](read-any-pypredcalc-source.md) as privileges.
- [`immunity-from-spec-violating-duty`](immunity-from-spec-violating-duty.md) as an
  immunity.
