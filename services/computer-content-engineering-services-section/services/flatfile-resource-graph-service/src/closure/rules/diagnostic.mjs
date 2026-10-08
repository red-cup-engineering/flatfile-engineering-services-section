// Every generic closure rule emits this same five-field shape — rule name,
// path, slug, target, message — so a diagnostics list is cross-comparable
// with pyfars.closure.rule's, field for field, regardless of which
// language ran the battery. A rule leaves path/slug/target null when the
// diagnostic isn't anchored to that axis (a multi-node cycle owns no
// single file; a symbol collision owns no single note).
export function makeDiagnostic({ rule, path = null, slug = null, target = null, message }) {
  return Object.freeze({ rule, path, slug, target, message });
}


