# Computer data engineering services section

Computer data is the shared substrate beneath content and systems. Its layout
distinguishes an actual file from the content a file may carry:

- `computer-file-engineering-services-section` owns actual-file effects:
  deterministic reads, writes, searches, and flatfile handling.
- `computer-content-engineering-services-section` owns content meaning and
  format-specific operations. A format does not acquire a separate file-effect
  implementation.
- `cryptographic-computer-data-engineering-services-section` owns cryptographic
  operations over data without redefining a content format or filesystem.
- [Serialized content](services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/) holds format carriers. [JSON](services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section/) contains JSONL, which contains EAVT, which contains Datom. SEAVT has its own RMN semantic contract under EAVT. Follow these links to the direct scripts and their JSON inputs.
- Root `bin/` holds data-wide command operations such as differentiation (over `json-services-section`);
  they are not a second service hierarchy.

Data structures remain only where a generic shape is the capability itself.
When a structure carries a particular content form, its implementation belongs
with that content form instead.

`src/randomization` is a dependency-free data derivation primitive: it
folds seed text into a stable 32-bit value and steps a deterministic numeric
stream. It has no game, simulation, or wall-clock policy.
