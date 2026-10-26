import { createServer } from "node:http";

import { queryWitnessJournalDocumentsByCategory, recordWitnessJournalBatch, resolveWitnessJournalDocument } from "./witness-journal-document.mjs";

const json = (value, init = {}) => Response.json(value, init);

export function createWitnessJournalDocumentHandler({ custody, categoryIndex, manifest = "witness-journal-document.v1" }) {
  const binding = Object.freeze({ custody, categoryIndex });
  return async function handle(request) {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, manifest });
      if (request.method === "GET" && url.pathname === "/.well-known/agent-card.json") {
        return json({ name: "Witness Journal Document Provider", version: "1.0.0", protocolVersion: "http-json-v1", url: new URL("/", url).href, skills: [{ id: "witness-journal-document", name: "Witness Journal document custody" }] });
      }
      if (request.method === "POST" && url.pathname === "/record-batch") {
        const body = await request.json();
        return json(await recordWitnessJournalBatch({ batch: body?.batch, ...binding }));
      }
      if (request.method === "GET" && url.pathname === "/documents") {
        return json(await queryWitnessJournalDocumentsByCategory(url.searchParams.get("category"), { predicate: url.searchParams.get("predicate") ?? undefined, ...binding }));
      }
      if (request.method === "GET" && url.pathname === "/document") {
        return json(await resolveWitnessJournalDocument(url.searchParams.get("ni"), binding));
      }
      return json({ error: "not-found" }, { status: 404 });
    } catch (error) {
      return json({ error: error?.message ?? String(error) }, { status: error instanceof TypeError ? 422 : 500 });
    }
  };
}

export async function startWitnessJournalDocumentHttpProvider(binding, options = {}) {
  const handler = createWitnessJournalDocumentHandler(binding);
  const server = createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const origin = `http://${request.headers.host}`;
      const body = chunks.length === 0 ? undefined : Buffer.concat(chunks);
      const webRequest = new Request(new URL(request.url, origin), {
        method: request.method,
        headers: request.headers,
        body,
        ...(body === undefined ? {} : { duplex: "half" }),
      });
      const webResponse = await handler(webRequest);
      response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
      response.end(Buffer.from(await webResponse.arrayBuffer()));
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: error?.message ?? String(error) }));
    }
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(Number(options.port ?? 0), options.host ?? "127.0.0.1", accept);
  });
  const address = server.address();
  const baseUrl = `http://${address.address}:${address.port}`;
  return Object.freeze({
    baseUrl,
    agentCardUrl: `${baseUrl}/.well-known/agent-card.json`,
    binding,
    async close() { await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept())); },
  });
}
