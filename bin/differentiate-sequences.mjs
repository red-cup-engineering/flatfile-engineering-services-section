#!/usr/bin/env node
import { main } from "@red-cup-engineering/data-services/differentiate-sequences";
import { runJsonCommand } from "@red-cup-engineering/data-services/run-json-command";

await runJsonCommand(import.meta.url, main);
