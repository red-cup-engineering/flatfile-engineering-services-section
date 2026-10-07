/**
 * Google's batchexecute framing, the wire form its web applications (Gemini Notebook, Flow, and
 * the rest built on its Boq frontends) speak to their own servers.
 *
 * A call is a form POST of `f.req=[[[rpcId, JSON(params), null, "generic"]]]` and the page's CSRF
 * token as `at`. The answer is an anti-XSSI prefix and length-framed JSON chunks; each `wrb.fr`
 * row carries one call's result as JSON text, and an `er` row a refusal with its code. The page
 * itself carries the tokens in its WIZ_global_data: `SNlM0e` (CSRF) and `FdrFJe` (session id).
 */

/** The value of one WIZ_global_data field in an application page. */
export function wizField(html, key) {
  return html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'u'))?.[1];
}

/** The request body calling rpcId with params, signed with the page's CSRF token. */
export function encodeBatchExecute(rpcId, params, csrf) {
  return `f.req=${encodeURIComponent(JSON.stringify([[[rpcId, JSON.stringify(params), null, 'generic']]]))}&at=${encodeURIComponent(csrf)}&`;
}

/**
 * The reasons a status frame names: the short upper-case codes (google.rpc ErrorInfo reasons, such
 * as PUBLIC_ERROR_UNUSUAL_ACTIVITY) found anywhere in its detail. Nothing else of the detail is
 * kept, so no token or URL it may echo leaves the codec.
 */
const statusReasons = (detail) => [...new Set(JSON.stringify(detail ?? null).match(/"[A-Z][A-Z0-9_]{3,}"/gu) ?? [])].map((reason) => reason.slice(1, -1));

/**
 * The detail messages a status frame carries, by their type's short name (the last segment of a
 * `type.googleapis.com/…` Any URL, such as UserDisplayableError, which Google products answer for
 * a quota or plan refusal).
 */
const statusDetails = (detail) => [...new Set([...JSON.stringify(detail ?? null).matchAll(/type\.googleapis\.com\/[\w.]*?\.?([A-Z]\w+)"/gu)].map((match) => match[1]))];

/**
 * The result of rpcId in one batchexecute response: the last non-null wrb.fr frame, parsed, or
 * null. An `er` frame for rpcId throws, its code kept as `rpcCode`. A wrb.fr frame with no result
 * and a status ([5]: `[code, ?, details]`, google.rpc.Status) is the call failing: when no frame
 * carries a result it throws, the status code kept as `rpcCode`, the detail's reasons as `reasons`
 * and its message types as `details`.
 */
export function decodeBatchExecute(text, rpcId) {
  const lines = text.replace(/^\)\]\}'\r?\n/u, '').split('\n').map((line) => line.replace(/\r$/u, ''));
  let result = null;
  let status = null;
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\d+$/u.test(lines[index].trim())) continue;
    let chunk;
    try { chunk = JSON.parse(lines[index + 1] ?? ''); } catch { continue; }
    index += 1;
    for (const item of Array.isArray(chunk) ? chunk : []) {
      if (!Array.isArray(item) || item[1] !== rpcId) continue;
      if (item[0] === 'er') throw Object.assign(new Error(`batchexecute ${rpcId} refused (${item[2] ?? 'unknown'})`), { code: 'BATCHEXECUTE_RPC_REFUSED', rpcCode: item[2] });
      if (item[0] === 'wrb.fr' && item[2] != null) result = typeof item[2] === 'string' ? JSON.parse(item[2]) : item[2];
      else if (item[0] === 'wrb.fr' && Array.isArray(item[5])) status = item[5];
    }
  }
  if (result === null && status) {
    const reasons = statusReasons(status[2]);
    const details = statusDetails(status);
    const named = [...reasons, ...details];
    throw Object.assign(new Error(`batchexecute ${rpcId} failed (status ${status[0]}${named.length ? `: ${named.join(', ')}` : ''})`), { code: 'BATCHEXECUTE_RPC_STATUS', rpcCode: status[0], reasons, details });
  }
  return result;
}
