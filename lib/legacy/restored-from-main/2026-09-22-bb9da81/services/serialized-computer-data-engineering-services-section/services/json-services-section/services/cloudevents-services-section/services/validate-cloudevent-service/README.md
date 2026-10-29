# @red-cup-engineering/validate-cloudevent-service

Validates one candidate CloudEvent against the CloudEvents 1.0.2 published schema and its three unstated rules.

## Operation

~~~js
export function validateCloudEvent(request)
~~~

### Parameters

- request (object): A record carrying the candidate event.

### Returns

object: A CloudEventValidation record.

### Refusals

- TypeError: When the event is not an object.

## Command

validate-cloudevent reads one JSON value per input line and writes one JSON value per output line.

## Examples

### a conformant event validates

Input:

~~~json
{
  "event": {
    "specversion": "1.0",
    "id": "a-1",
    "source": "urn:example:src",
    "type": "com.example.made"
  }
}
~~~

Output:

~~~json
{
  "type": "CloudEventValidation",
  "ok": true,
  "violations": [],
  "event": {
    "specversion": "1.0",
    "id": "a-1",
    "source": "urn:example:src",
    "type": "com.example.made"
  }
}
~~~

### a missing id is the schema's required rule

Input:

~~~json
{
  "event": {
    "specversion": "1.0",
    "source": "urn:example:src",
    "type": "com.example.made"
  }
}
~~~

Output:

~~~json
{
  "type": "CloudEventValidation",
  "ok": false,
  "violations": [
    {
      "attribute": "id",
      "rule": "required: is required"
    }
  ],
  "event": {
    "specversion": "1.0",
    "source": "urn:example:src",
    "type": "com.example.made"
  }
}
~~~
