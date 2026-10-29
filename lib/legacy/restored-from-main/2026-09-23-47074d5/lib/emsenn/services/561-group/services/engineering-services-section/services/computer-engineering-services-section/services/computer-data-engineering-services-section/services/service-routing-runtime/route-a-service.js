#!/usr/bin/env node
import { spawnSync } from "node:child_process"; import { dirname, join } from "node:path"; import { fileURLToPath } from "node:url";
const service=process.argv[2];
if(process.env.EMSENN_EO_SERVICE_CONTRACT!=="executive-office-discovers-descendant-services"||!service?.startsWith("knowledge-services-section/")){process.stderr.write("refused: this optional knowledge-service discovery route requires the Executive Office discovery envelope\n");process.exit(1)}
const next=service.split("/")[1]; const routes={"glossary-services-section":"../services/glossary-services-section/src/route-a-service.js","identifier-services-section":"../services/identifier-services-section/src/route-a-service.js"};
if(!routes[next]){process.stderr.write("refused: knowledge service is not offered\n");process.exit(1)}
const r=spawnSync(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),routes[next]),service,...process.argv.slice(3)],{stdio:"inherit",env:{...process.env,EMSENN_SECTION_CONTRACT:"knowledge-services-section-contracts-descendants"}});process.exit(r.status??1);
