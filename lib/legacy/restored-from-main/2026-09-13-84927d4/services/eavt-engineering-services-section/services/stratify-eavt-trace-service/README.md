# @red-cup-engineering/stratify-eavt-trace-service

Derives the braided-tower three-level reading of one subject over an {e,a,v,t} trace, composing

## Operation

~~~js
export function stratifyEavtTrace(request)
~~~

### Parameters

- request (object): A record with `subject` (the entity to stratify), `rows` (an {e,a,v,t} row array, any order, the whole trace, not pre-filtered), and optional `retract` (passed to saturation) and `converse` (passed to transfer) exactly as eavt's own fold/settle accept them.

### Returns

object: `{entity, asserted, saturated, settled, closure}` — asserted (Level 0), saturated (Level 1), settled (Level 2, eavt's own fold shape), and closure (the fold-pass counts, their max, and the derived regime name).

### Refusals

- TypeError: When subject is not a non-empty string, rows is not an array, or a row is non-conformant.

## Command

stratify-eavt-trace reads one JSON value per input line and writes one JSON value per output line.

## Examples

### stratifies a subject whose earlier assertion was retracted

Input:

~~~json
{
  "subject": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
  "rows": [
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "named",
      "v": "pebble",
      "t": 1
    },
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "named",
      "v": null,
      "t": 2
    },
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
  "asserted": [
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "named",
      "v": "pebble",
      "t": 1
    },
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "named",
      "v": null,
      "t": 2
    },
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "located-in",
      "v": "riverbed",
      "t": 3
    }
  ],
  "saturated": [
    {
      "e": "thing:svF9u9YqF4Wyk8E9PRg2Wt0vynXiyfZJLlCtZ8QyUQ8",
      "a": "located-in",
      "v": "riverbed",
      "t": 3
    }
  ],
  "settled": {
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
  },
  "closure": {
    "saturation": 1,
    "transfer": 1,
    "kappa": 1,
    "regime": "strict"
  }
}
~~~
