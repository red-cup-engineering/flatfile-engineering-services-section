# Serialization package source receiving

This restores the authentic `@red-cup-engineering/computer-serialized-content-engineering-services-section`
package, version `0.1.0`, within the existing Computer Data content hierarchy:
`services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section`.
It is distinct from the `@red-cup-engineering/serialized-data-services-section`
umbrella and does not replace that repository or its manifest.

The donor is `emsenn/bare-cedar-fog` commit
`aeedb1e9e671c24986c1b4f5e1ddbe4e4f8fb6f6`, at
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section`.
The restored package carrier comprises five root source modules, one script,
15 HTTP-data modules, all 18 corresponding original tests, the original README,
and the manifest. Other independently owned nested format packages described by
the historical README are outside this restoration.

All donor source, test, and README bytes and Git modes are retained. The manifest
adds the URI dependency actually imported by `src/web-feed.mjs`, using the same
intentional `workspace:*` convention as the existing dependencies. The test command
now also runs the package's original HTTP-data tests. Repository metadata identifies
the receiving Data repository and directory. Package identity and version remain
unchanged; this is source receiving, not registry publication.

The URI supplier used in the feed assay is the existing
`@red-cup-engineering/uri-services-section` package at Data commit
`32a568d27d59b5e1b1b3e34944d19a37d30e905d`, under the sibling
`computer-content-address-engineering-services-section/services/uri-services-section`.
Its manifest blob is `6bbdb47202e458950bc0a67f0a46eddd8b972236` and the used
`src/http-url.mjs` blob is `3faf8fd5ec31511d022dc5be8a16844bbb60a277`.
The assay resolves the real `./http-url` export and `assertHttpUrl` implementation.
It does not qualify the supplier's other exports or its complete dependency graph.

The 44 original package checks pass with this supplier source. Separately, 30
existing HTTP consumer checks pass with these serialization modules, and the
restored HTTP node-server entry imports without starting a server. Tests use local
values and injected responses; these results do not establish a live provider,
installation of the full declared workspace graph, or host activation.
The broader HTTP request-trace and web-application checks remain unqualified:
their separate SignCell provider is absent from this assay.
