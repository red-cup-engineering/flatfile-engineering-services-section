# Unchanged FeltOS strategy receiving fixture

These are test-only snapshots of actual owner inputs, not live definitions or replacement validators. No `$ref` or `$id` was rewritten. In particular, strategy's `operation.schema.json` remains relative, and the Actor fixture is the complete actual export, not a stub.

- FeltOS `specifications/strategy.schema.json`: commit `a26d942a0b7389402f5f8e1c6450c6a0e0072c9f`, Git blob `eda25f5f85b1ee28d22c83c0a1de643726d9aaa2` (unchanged on main when received).
- Actor: JSON serialization of `actorSchema` from FeltOS `src/specification-declarations.mjs`, source Git blob `40a57b3287672b16c1345579d5555ed5244e0c8d`, same commit/main. All fields and definitions preserved.
- Computer Engineering `services/computer-systems-engineering-services-section/apps/computer-system-engine/specifications/operation.schema.json` and `sen-term.schema.json`: integrated commit `d201db33f35c5f9b6e49cad8501dbb84e3259d53`; exact blobs `9a150b225fff1c8ffb8df97011f6707e19903cea` and `7f5e53d7799b5afcc7e47812ac3439ac7e946e4f`.
- Data `TySchema` and `TmSchema`: JSON serialization of the actual exports from `src/semiotic-expression-notation/notation/schema.mjs` (blob `a6d4ded97e3db3527ef1e5757ffecc0f2b804f60`) and its `forms.mjs` input (blob `e730b56d7bfee8c52df5bf55f566b2ba3aadaa05`), both matching Data `4c54b59da692e9e84ae5f3798ee8a613b790eb3c`.
- `strategy-value.json`: a local value whose operation is produced by the genuine Computer Code `admitOperation` and Data `defineType` providers in the retained source receiving fixture. It carries a canonical SEN identity and both actual string descriptors. No operation was executed. This static structural test does not assert operation/type provenance or grant authority to execute effects.

Source repositories: https://github.com/red-cup-engineering/feltos, https://github.com/red-cup-engineering/computer-engineering-services-section, https://github.com/red-cup-engineering/computer-data-engineering-services-section.

Keep snapshots tied to the identified owner source. Future live schema changes require renewed owner receiving, not editing fixture grammars to make tests pass.
