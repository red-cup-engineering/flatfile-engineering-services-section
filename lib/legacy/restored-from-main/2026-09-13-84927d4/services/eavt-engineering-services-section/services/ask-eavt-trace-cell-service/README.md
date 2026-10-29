# @red-cup-engineering/ask-eavt-trace-cell-service

Reads one eavt trace file and answers a cell question over its rows, or reports the trace absent.

## Operation

~~~js
export function askEavtTraceCell(request)
~~~

### Parameters

- request (object): A record with the trace file path, an entity, and an optional attribute.

### Returns

object: An EavtTraceCellAnswer record, or an EavtTraceAbsent datum when the file does not exist.

### Refusals

- TypeError: When trace or entity is not a non-empty string.

## Command

ask-eavt-trace-cell reads one JSON value per input line and writes one JSON value per output line.

## Examples

### absent trace

Input:

~~~json
{
  "trace": "/nonexistent/561-group/none.eavt",
  "entity": "x"
}
~~~

Output:

~~~json
{
  "type": "EavtTraceAbsent",
  "trace": "/nonexistent/561-group/none.eavt"
}
~~~
