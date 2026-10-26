/** Source qualification only. Uses the original Code packer/module-graph
 * assay and Data's original native receiver; no registry write or installer. */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, realpath, symlink } from "node:fs/promises";
import { resolve, join, relative, isAbsolute, dirname, basename, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";

const run = promisify(execFile);
const { values } = parseArgs({ strict: true, options: Object.fromEntries(
  ["source", "publication", "suppliers", "output"].map(name => [name, { type: "string" }])) });
for (const name of ["source", "publication", "suppliers", "output"])
  assert.equal(typeof values[name], "string", `--${name} must be explicitly selected`);
const source = await realpath(values.source), requestedOutput = resolve(values.output);
const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput));
const outside = path => path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
assert.ok(outside(relative(source, output)) && outside(relative(output, source)),
  "receive strictly outside the source working tree and its ancestors");
// Claim a fresh directory before reading package contents or invoking Code.
// Existing directories and symlinks are refused; the caller owns all output.
await mkdir(output);
const publication = await realpath(values.publication), suppliers = await realpath(values.suppliers);
const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
assert.equal(manifest.name, "@red-cup-engineering/computer-data-engineering-services-section");
assert.deepEqual(manifest.receivingTests, ["test/resource-capacity-allocation.test.mjs"]);
const codeManifest = JSON.parse(await readFile(join(publication, "package.json"), "utf8"));
assert.equal(codeManifest.name, "@red-cup-engineering/npm-workspace-publication-service");
assert.equal(codeManifest.version, "0.14.18", "retain the independently selected original Code owner");
const codeRequire = createRequire(pathToFileURL(join(publication, "package.json")));
const { packRegistryCarrier } = await import(pathToFileURL(codeRequire.resolve(
  "@red-cup-engineering/npm-workspace-publication-service/source-registry-closure")));
const packed = await packRegistryCarrier({ directory: source, manifest,
  destination: join(output, "archives"),
  npmEnvironment: { npm_config_cache: join(output, "npm-cache") } });
await writeFile(join(output, "packed.json"), JSON.stringify(packed, null, 2) + "\n");
assert.equal(packed.refusal, null);
assert.ok(packed.files.includes(manifest.receivingTests[0]));
assert.ok(!packed.files.some(file => file.startsWith("lib/metrologic/")), "the upstream solver is not copied into Data");

const consumer = join(output, "consumer");
const installed = join(consumer, "node_modules", manifest.name);
await mkdir(installed, { recursive: true });
await writeFile(join(consumer, "package.json"), '{"private":true,"type":"module"}\n');
await run("tar", ["-xzf", packed.artifact, "-C", installed, "--strip-components=1"]);
const graph = await run(process.execPath, ["--experimental-vm-modules",
  join(publication, "scripts/assay-carrier-module-graph.mjs"),
  "--root", installed, "--manifest", join(installed, "package.json")], { timeout: 30000 });
await writeFile(join(output, "module-graph.json"), graph.stdout);
assert.equal(JSON.parse(graph.stdout).outcome, "carrier-module-graph-admitted");

// Each link selects an existing genuine installed provider at the exact
// declared version. Its importer-relative dependency graph remains intact.
// This is source receiving against those providers, not a fresh npm install.
const selected = [];
for (const [name, version] of Object.entries(manifest.dependencies)) {
  const directory = await realpath(join(suppliers, name));
  const received = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  assert.equal(received.name, name); assert.equal(received.version, version);
  const destination = join(consumer, "node_modules", name);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await symlink(directory, destination, "dir");
  selected.push({ name, version, directory });
}
await writeFile(join(output, "selected-providers.json"), JSON.stringify(selected, null, 2) + "\n");
const tested = await run(process.execPath, ["--test", "--test-reporter=tap",
  ...manifest.receivingTests.map(file => join(installed, file))], { cwd: consumer, timeout: 30000 });
await writeFile(join(output, "native.tap"), tested.stdout);
const named = await run(process.execPath, ["--input-type=module", "--eval", `
  import assert from "node:assert/strict";
  import { allocateResourceCapacity, admitResourceCapacityPortfolio }
    from "@red-cup-engineering/computer-data-engineering-services-section/resource-capacity-allocation";
  const dimensionNi = "ni:///sha-256;" + "A".repeat(43);
  const input = { capacities: [{ dimensionNi, quantity: "1" }], candidates: [{
    id: "ni:///sha-256;" + "B".repeat(43), benefit: 2,
    resources: [{ dimensionNi, quantity: "1" }] }] };
  assert.deepEqual(admitResourceCapacityPortfolio(input).available, [1n]);
  assert.equal(allocateResourceCapacity(input).totalBenefit, 2);
  console.log("public named capacity import received through the extracted archive");
`], { cwd: consumer, timeout: 30000 });
await writeFile(join(output, "public-import.log"), named.stdout);
process.stdout.write(tested.stdout + named.stdout);
