# @red-cup-engineering/count-eavt-relation-nerve-service

Computes the vertex and edge counts, components (H0), cycle rank (H1), and Euler characteristic of one relation attribute's bipartite graph over eavt rows.

## Operation

~~~js
export function countEavtRelationNerve(request)
~~~

### Parameters

- request (object): A record with rows and the relation attribute.

### Returns

object: An EavtRelationNerve record.

### Refusals

- TypeError: When rows is not an array or attribute is not a non-empty string.

## Command

count-eavt-relation-nerve reads one JSON value per input line and writes one JSON value per output line.

## Examples

### shared source

Input:

~~~json
{
  "rows": [
    {
      "e": "c1",
      "a": "cites",
      "v": "s1",
      "t": 1
    },
    {
      "e": "c2",
      "a": "cites",
      "v": "s1",
      "t": 2
    }
  ],
  "attribute": "cites"
}
~~~

Output:

~~~json
{
  "type": "EavtRelationNerve",
  "attribute": "cites",
  "vertices": 3,
  "edges": 2,
  "h0": 1,
  "h1": 0,
  "chi": 1
}
~~~
