// The one trust boundary: every interpolation escapes unless wrapped in raw().

import { escapeAttr } from '@red-cup-engineering/html-structural-projection-service';

export function escapeHtml(value) {
  // A context-neutral template interpolation must be safe in the stricter
  // quoted-attribute context as well as ordinary text content.
  return escapeAttr(String(value));
}

class RawHtml {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
}

export function raw(trusted) {
  return trusted instanceof RawHtml ? trusted : new RawHtml(trusted);
}

export function isRaw(value) {
  return value instanceof RawHtml;
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + strings[i + 1];
  }
  return new RawHtml(out);
}

function renderValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof RawHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}
