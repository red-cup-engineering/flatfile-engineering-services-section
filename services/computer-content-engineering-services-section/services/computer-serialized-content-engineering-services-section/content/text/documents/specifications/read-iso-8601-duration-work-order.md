# read-iso-8601-duration
## Requirements
- `exact-seconds`: The operation returns `{seconds}`, the exact number of seconds an ISO 8601 duration of weeks, days, hours, minutes and seconds denotes, counting a week as 604800 seconds, a day as 86400, an hour as 3600 and a minute as 60.
- `designator-forms`: The operation reads the `PnW` form and the `PnDTnHnMnS` form with any of its designators omitted, including a time part alone (`PT15M`) and a decimal fraction (`.` or `,`) on the smallest unit only.
- `canonical-echo`: The operation also returns `canonical`, the duration restated as the house writes it: `P`, then whole days as `nD`, then `T` and the hours, minutes and seconds left as `nH`, `nM` and `nS` with each zero part omitted, and `PT0S` for no duration.
## Prohibitions
- `no-calendar-units`: The operation must refuse (throw `RangeError`) a duration naming years or months, whose length in seconds depends on the calendar it is read against.
- `no-malformed-duration`: The operation must refuse (throw `TypeError`) any input whose `duration` is not one ISO 8601 duration of the forms it reads.
## Laws
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | AGENTS.md | Applies to every house reading of an ISO 8601 duration. | A duration is read in one place; the persona notes, audio and narration readers that each parse their own migrate onto this operation.
## Standards
- `iso-8601-durations` | ISO | 8601-1:2019 | https://www.iso.org/standard/70907.html | Applies to the duration grammar this operation reads. | Durations are written PnW or PnYnMnDTnHnMnS, a time part follows T, and only the smallest unit may carry a decimal fraction.
- `node-esm-operation` | Node.js | v24 | https://nodejs.org/docs/latest-v24.x/api/esm.html | Applies to the operation module. | The operation is one ECMAScript module exporting one function.
## Open questions
none
## Package
```json
{"version":2,"topic":"iso-8601-duration","packageName":"@red-cup-engineering/iso-8601-duration-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operations
```json
{"name":"read-iso-8601-duration","module":"src/read-iso-8601-duration.mjs","exportName":"readIso8601Duration","description":"Reads one ISO 8601 duration of weeks, days, hours, minutes and seconds as its exact length in seconds and its canonical form.","inputSchema":{"type":"object","required":["duration"],"properties":{"duration":{"type":"string","minLength":2}},"additionalProperties":false},"outputSchema":{"type":"object","required":["seconds","canonical"],"properties":{"seconds":{"type":"number","minimum":0},"canonical":{"type":"string","pattern":"^P(?:\\d+D)?(?:T(?:\\d+H)?(?:\\d+M)?(?:\\d+(?:\\.\\d+)?S)?)?$"}},"additionalProperties":false}}
```
## Examples
```json name="a quarter hour" operation=read-iso-8601-duration
{"input":{"duration":"PT15M"},"output":{"seconds":900,"canonical":"PT15M"}}
```
```json name="days and a time part" operation=read-iso-8601-duration
{"input":{"duration":"P1DT2H30M"},"output":{"seconds":95400,"canonical":"P1DT2H30M"}}
```
```json name="weeks" operation=read-iso-8601-duration
{"input":{"duration":"P2W"},"output":{"seconds":1209600,"canonical":"P14D"}}
```
```json name="ninety minutes restated" operation=read-iso-8601-duration
{"input":{"duration":"PT90M"},"output":{"seconds":5400,"canonical":"PT1H30M"}}
```
```json name="a decimal fraction on the smallest unit" operation=read-iso-8601-duration
{"input":{"duration":"PT1.5H"},"output":{"seconds":5400,"canonical":"PT1H30M"}}
```
```json name="no duration" operation=read-iso-8601-duration
{"input":{"duration":"PT0S"},"output":{"seconds":0,"canonical":"PT0S"}}
```
## Traceability
- `exact-seconds` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-durations`, `node-esm-operation`
- `designator-forms` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-durations`
- `canonical-echo` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-durations`
- `no-calendar-units` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-durations`, `primitives-exist-once`
- `no-malformed-duration` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `iso-8601-durations`
