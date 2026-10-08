# Immutable Content Custody Service

Retains and retrieves exact bytes under a SHA-256 ni URI.

This package owns content-addressing and verification. It does not own a cloud
provider, filesystem, database, or network transport. Callers inject an object
store with `get(key)` and `putCurrent(key, value)` operations:

```js
const custody = createImmutableContentCustody({ store, maximumBytes: 8 * 1024 * 1024 });
await custody.put({ ni, bytes, mediaType: "application/json" });
const retained = await custody.get(ni);
```

Cloudflare R2 wiring belongs to
`@red-cup-engineering/cloudflare-r2-services-section/immutable-content-custody`.
The default maximum remains 8 MiB; larger bounded artifact classes must opt in
with an explicit positive safe-integer `maximumBytes`.
