# @red-cup-engineering/count-eavt-trace-contested-cells-service

Reads one eavt trace file and counts the cells it settles as contradicted, or reports the trace absent.

## Operation

~~~js
export function countEavtTraceContestedCells(request)
~~~

### Parameters

- request (object): A record with the trace file path.

### Returns

object: An EavtTraceContestedCellsCount record, or an EavtTraceAbsent datum when the file does not exist.

### Refusals

- TypeError: When trace is not a non-empty string.

## Command

count-eavt-trace-contested-cells reads one JSON value per input line and writes one JSON value per output line.

## Examples

### absent trace

Input:

~~~json
{
  "trace": "/nonexistent/561-group/none.eavt"
}
~~~

Output:

~~~json
{
  "type": "EavtTraceAbsent",
  "trace": "/nonexistent/561-group/none.eavt"
}
~~~
