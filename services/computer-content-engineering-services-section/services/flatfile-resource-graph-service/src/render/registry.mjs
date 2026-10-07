function text(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

export function defineRenderer({ id, mediaType, accepts, render }) {
  text(id, "renderer.id");
  text(mediaType, "renderer.mediaType");
  if (typeof accepts !== "function") throw new TypeError("renderer.accepts must be a function");
  if (typeof render !== "function") throw new TypeError("renderer.render must be a function");
  return Object.freeze({ id, mediaType, accepts, render });
}

export function createRendererRegistry(renderers) {
  if (!Array.isArray(renderers)) throw new TypeError("renderers must be an array");
  const byId = new Map();
  for (const renderer of renderers) {
    if (byId.has(renderer.id)) throw new TypeError(`duplicate renderer id: ${renderer.id}`);
    byId.set(renderer.id, renderer);
  }
  return Object.freeze({ renderers: Object.freeze([...renderers]), byId });
}

export async function renderGraph(registry, { composition, selection, rendererId = null, parameters = {} }) {
  const renderer = rendererId === null
    ? registry.renderers.find((candidate) => candidate.accepts({ composition, selection, parameters }))
    : registry.byId.get(rendererId);
  if (!renderer) throw new Error(rendererId === null ? "no renderer accepts this graph selection" : `unknown renderer: ${rendererId}`);
  if (!renderer.accepts({ composition, selection, parameters })) throw new Error(`renderer ${renderer.id} does not accept this graph selection`);
  return Object.freeze({ renderer: renderer.id, mediaType: renderer.mediaType, body: await renderer.render({ composition, selection, parameters }) });
}


