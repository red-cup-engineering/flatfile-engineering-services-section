# @red-cup-engineering/filter-eavt-rows-by-consent-service

Filters eavt rows to the entities whose latest consent row admits the audience, withholding the rest and reporting only their count.

## Operation

~~~js
export function filterEavtRowsByConsent(request)
~~~

### Parameters

- request (object): A record with rows and an audience name.

### Returns

object: An EavtConsentFilteredRows record.

### Refusals

- TypeError: When rows is not an array or audience is not a non-empty string.

## Command

filter-eavt-rows-by-consent reads one JSON value per input line and writes one JSON value per output line.

## Examples

### public and withheld

Input:

~~~json
{
  "rows": [
    {
      "e": "x",
      "a": "consent",
      "v": "public",
      "t": 1
    },
    {
      "e": "x",
      "a": "is",
      "v": "y",
      "t": 2
    },
    {
      "e": "q",
      "a": "is",
      "v": "r",
      "t": 2
    }
  ],
  "audience": "anyone"
}
~~~

Output:

~~~json
{
  "type": "EavtConsentFilteredRows",
  "audience": "anyone",
  "admitted": 2,
  "withheld": 1,
  "withheldEntities": 1,
  "rows": [
    {
      "e": "x",
      "a": "consent",
      "v": "public",
      "t": 1
    },
    {
      "e": "x",
      "a": "is",
      "v": "y",
      "t": 2
    }
  ]
}
~~~
