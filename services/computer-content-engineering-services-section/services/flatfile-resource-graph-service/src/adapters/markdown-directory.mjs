import { defineProvider } from "../provider/provider.mjs";
import { makeCell } from "../kernel/cells.mjs";
import { buildEdges } from "../substrate/store.mjs";
import { loadFlatfiles } from "../substrate/read-flatfiles.mjs";
import { RELATION_KEYS } from "../convention.mjs";
import { projectAttributeCells } from "../provider/attribute-projection.mjs";
import { identity } from "../kernel/identity.mjs";

/** The old whole-directory Markdown loader, seated as one ordinary provider. */
export function markdownDirectoryProvider({ id, root, excludes, sources = ["fm", "body"], relationKeys = RELATION_KEYS }) {
  return defineProvider({ id, async observe({ observedAt = new Date().toISOString() } = {}) {
    const { notes, diagnostics } = await loadFlatfiles(root, { excludes });
    const edges = buildEdges(notes, { sources, relationKeys });
    const edgesBySource = Map.groupBy(edges, (edge) => edge.src);
    const resources = notes.map((note) => {
      const resource = `urn:fars:flatfile:${encodeURIComponent(note.path)}`;
      const cells = [
        makeCell({ subject: resource, predicate: "urn:fars:type", object: "urn:fars:type:markdown-flatfile" }),
        makeCell({ subject: resource, predicate: "urn:fars:path", object: note.path }),
        makeCell({ subject: resource, predicate: "urn:fars:slug", object: note.slug }),
        // The file body is a first-class, content-addressed resource coordinate.
        // Reuse the existing canonical NI identity, do not hash or duplicate
        // the prose into an alternate application-level claim representation.
        makeCell({ subject: resource, predicate: "urn:fars:body-content-id", object: identity({kind:"fars.markdown-body.v1",body:note.body}) }),
        ...projectAttributeCells({ subject: note.slug, resource, attributes: note.fm }),
        ...(edgesBySource.get(note.slug) ?? []).map((edge) => makeCell({ subject: edge.src, predicate: edge.kind, object: edge.dst })),
      ];
      return Object.freeze({ resource, focus: note.slug, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([]) });
    });
    return Object.freeze({ resources: Object.freeze(resources), diagnostics: Object.freeze(diagnostics) });
  } });
}


