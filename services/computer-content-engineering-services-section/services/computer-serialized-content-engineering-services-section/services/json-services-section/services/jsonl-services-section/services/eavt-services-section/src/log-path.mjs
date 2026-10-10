import { logPath } from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { isPathname } from "@red-cup-engineering/computer-filepath-engineering-services-section/posix";
/**
 * writing/path — a path is a categorical *address*, not a bag of file metadata.
 *
 * Two layers, both pure (filesystem effects stay outside this codec):
 *  - term addressing — a term (any JSON value, or split parts) ⇄ a
 *    filesystem-safe typed filepath under a root, and the inverse recovery of
 *    the term from a path. This is how the invocation ledger turns a caller or
 *    morphism into the dated log path it appends to.
 *  - path points — POSIX lexical path normalization, parent/basename, and the
 *    `path:` point identifier, plus the holography `pathProjector`.
 *
 * Utterance (de/re)hydration lives here too: it dehydrates carriers to a
 * JSON-compatible log shape and rehydrates fresh carriers — preserving carried
 * content without claiming mark coincidence across peers (the deliberate
 * structural-not-reference seam).
 */
import { define,                               } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { mark, utterance,                       } from "@red-cup-engineering/signcell/utterance";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

function asJsonValue(value         , context        )            {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${context}: non-finite number is not a JSON value`);
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map((item, index) => asJsonValue(item, `${context}[${index}]`)));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out                    = {};
    for (const [key, item] of Object.entries(value)) {
      Object.defineProperty(out, key, {
        value: asJsonValue(item, `${context}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return Object.freeze(out);
  }
  throw new TypeError(`${context}: not a JSON value`);
}

function jsonRecord(value           )                                             {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

/** Dehydrate utterance carriers into a JSON-compatible utterance-log carrier. */
export function dehydrateUtterances(utterances                             )            {
  const encoded = utterances.map((carrier, index)                    => {
    const context = `dehydrateUtterances: utterance ${index}`;
    if (typeof carrier !== "object" || carrier === null || carrier.kind !== "utterance.carrier") {
      throw new TypeError(`${context}: expected an utterance carrier`);
    }
    return Object.freeze({
      token: asJsonValue(carrier.token.mark.value, `${context} token mark value`),
      claim: asJsonValue(carrier.claim.mark.value, `${context} claim mark value`),
    });
  });
  return Object.freeze({ kind: "meme-topology.utteranceLog", utterances: Object.freeze(encoded) });
}

/** Rehydrate a JSON utterance-log carrier into fresh utterance carriers. */
export function rehydrateUtterances(value           )                              {
  const record = jsonRecord(value);
  if (record === null) throw new TypeError("rehydrateUtterances: expected an utterance log object");
  if (record["kind"] !== "meme-topology.utteranceLog" || !Array.isArray(record["utterances"])) {
    throw new TypeError("rehydrateUtterances: expected a meme-topology.utteranceLog carrier");
  }
  return Object.freeze(record["utterances"].map((entry, index) => {
    const item = jsonRecord(entry);
    const context = `rehydrateUtterances: utterance ${index}`;
    if (item === null) throw new TypeError(`${context}: expected an encoded utterance`);
    if (!("token" in item) || !("claim" in item)) {
      throw new TypeError(`${context}: encoded utterance must carry token and claim mark values`);
    }
    return utterance(mark(item["token"]), mark(item["claim"]));
  }));
}

/** The subject and predicate log paths for an EAVT row under a root. */
export function eavtLogPaths(root        , row                   )                    {
  const record = eavtRecord(row);
  const seen = new Set        ();
  const paths           = [];
  for (const anchor of [record.e, record.a]) {
    const path = logPath(root, anchor);
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return Object.freeze(paths);
}

/** The root path projector: recognizes POSIX pathnames. */
export const pathProjector                       = define           ({
  type: "path",
  corner: "data",
  rung: "strict",
  recognize: (resource) => isPathname(resource.path),
});
