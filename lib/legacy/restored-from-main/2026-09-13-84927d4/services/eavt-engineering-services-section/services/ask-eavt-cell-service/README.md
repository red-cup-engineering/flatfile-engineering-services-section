# @red-cup-engineering/ask-eavt-cell-service

Answers one cell question over an eavt row array with the entity's asserted and saturated counts, its settled section, its proof tree, and the closure/regime of the answer's fold.

## Operation

~~~js
export function askEavtCell(request)
~~~

### Parameters

- request (object): A record with rows, an entity, and an optional attribute.

### Returns

object: An EavtCellAnswer record.

### Refusals

- TypeError: When entity is not a nonempty string or rows is not an array.

## Command

ask-eavt-cell reads one JSON value per input line and writes one JSON value per output line.

## Examples

### answers one affirmed cell

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
  ],
  "entity": "x",
  "attribute": "is"
}
~~~

Output:

~~~json
{
  "type": "EavtCellAnswer",
  "entity": "x",
  "attribute": "is",
  "asserted": 1,
  "saturated": 1,
  "settled": {
    "affirmed": [
      {
        "predicate": "is",
        "object": "y"
      }
    ],
    "denied": [],
    "contradicted": []
  },
  "contested": false,
  "proofTree": {
    "root": "x",
    "nodes": {
      "x": {
        "e": "x",
        "a": "is",
        "v": "y",
        "t": 1
      }
    },
    "edges": [],
    "missing": [],
    "cycles": [],
    "depth": 0
  },
  "closure": {
    "saturation": 1,
    "transfer": 1,
    "kappa": 1,
    "regime": "strict"
  },
  "regime": "strict"
}
~~~
