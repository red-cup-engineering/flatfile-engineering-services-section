# @red-cup-engineering/form-cloudevent-service

Forms one CloudEvent 1.0 record from caller-owned attributes without minting anything.

## Operation

~~~js
export function formCloudEvent(request)
~~~

### Parameters

- request (object): A record with id, source, type, optional context attributes, data, and extensions.

### Returns

object: A CloudEvent record.

### Refusals

- TypeError: When id, source, or type is missing, or specversion is not 1.0.

## Command

form-cloudevent reads one JSON value per input line and writes one JSON value per output line.

## Examples

### forms a minimal event

Input:

~~~json
{
  "id": "a-1",
  "source": "urn:example:src",
  "type": "com.example.made"
}
~~~

Output:

~~~json
{
  "specversion": "1.0",
  "id": "a-1",
  "source": "urn:example:src",
  "type": "com.example.made"
}
~~~
