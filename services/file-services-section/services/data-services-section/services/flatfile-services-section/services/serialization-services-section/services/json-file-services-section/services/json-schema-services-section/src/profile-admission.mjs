import { isObjectRecord as isObject } from "@red-cup-engineering/json-services-section/is-object-record";

export function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

export function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);
}

export function hasString(value, key) {
  return typeof value?.[key] === "string" && value[key].length > 0;
}

export function push(errors, code, path, message) {
  errors.push({ code, path, message });
}

export function assertValid(value, validate) {
  const errors = validate(value);
  if (errors.length > 0) {
    throw new TypeError(errors.map((error) => `${error.code} ${error.path}: ${error.message}`).join("\n"));
  }
  return value;
}

export function createProfileAssertion(validate) {
  return (value) => assertValid(value, validate);
}

export function checkEvidence(errors, value, path, code) {
  if (!nonEmptyStringArray(value)) {
    push(errors, code, path, "must cite evidence");
  }
}

export function checkSection(errors, profile, sectionName, keys, codePrefix) {
  const section = profile[sectionName];
  if (!isObject(section)) {
    push(errors, `${codePrefix}-001`, sectionName, `${sectionName} must be declared`);
    return;
  }
  for (const key of keys) {
    if (section[key] !== true) {
      push(errors, `${codePrefix}-002`, `${sectionName}.${key}`, `${key} must be true`);
    }
  }
  checkEvidence(errors, section.evidence, sectionName, `${codePrefix}-003`);
}
