import { startWitnessJournalDocumentHttpProvider } from "./http-provider.mjs";

function inMemoryBinding() {
  const objects = new Map();
  const categories = new Map();
  const custody = Object.freeze({
    async put({ ni, bytes, mediaType }) {
      objects.set(ni, { bytes: Buffer.from(bytes), mediaType });
      return Object.freeze({ profile: "test", ni });
    },
    async get(reference) {
      const ni = typeof reference === "string" ? reference : reference?.ni;
      const value = objects.get(ni);
      return value ? Object.freeze({ ni, ...value }) : null;
    },
  });
  const categoryIndex = Object.freeze({
    async add({ predicate, category, ni }) {
      const key = `${predicate}\u0000${category}`;
      if (!categories.has(key)) categories.set(key, new Set());
      categories.get(key).add(ni);
      return Object.freeze({ predicate, category, ni });
    },
    async query(category, { predicate = "urn:emsenn:witness-journal:category" } = {}) {
      const values = [...(categories.get(`${predicate}\u0000${category}`) ?? [])].sort();
      return Object.freeze({ references: Object.freeze(values.map((ni) => Object.freeze({ ni }))), continuationToken: undefined });
    },
  });
  return Object.freeze({ custody, categoryIndex });
}

export async function startWitnessJournalProviderProcess(options = {}) {
  const binding = inMemoryBinding();
  return startWitnessJournalDocumentHttpProvider(binding, options);
}

export const startLocalWitnessJournalProviderProcess = startWitnessJournalProviderProcess;
