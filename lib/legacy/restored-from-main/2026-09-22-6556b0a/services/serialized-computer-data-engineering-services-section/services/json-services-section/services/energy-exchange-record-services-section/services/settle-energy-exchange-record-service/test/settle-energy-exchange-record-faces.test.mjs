import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { settleEnergyExchangeRecord } from "../scripts/settle-energy-exchange-record.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "two witnesses of different kinds agreeing exactly settle at the later asOf",
    "input": {
      "record": {
        "kind": "energy-exchange",
        "period": {
          "start": "2026-08-01T00:00:00Z",
          "end": "2026-08-31T23:59:59Z"
        },
        "commodity": "KWH",
        "quantity": "412.5",
        "from": {
          "id": "urn:example:household-a",
          "role": "producer"
        },
        "to": {
          "id": "urn:example:utility-co",
          "role": "grid"
        },
        "place": {
          "lat": 44.9778,
          "lon": -93.265,
          "utilityId": "urn:example:utility-co"
        },
        "witnesses": [
          {
            "kind": "meter",
            "value": "412.5",
            "source": "urn:example:household-a-inverter-export-2026-08",
            "asOf": "2026-09-01T00:00:00Z"
          },
          {
            "kind": "utility-statement",
            "value": "412.5",
            "source": "https://utility-co.example/statements/2026-08",
            "asOf": "2026-09-03T00:00:00Z"
          }
        ],
        "price": {
          "amount": "0.11",
          "commodity": "USD",
          "perUnit": true
        }
      }
    },
    "output": {
      "id": "ni:///sha-256;hwS8YQPMpxlttQoauP1v-luJHmq1nCNNwZ0tmy5zvVA",
      "kind": "energy-exchange",
      "period": {
        "start": "2026-08-01T00:00:00Z",
        "end": "2026-08-31T23:59:59Z"
      },
      "commodity": "KWH",
      "quantity": "412.5",
      "from": {
        "id": "urn:example:household-a",
        "role": "producer"
      },
      "to": {
        "id": "urn:example:utility-co",
        "role": "grid"
      },
      "place": {
        "lat": 44.9778,
        "lon": -93.265,
        "utilityId": "urn:example:utility-co"
      },
      "witnesses": [
        {
          "kind": "meter",
          "value": "412.5",
          "source": "urn:example:household-a-inverter-export-2026-08",
          "asOf": "2026-09-01T00:00:00Z"
        },
        {
          "kind": "utility-statement",
          "value": "412.5",
          "source": "https://utility-co.example/statements/2026-08",
          "asOf": "2026-09-03T00:00:00Z"
        }
      ],
      "price": {
        "amount": "0.11",
        "commodity": "USD",
        "perUnit": true
      },
      "settlement": {
        "status": "settled",
        "mismatch": null,
        "settledAt": "2026-09-03T00:00:00Z"
      }
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "two witnesses of different kinds disagreeing beyond tolerance is a declared mismatch",
    "input": {
      "record": {
        "kind": "energy-exchange",
        "period": {
          "start": "2026-08-01T00:00:00Z",
          "end": "2026-08-31T23:59:59Z"
        },
        "commodity": "KWH",
        "quantity": "398.0",
        "from": {
          "id": "urn:example:household-b",
          "role": "producer"
        },
        "to": {
          "id": "urn:example:utility-co",
          "role": "grid"
        },
        "place": {
          "lat": 46.7296,
          "lon": -94.6859,
          "utilityId": "urn:example:utility-co"
        },
        "witnesses": [
          {
            "kind": "meter",
            "value": "398.0",
            "source": "urn:example:household-b-inverter-export-2026-08",
            "asOf": "2026-09-01T00:00:00Z"
          },
          {
            "kind": "utility-statement",
            "value": "371.2",
            "source": "https://utility-co.example/statements/2026-08-household-b",
            "asOf": "2026-09-03T00:00:00Z"
          }
        ]
      }
    },
    "output": {
      "id": "ni:///sha-256;gz8u7e88tr7_hNiadFM0bw6aRlyH4DFIoMxHF_UQ8uQ",
      "kind": "energy-exchange",
      "period": {
        "start": "2026-08-01T00:00:00Z",
        "end": "2026-08-31T23:59:59Z"
      },
      "commodity": "KWH",
      "quantity": "398.0",
      "from": {
        "id": "urn:example:household-b",
        "role": "producer"
      },
      "to": {
        "id": "urn:example:utility-co",
        "role": "grid"
      },
      "place": {
        "lat": 46.7296,
        "lon": -94.6859,
        "utilityId": "urn:example:utility-co"
      },
      "witnesses": [
        {
          "kind": "meter",
          "value": "398.0",
          "source": "urn:example:household-b-inverter-export-2026-08",
          "asOf": "2026-09-01T00:00:00Z"
        },
        {
          "kind": "utility-statement",
          "value": "371.2",
          "source": "https://utility-co.example/statements/2026-08-household-b",
          "asOf": "2026-09-03T00:00:00Z"
        }
      ],
      "settlement": {
        "status": "mismatch",
        "mismatch": "26.8",
        "settledAt": null
      }
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "two witnesses of the same kind leave the record posted",
    "input": {
      "record": {
        "kind": "energy-exchange",
        "period": {
          "start": "2026-08-01T00:00:00Z",
          "end": "2026-08-31T23:59:59Z"
        },
        "commodity": "PROPANE_GAL",
        "quantity": "150",
        "from": {
          "id": "did:example:propane-co",
          "role": "producer"
        },
        "to": {
          "id": "urn:example:household-c",
          "role": "consumer"
        },
        "place": {
          "lat": 47.455,
          "lon": -95.5822
        },
        "witnesses": [
          {
            "kind": "bank-row",
            "value": "150",
            "source": "urn:example:household-c-bank-statement-2026-08",
            "asOf": "2026-08-15T00:00:00Z"
          },
          {
            "kind": "bank-row",
            "value": "150",
            "source": "urn:example:household-c-bank-statement-2026-08-corrected",
            "asOf": "2026-08-20T00:00:00Z"
          }
        ],
        "price": {
          "amount": "2.79",
          "commodity": "USD",
          "perUnit": true
        }
      }
    },
    "output": {
      "id": "ni:///sha-256;D-eG2-lgLhOhlncUb8vOXNtsPf0aLH6A-Qws8CTLdcE",
      "kind": "energy-exchange",
      "period": {
        "start": "2026-08-01T00:00:00Z",
        "end": "2026-08-31T23:59:59Z"
      },
      "commodity": "PROPANE_GAL",
      "quantity": "150",
      "from": {
        "id": "did:example:propane-co",
        "role": "producer"
      },
      "to": {
        "id": "urn:example:household-c",
        "role": "consumer"
      },
      "place": {
        "lat": 47.455,
        "lon": -95.5822
      },
      "witnesses": [
        {
          "kind": "bank-row",
          "value": "150",
          "source": "urn:example:household-c-bank-statement-2026-08",
          "asOf": "2026-08-15T00:00:00Z"
        },
        {
          "kind": "bank-row",
          "value": "150",
          "source": "urn:example:household-c-bank-statement-2026-08-corrected",
          "asOf": "2026-08-20T00:00:00Z"
        }
      ],
      "price": {
        "amount": "2.79",
        "commodity": "USD",
        "perUnit": true
      },
      "settlement": {
        "status": "posted",
        "mismatch": null,
        "settledAt": null
      }
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await settleEnergyExchangeRecord(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/settle-energy-exchange-record.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
