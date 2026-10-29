# @red-cup-engineering/count-eavt-cell-dispositions-service

Counts the witnesses and acknowledgers of one entity's asserted cells, read from rows about each claim row's content id.

## Operation

~~~js
export function countEavtCellDispositions(request)
~~~

### Parameters

- request (object): A record with rows, an entity, and an optional attribute.

### Returns

object: An EavtCellDispositions record.

### Refusals

- TypeError: When entity is not a non-empty string or rows is not an array.

## Command

count-eavt-cell-dispositions reads one JSON value per input line and writes one JSON value per output line.

## Examples

### one acknowledged claim

Input:

~~~json
{
  "rows": [
    {
      "e": "x",
      "a": "is",
      "v": "y",
      "t": 1
    },
    {
      "e": "ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ",
      "a": "acknowledged-by",
      "v": "actor:c",
      "t": 2
    }
  ],
  "entity": "x",
  "attribute": "is"
}
~~~

Output:

~~~json
{
  "type": "EavtCellDispositions",
  "entity": "x",
  "attribute": "is",
  "asserted": 1,
  "wit": 1,
  "ack": 1,
  "claims": [
    {
      "id": "ni:///sha-256;riMYpPPJFxRLlaFoFrKKcKhkVhKHQl_UnjXjcrQQ7NQ",
      "predicate": "is",
      "object": "y",
      "witnesses": [],
      "acknowledgers": [
        "actor:c"
      ]
    }
  ]
}
~~~
