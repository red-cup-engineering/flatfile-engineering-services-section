import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The existing SignGraph/SignCraft boundary assay, received at their upstream
// mathematical owner. These are source/package checks, not a general proof of
// purity for arbitrary supplied callbacks or transitive runtime suppliers.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function exportTargets(target) {
  if (typeof target === "string") return [target];
  assert.ok(target && typeof target === "object" && !Array.isArray(target),
    "Metrologic uses explicit source export conditions");
  return Object.values(target).flatMap(exportTargets);
}

test("the published Metrologic surface exposes library source without process commands", () => {
  assert.equal(manifest.bin, undefined, "process commands belong to a downstream runtime owner");
  for (const path of manifest.files) {
    assert.doesNotMatch(path, /^(?:\.\/)?(?:scripts|bin)(?:\/|$)/u,
      "command payloads must not ship inside Metrologic");
  }
  for (const target of Object.values(manifest.exports).flatMap(exportTargets)) {
    assert.ok(target === "./package.json" ||
      (target.startsWith("./src/") && !target.split("/").includes("..")),
    `${target} must expose only the inspected library`);
  }
});

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (entry.isFile() && entry.name.endsWith(".mjs")) yield path;
  }
}

test("Metrologic source has no ambient I/O or dependency on its downstream Sign libraries", () => {
  let inspected = 0;
  const ambient = /\b(?:Date\.now\s*\(|Math\.random\s*\(|fetch\s*\(|process\.(?:env|argv|stdin|stdout|stderr|exit|cwd)\b)/u;
  for (const path of sourceFiles(join(root, "src"))) {
    inspected++;
    const code = readFileSync(path, "utf8");
    const imports = [
      ...code.matchAll(/\bfrom\s*["']([^"']+)["']/gu),
      ...code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/gu),
    ].map(match => match[1]);
    for (const specifier of imports) {
      assert.doesNotMatch(specifier,
        /^(?:node:)?(?:fs(?:\/promises)?|child_process|http|https|net|tls|dgram|worker_threads)(?:\/|$)/u,
        `${path} may not acquire ambient I/O capabilities`);
      assert.doesNotMatch(specifier,
        /^@red-cup-engineering\/(?:signcell|signchain|signgraph|signcraft)(?:\/|$)/u,
        `${path} must preserve the original mathematical dependency direction`);
    }
    assert.doesNotMatch(code, ambient,
      `${path} must receive its data without reading ambient state`);
  }
  assert.ok(inspected > 0, "the original mathematical source was inspected");
});
