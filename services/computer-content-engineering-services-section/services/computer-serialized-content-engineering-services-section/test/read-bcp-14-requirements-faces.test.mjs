import assert from "node:assert/strict";
import test from "node:test";
import { readBcp14Requirements, operation } from "../scripts/read-bcp-14-requirements.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a sentence with exactly one key word yields one requirement",
    "input": {
      "text": "A work record MUST carry its modality as the pair of closures that settle it."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "MUST",
          "subject": "A work record",
          "predicate": "carry",
          "object": "its modality as the pair of closures that settle it",
          "text": "A work record MUST carry its modality as the pair of closures that settle it",
          "line": 1
        }
      ],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a semicolon splits one text into two requirements",
    "input": {
      "text": "Systems SHOULD NOT hold state; they MAY cache."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "SHOULD NOT",
          "subject": "Systems",
          "predicate": "hold",
          "object": "state",
          "text": "Systems SHOULD NOT hold state",
          "line": 1
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "MAY",
          "subject": "they",
          "predicate": "cache",
          "object": "",
          "text": "they MAY cache",
          "line": 1
        }
      ],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "no key word yields nothing",
    "input": {
      "text": "Documentation exists for onboarding."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a key word as the last token is refused with no-predicate",
    "input": {
      "text": "Retries are OPTIONAL"
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [],
      "refusals": [
        {
          "line": 1,
          "text": "Retries are OPTIONAL",
          "reason": "no-predicate"
        }
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a lowercase key word is never matched",
    "input": {
      "text": "You must not skip this step."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "more than one key word is refused",
    "input": {
      "text": "Clients MUST validate input and SHOULD log errors."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [],
      "refusals": [
        {
          "line": 1,
          "text": "Clients MUST validate input and SHOULD log errors",
          "reason": "more-than-one-key-word"
        }
      ]
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "trailing punctuation is stripped from the predicate",
    "input": {
      "text": "Clients MUST retry!"
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "MUST",
          "subject": "Clients",
          "predicate": "retry",
          "object": "",
          "text": "Clients MUST retry",
          "line": 1
        }
      ],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a key word at the end of a soft-wrapped line yields one requirement, not a refusal",
    "input": {
      "text": "A record produced by the service MUST\nbe empty when no work order applies."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "MUST",
          "subject": "A record produced by the service",
          "predicate": "be",
          "object": "empty when no work order applies",
          "text": "A record produced by the service MUST be empty when no work order applies",
          "line": 1
        }
      ],
      "refusals": []
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "all eleven forces, spread across tracked lines",
    "input": {
      "text": "The gateway SHALL forward requests to the upstream service.\nThe gateway SHALL NOT retry a request more than three times.\nA signature is REQUIRED before settlement.\nCompression is RECOMMENDED for large payloads.\nSynchronous polling is NOT RECOMMENDED for high-throughput consumers.\nCaching is OPTIONAL for read replicas.\nClients SHOULD retry with backoff.\nA password MUST NOT be logged in plaintext."
    },
    "output": {
      "type": "Bcp14RequirementSet",
      "version": 1,
      "requirements": [
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "SHALL",
          "subject": "The gateway",
          "predicate": "forward",
          "object": "requests to the upstream service",
          "text": "The gateway SHALL forward requests to the upstream service",
          "line": 1
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "SHALL NOT",
          "subject": "The gateway",
          "predicate": "retry",
          "object": "a request more than three times",
          "text": "The gateway SHALL NOT retry a request more than three times",
          "line": 2
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "REQUIRED",
          "subject": "A signature is",
          "predicate": "before",
          "object": "settlement",
          "text": "A signature is REQUIRED before settlement",
          "line": 3
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "RECOMMENDED",
          "subject": "Compression is",
          "predicate": "for",
          "object": "large payloads",
          "text": "Compression is RECOMMENDED for large payloads",
          "line": 4
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "NOT RECOMMENDED",
          "subject": "Synchronous polling is",
          "predicate": "for",
          "object": "high-throughput consumers",
          "text": "Synchronous polling is NOT RECOMMENDED for high-throughput consumers",
          "line": 5
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "OPTIONAL",
          "subject": "Caching is",
          "predicate": "for",
          "object": "read replicas",
          "text": "Caching is OPTIONAL for read replicas",
          "line": 6
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "SHOULD",
          "subject": "Clients",
          "predicate": "retry",
          "object": "with backoff",
          "text": "Clients SHOULD retry with backoff",
          "line": 7
        },
        {
          "type": "Bcp14Requirement",
          "version": 1,
          "force": "MUST NOT",
          "subject": "A password",
          "predicate": "be",
          "object": "logged in plaintext",
          "text": "A password MUST NOT be logged in plaintext",
          "line": 8
        }
      ],
      "refusals": []
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await readBcp14Requirements(example.input);
    assert.deepEqual(importedOutput, example.output);
    const declaredOutput = await operation.operation(example.input);
    assert.deepEqual(declaredOutput, example.output);
    assert.deepEqual(declaredOutput, importedOutput);
  });
}
