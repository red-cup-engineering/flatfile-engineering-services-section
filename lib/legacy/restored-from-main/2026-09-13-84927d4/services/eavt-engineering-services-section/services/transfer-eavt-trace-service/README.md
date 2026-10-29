# @red-cup-engineering/transfer-eavt-trace-service

Computes the Δ nucleus (Fix(Δ), the transfer-stable converse-closed sub-fiber) for one subject over an {e,a,v,t} trace, composing

## Operation

~~~js
export function transferEavtTrace(request)
~~~

### Parameters

- request (object): A record with `subject` (the entity to accumulate), `rows` (an {e,a,v,t} row array, any order, may span multiple subjects), and optional `converse` (a `{opposingPredicate: positivePredicate}` map; its mere presence, even `{}`, activates the legacy redirect lane).

### Returns

object: `{entity, fiber}` — exactly eavt's own settled-fiber shape.

### Refusals

- TypeError: When subject is not a non-empty string, rows is not an array, or a row is non-conformant.

## Command

transfer-eavt-trace reads one JSON value per input line and writes one JSON value per output line.

## Examples

### accumulates a subject's rows into a settled fiber

Input:

~~~json
{
  "subject": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
  "rows": [
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "located-in",
      "v": "riverbed",
      "t": 3
    }
  ]
}
~~~

Output:

~~~json
{
  "entity": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
  "fiber": [
    {
      "predicate": "located-in",
      "object": "riverbed",
      "value": {
        "pos": 1,
        "neg": 0,
        "evidence": [
          [
            "ni:///sha-256;kWcuNZTy0UUoePLp0sLrYzk13OCIIeu90NFN997w5js"
          ],
          []
        ]
      }
    }
  ]
}
~~~
