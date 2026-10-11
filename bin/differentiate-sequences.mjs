#!/usr/bin/env node
import { main } from "@red-cup-engineering/json-services-section/differentiate-sequences";
import { runJsonCommand } from "@red-cup-engineering/computer-data-engineering-services-section/run-json-command";

await runJsonCommand(import.meta.url, main);
