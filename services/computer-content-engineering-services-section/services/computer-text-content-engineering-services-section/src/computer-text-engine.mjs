/**
 * Register one text-tier domain's operations under an explicit namespace
 * prefix (e.g. "markdown"). Returns a table keyed by the fully namespaced
 * operationId ("markdown:read-markdown-file"), never the bare domain name,
 * so two domains can never silently collide on an unqualified operation
 * name.
 *
 * @param {string} namespace
 * @param {Record<string, (input: unknown) => unknown>} operations
 */
export function namespaceTextOperations(namespace, operations) {
  if (typeof namespace !== "string" || namespace === "") throw new TypeError("namespace must be a non-empty string");
  if (operations === null || typeof operations !== "object") throw new TypeError("operations must be an operation table");
  return Object.freeze(
    Object.fromEntries(Object.entries(operations).map(([name, handler]) => [`${namespace}:${name}`, handler])),
  );
}

/** Combine multiple already-namespaced operation tables into one registry. */
export function mergeTextOperations(...registries) {
  return Object.freeze(Object.assign({}, ...registries));
}
