/** Assemble a control object from its norms. */
export function control(norms) {
    return Object.freeze({ norms: Object.freeze([...norms]) });
}
/** The norms of a control that apply within a scope. */
export function normsFor(control, scope) {
    return control.norms.filter((n) => n.scopes.includes(scope));
}
/** Read a subject against one norm: a valued finding, not a pass/fail. */
export function finding(norm, reading, message, evidence = []) {
    return Object.freeze({
        norm: norm.id,
        reading,
        severity: norm.severity,
        message,
        evidence: Object.freeze([...evidence]),
    });
}
