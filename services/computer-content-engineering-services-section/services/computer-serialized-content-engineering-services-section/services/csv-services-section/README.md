# CSV services section

Comma-separated values as RFC 4180 defines them. `decodeCsvRows` reads CSV
text into rows of fields, `decodeCsv` into records keyed by the header row, and
`encodeCsv` writes records back out with every field quoted. Quoted fields may
hold commas, doubled quotes and line breaks, as county report exports do.

```js
import { decodeCsv, encodeCsv } from "@red-cup-engineering/csv-services-section/csv-codec";

const records = decodeCsv(text);
await writeFile("sellers.csv", encodeCsv(records));
```
