# @red-cup-engineering/project-json-record-key-service

Projects a JSON record onto an explicit finite set of top-level keys, composing

## Operation

~~~js
export function projectJsonRecordKey(request)
~~~

### Parameters

- request (object): A record with `record` (the JSON object to project) and `keys` (a nonempty array of nonempty key strings to keep).

### Returns

object: The projected JSON object: an ordinary object carrying only the requested keys present on `record`, with their values from `record`.

### Refusals

- TypeError: When record is not a JSON object, or keys is not a nonempty array of nonempty strings.

## Command

project-json-record-key reads one JSON value per input line and writes one JSON value per output line.

## Examples

### projects two of three keys

Input:

~~~json
{
  "record": {
    "a": 1,
    "b": 2,
    "c": 3
  },
  "keys": [
    "a",
    "c"
  ]
}
~~~

Output:

~~~json
{
  "a": 1,
  "c": 3
}
~~~
