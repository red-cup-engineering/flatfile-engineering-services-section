import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import vm from "node:vm";

const SCRIPT_NAMES = Object.freeze(["read-file", "search-file", "search-files", "write-file"]);

/**
 * Evaluates one script as a real ES module whose `import.meta.url` is left
 * `undefined`, the shape a bundled runtime (e.g. Cloudflare Workers) presents.
 * Bare specifiers resolve through real dynamic `import()` against this
 * package's own `node_modules`, so each script's actual house dependencies
 * run unmodified; only `import.meta.url` is forced undefined.
 * @param {string} path Absolute path to the script under test.
 * @returns {Promise<vm.SourceTextModule>} The evaluated module.
 */
async function evaluateWithUndefinedImportMetaUrl(path) {
  const source = readFileSync(path, "utf8");
  const identifier = pathToFileURL(path).href;
  const module = new vm.SourceTextModule(source, {
    identifier,
    initializeImportMeta(meta) {
      meta.url = undefined;
    },
  });
  await module.link(async (specifier) => {
    const resolved = specifier.startsWith(".") ? new URL(specifier, identifier).href : specifier;
    const imported = await import(resolved);
    const exportNames = Object.keys(imported);
    const synthetic = new vm.SyntheticModule(
      exportNames,
      function setExports() {
        for (const name of exportNames) this.setExport(name, imported[name]);
      },
      { identifier: resolved },
    );
    await synthetic.link(() => {});
    return synthetic;
  });
  await module.evaluate();
  return module;
}

for (const name of SCRIPT_NAMES) {
  test(`${name}.mjs does not throw when import.meta.url is undefined (bundled-runtime CLI guard)`, async () => {
    const path = fileURLToPath(new URL(`../scripts/${name}.mjs`, import.meta.url));
    await assert.doesNotReject(() => evaluateWithUndefinedImportMetaUrl(path));
  });
}
