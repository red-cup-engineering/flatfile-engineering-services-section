/** Candidate names in the original claim journal. A candidate becomes a thread
 * only after the selected original path formula corroborates its source file.
 * Actor names occurred both as raw digest ids and as explicit NI addresses.
 */
export function originalClaimCandidates(kind, row, witness) {
  const [entity, , value] = row;
  const candidates = [entity?.session, value?.caller?.surface,
    value?.boundary?.surface, witness.observation.seat?.subject,
    typeof entity === 'string' ? entity : undefined];
  for (const [pattern, prefix] of [
    [/^ni-sha-256-([A-Za-z0-9_-]{43})$/u, 'ni:///sha-256;'],
    [/^actor-ni-sha-256-([A-Za-z0-9_-]{43})$/u, 'actor:ni:///sha-256;'],
    [/^actor-([A-Za-z0-9_-]{43})$/u, 'actor:'],
  ]) {
    const match = pattern.exec(kind);
    if (match) candidates.push(prefix + match[1]);
  }
  return [...new Set(candidates.filter(value => typeof value === 'string' && value.length > 0))];
}
