# Communicating with the existing SVG codec

Use `@red-cup-engineering/xml-file-codec-service` to render source-linked relations as vector graphics and readable XML markup.

## Use the existing package

The package already exports:

- `@red-cup-engineering/xml-file-codec-service`: XML construction and serialization
- `@red-cup-engineering/xml-file-codec-service/svg`: placed relational graphs through `projectSvg`; shapes, profiles, charge attributes, and `svgProjector`
- `@red-cup-engineering/xml-file-codec-service/svg/radial`: deterministic radial rendering through `projectRadial`, its existing scientific adapters, and `radialProjector`

After building the package with its declared dependencies, run `node examples/communicate-svg.mjs > communication.svg`. The example writes an SVG value to stdout. Choose the existing delivery and receiving service separately.

## What an actor can communicate

Provide a finite `SvgDataform`: dimensions, optional title/description, already placed nodes, and edges. Each node carries `e`, optional `a` and `v`, a human label, group, geometry, and the existing `ChargeCarrier`. Each edge carries `from`, `to`, optional `kind`, geometry, and charge. Layout is deliberately outside `projectSvg`; reuse an existing layout owner or supply explicit boxes.

The interactive profile emits entity/attribute/value and relation coordinates as data attributes, alongside labels, source references, and charge attributes. Thus a human can inspect the rendered diagram while a model or a receiver designed for this vocabulary can inspect its XML. The rendering does not establish the truth or authority of the represented claim. The existing Science charge types remain with their source owner; do not relabel them from color or a simplified boolean.

Use ordinary extension keys such as `source-url` and `source-revision` in `node.data` for verified provenance. The example does not introduce a new message schema. When full original data or normative source bytes matter, retain those source bytes and their identity under the existing owning carrier. Display text, an SVG source link, and a complete source record are different things.

## Preservation and trust boundaries

- Same input ordering and options produce deterministic serialization. Generic `projectSvg` does not canonical-sort arbitrary node arrays or extension-object keys; do not equate semantically equivalent inputs with byte-identical SVG.
- The SVG and radial projectors have recognition and writing, but no `read` implementation. There is no implemented lossless SVG-to-source roundtrip here. A diagram is not an authenticated transport receipt or native message admission.
- XML text and attribute escaping is supplied by the existing XML writer. The API still expects trusted, bounded, well-formed input. It does not validate finite geometry, URL scheme policy, receiver permissions, all XML character constraints, or arbitrary untrusted SVG.
- In 0.1.2, `node.data` is written after core `data-e`, `data-a`, `data-v`, and `data-focus`; avoid extension keys `e`, `a`, `v`, and `focus`, which can override those coordinates. Charge attributes are applied last. The current API does not reject these collisions.
- The interactive profile permits anchors. Its lint only recognizes an SVG-looking substring. It is not a sanitizer or an XML/schema validator.

## Profiles are different communication contracts

`svgInteractiveProfile` retains extension and charge attributes and permits links. Use only with a receiver allowed to accept the supplied links and data.

The currently named `rfc7996Profile` sets `permitsDataAttributes: false`: all node and edge `data-*` attributes are suppressed, including source coordinates, focus metadata, extension fields, and charge attributes. It also suppresses anchors. Its colored defaults and font list also remain. Its lint checks four regex patterns; it is not complete RFC 7996 validation and even non-SVG text can pass it. Do not describe output as RFC-conformant, fully static-safe, or lossless on that basis. The normative RFC 7996 compact schema and its monochrome/font constraints need a distinct owner-accepted conformance implementation and tests before such a claim. Source: https://www.rfc-editor.org/rfc/rfc7996.html

Because the static profile discards source coordinates, charge, and extension fields, it cannot replace the interactive profile when those fields are the communication. Retain the original semantic carrier; do not silently drop it to satisfy a display profile.

## Keep Koios' deterministic fingerprint separate

The Koios publication's `src/fingerprint.mts` preserves deterministic geometric SVGs and their JSON/PNG companions. Its article-fact normalization is delegated to `@red-cup-engineering/organizing-a-content-mill`. The inspected source is [Koios fingerprint.mts](https://github.com/emsenn/koios-news/blob/2f77e3f53125f439ea86c30a15c95f7834509872/src/fingerprint.mts), as pinned by the Causeway consumer.

Its 32-by-8 lattice samples 256 bits from the UTF-8 bytes of `hash + newline + serialization`, so it reaches only the first 32 ASCII hexadecimal characters of the hash. It does not carry the serialization and should not be advertised as a lossless message encoding. The separate JSON is the data-bearing companion. Keep the SVG's current bytes and meaning intact when adding generated article or Open Graph art.

## Check a receiving integration

Use `test/svg-communication-contract.test.mjs` to characterize deterministic bytes, escaped source coordinates, charge attributes, profile differences, and the public radial import. These tests do not establish a lossless decoder, arbitrary-SVG safety, or RFC conformance.

Before using SVG for an actor exchange, choose the required profile and verify that the real receiver interprets its intended source identity, relation coordinates, and charge. Keep source records available when the chosen display profile drops fields. Extend this existing codec and its owning contracts if the receiver requires a lossless decoder or a standards-conformant static projection.

Source baseline: `@red-cup-engineering/xml-file-codec-service` 0.1.2 at Computer Data Services commit `d94eb5c6a842dbf5a55c72604259a5fe3010e258`, inspected 2026-10-06. This guide includes the profile-gating correction in this change; installed and published versions may differ.
