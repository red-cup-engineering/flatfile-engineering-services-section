# @red-cup-engineering/count-eavt-contested-cells-service

Counts the entities and cells an eavt row array settles as contradicted.

## Operation

~~~js
export function countEavtContestedCells(request)
~~~

### Parameters

- request (object): A record with rows.

### Returns

object: An EavtContestedCellsCount record.

### Refusals

- TypeError: When rows is not an array.

## Command

count-eavt-contested-cells reads one JSON value per input line and writes one JSON value per output line.

## Examples

### uncontested rows

Input:

~~~json
{
  "rows": [
    {
      "e": "x",
      "a": "is",
      "v": "y",
      "t": 1
    }
  ]
}
~~~

Output:

~~~json
{
  "type": "EavtContestedCellsCount",
  "entities": 1,
  "contestedEntities": 0,
  "contestedCells": 0,
  "contested": []
}
~~~
