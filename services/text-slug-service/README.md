# text-slug-service

Shared transformation recovered from the machine snapshot at `5097f47e2664bb30fa016b6a21dd0fcfc457f906`, source `lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-text-content-engineering-services-section/src/slugify-text.mjs`. It has no snapshot or external package dependency.

Preserves three distinct transformations: ordinary ASCII title slugs with NFKD decomposition, case-sensitive identifier slugs retaining dot/underscore/hyphen, and heading anchors retaining slash. These are not interchangeable identity or language normalization rules.

Registry publication and snapshot consumer retirement remain unfinished.

Packed archives installed in a plain npm consumer without a snapshot resolver preserved distinct slug transformations and the actual Hive client `titlePermlink` generation. The client retained its 90 protocol checks after migration. Complete client installation and deployed consumption remain unfinished.
