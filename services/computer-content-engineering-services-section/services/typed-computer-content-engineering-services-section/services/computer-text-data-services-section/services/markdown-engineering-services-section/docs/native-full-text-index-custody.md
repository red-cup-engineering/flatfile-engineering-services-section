# Native full-text-index custody

The native `openFullTextIndex` API keeps the existing semantic term-index journal,
revision identities, ranking, `root`, in-memory mode and the absent-file locator's
`<file>.journal` mapping. It does not open or convert an earlier SQLite index.

If `file` names any existing carrier, or its `-wal`, `-shm` or `-journal` sidecar
exists, opening refuses before creating or opening the native journal. This also
applies to empty files, opaque files, directories and dangling symlinks. A populated
native journal is not evidence that an unresolved original has been received.
An explicit native `root` can still be opened without supplying a legacy locator.

The previous adapter, SQL reader, complete original assay and original manifest
are retained byte-for-byte under
`scripts/historical-full-text-index-receiving/original`. Its private package and
the explicit `test:legacy-sql` script preserve that historical assay separately
from native runtime exports and default tests. The historical reader and its old
automatic-conversion behavior have not been newly qualified, and native tests do
not execute SQL or claim that historical custody has been received.

No original stored bytes are deleted, renamed, rewritten or treated as empty by
this change. The default native assay conserves its original three native test
bodies and adds refusal, unchanged-frontier and byte-conservation controls.

## Current owner reconciliation

The `original` directory retains the exact Data dc74bc00 PR97 manifest, automatic
adapter, caller-injected FTS rowid importer and complete original test, including
its newly added empty-index assertion. The preceding PR96 reader, original assay
and Python SQL fixture remain byte-exact in `prior-18f32f3a`; the earlier node SQL
reader and full assay remain byte-exact in `prior-76c7539f`. Each generation has a
separately named historical test command. None is enrolled in native tests or the
parent package's published files. The private package remains in repository custody.

PR97 correctly removes the current importer's direct dependency on the retired
public Computer reader export, but its startup still opens a native index before
receiving the historical source and silently starts empty if no reader is supplied.
Native startup instead refuses every unresolved carrier and sidecar before any
callback or journal write. Passing a `readLegacySqlite` callback does not authorize
implicit historical conversion. The default assay adds callback non-execution,
original-byte conservation and unchanged-native-frontier controls for that case.

The historical private package retains the earlier generation's
`computer-system-engine` dependency because that preserved PR96 source names its
former public reader export. This earlier interface is absent from selected
Computer513b. Historical receiving of either real SQL generation remains
unqualified; the PR97 header/mock assay is preserved as an adapter fixture, not
proof of database conversion. No historical SQL or Python fixture has been run.
