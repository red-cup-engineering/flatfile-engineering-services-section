import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { jsonSourcesProvider, selectCatalogJsonSources } from "../src/adapters/json-sources.mjs";
import { attributePredicate, decodeJsonGraphValue } from "../src/provider/attribute-projection.mjs";
import { composeProviders, queryRelations } from "../src/provider/compositor.mjs";

const groups = ["https://github.com/561-group/561-group-services-section",
  "https://github.com/coesite-operations/operations-services-section"];
const sourcePath = "lib/agency/duties/observing-language-space.json";
const observedAt = "2026-10-14T20:00:00.000Z";

const defaultRecord = Object.freeze({
  name: "observing-language-space",
  authority: "board-charter",
  claim: "receiving-office",
  skills: ["inspect-corpus", "qualify-language-claims"],
  delegation: false,
});
const digestOf = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const defaultBytes = Buffer.from(JSON.stringify(defaultRecord, null, 2) + "\n", "utf8");
const defaultDigest = digestOf(defaultBytes);
const selection = (path, digest = defaultDigest) => ({ path, digest });

async function fixture(t, record = defaultRecord) {
  const root = await mkdtemp(join(tmpdir(), "fars-source-json-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, sourcePath);
  await mkdir(dirname(path), { recursive: true });
  const bytes = Buffer.from(JSON.stringify(record, null, 2) + "\n", "utf8");
  await writeFile(path, bytes);
  return { root, path, bytes };
}

function provider(root, namespace = groups[0], sources = [selection(sourcePath)]) {
  return jsonSourcesProvider({ id: "agency-source", root, namespace, sources });
}

test("real source-owned agency JSON files enter the same typed FARS graph without conferring incumbency", async t => {
  const { root, bytes } = await fixture(t);
  const p = provider(root);
  const observed = await p.observe({ observedAt });
  assert.equal(observed.resources.length, 1);
  const record = observed.resources[0];
  assert.equal(record.observedAt, observedAt);
  assert.equal(record.focus.includes(encodeURIComponent(groups[0])), true);
  assert.notEqual(record.resource, record.focus, "resource is revision-scoped");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const revision = record.cells.find(x => x.predicate === "urn:fars:source-revision");
  assert.equal(revision.object, `sha256:${hash}`);
  const dutyName = record.cells.find(x => x.predicate === attributePredicate("name"));
  assert.equal(dutyName.subject, record.resource, "the JSON file makes this statement, not an actual office");
  assert.equal(decodeJsonGraphValue(dutyName.object), "observing-language-space");
  const delegated = record.cells.find(x => x.predicate === attributePredicate("delegation"));
  assert.equal(decodeJsonGraphValue(delegated.object), false);
  const skills = record.cells.filter(x => x.predicate === attributePredicate("skills"));
  assert.deepEqual(skills.map(x => decodeJsonGraphValue(x.object)), ["inspect-corpus","qualify-language-claims"]);
  assert.equal(record.cells.some(x => x.predicate === "urn:fars:authorized-incumbent"), false);
  const actual = await composeProviders([p], { context: { observedAt } });
  assert.equal(actual.providers[0].status, "observed");
  assert.equal(queryRelations(actual, { predicate: attributePredicate("name") }).length, 1);
});

test("source revision and source owner prevent unchanged words from inheriting prior witness authority", async t => {
  const { root, path } = await fixture(t);
  const first = (await provider(root).observe({ observedAt })).resources[0];
  const second = (await provider(root, groups[1]).observe({ observedAt })).resources[0];
  assert.notEqual(first.resource, second.resource, "different lawful owners never alias");
  const edited = JSON.parse((await readFile(path)).toString("utf8"));
  edited.skills.push("observe-receiver");
  const revisedBytes = Buffer.from(JSON.stringify(edited, null, 2) + "\n");
  await writeFile(path, revisedBytes);
  await assert.rejects(() => provider(root).observe({ observedAt }),
    /digest changed or is not owner-qualified/u, "stale catalog digest must refuse");
  const changed = (await provider(root, groups[0],
    [selection(sourcePath, digestOf(revisedBytes))]).observe({ observedAt })).resources[0];
  assert.notEqual(first.resource, changed.resource, "different exact source bytes have different revision identity");
  const witnesses = value => value.cells.filter(x=>x.predicate==="urn:fars:attribute-witness").map(x=>x.object);
  assert.notDeepEqual(witnesses(first), witnesses(changed),
    "same name value in a revised document must not retain the old source witness");
  assert.equal(changed.focus, first.focus, "logical source path stays identifiable");
});

test("source admission is explicit, finite, atomic and closed against paths outside the owner", async t => {
  const { root } = await fixture(t);
  for (const paths of [[], ["../owned.json"], ["/etc/passwd.json"],
    ["sub/../owned.json"], [sourcePath, sourcePath], [".git/config.json"],
    ["lib/agency/secrets.txt"]]) {
    assert.throws(() => provider(root, groups[0], paths.map(path => selection(path))),
      TypeError, JSON.stringify(paths));
  }
  for (const digest of ["", "sha256:ABC", "sha256:" + "F".repeat(64)]) {
    assert.throws(() => provider(root, groups[0], [selection(sourcePath,digest)]), TypeError);
  }
  assert.throws(() => provider(root, "http://untrusted.example.test"), TypeError);
  assert.throws(() => provider(root, groups[0],
    Array.from({length:4097}, (_,i)=>selection(`x/${i}.json`))), TypeError);
  const absent = provider(root, groups[0],
    [selection(sourcePath), selection("lib/agency/duties/missing.json")]);
  await assert.rejects(() => absent.observe({observedAt}));
  const other = await mkdtemp(join(tmpdir(), "fars-foreign-"));
  t.after(() => rm(other, { recursive: true, force: true }));
  await writeFile(join(other, "private.json"), '{"authority":"not-admitted"}\n');
  await symlink(join(other, "private.json"), join(root, "lib/agency/duties/alias.json"));
  await assert.rejects(() => provider(root, groups[0],
    [selection("lib/agency/duties/alias.json")]).observe({observedAt}),
    /source changes its selected path/u);
});

test("existing professional repertoire catalog selects office, duty and work sources for real FARS query", async t => {
  const {root} = await fixture(t);
  const officePath = "content/professional-repertoire/offices/cto.json";
  const workPath = "content/professional-repertoire/works/observing-language-space.json";
  const officeBytes = Buffer.from(JSON.stringify({
    id:"cto",kind:"office","bears-duty":["urn:561:duty:language-space"],
    "appointment-authority":false
  })+"\n");
  const workBytes = Buffer.from(JSON.stringify({
    id:"observing-language-space",name:"observing language space",
    from:"opaque corporate work",to:"attributed source claims"
  })+"\n");
  for (const [path,bytes] of [[officePath,officeBytes],[workPath,workBytes]]) {
    const file=join(root,path);
    await mkdir(dirname(file),{recursive:true});
    await writeFile(file,bytes);
  }
  const catalog=Object.freeze({
    id:"union-professional-repertoire",owner:"union-officer-academy",
    appointmentAuthority:false,
    offices:[{id:"cto",canonicalPath:officePath,digest:digestOf(officeBytes)}],
    duties:[{id:"observing-language-space",canonicalPath:sourcePath,digest:defaultDigest}],
    works:[{id:"observing-language-space",canonicalPath:workPath,digest:digestOf(workBytes)}],
    skills:[{id:"unsupported-file-kind",canonicalRoot:"lib/professional-repertoire/skills/demo",
      digest:defaultDigest}],
  });
  const sources=selectCatalogJsonSources(catalog,["offices","duties","works"]);
  assert.deepEqual(sources.map(x=>x.path),[officePath,workPath,sourcePath].sort());
  const graph=jsonSourcesProvider({id:"coesite:professional-repertoire",root,namespace:groups[1],sources});
  const actual=await composeProviders([graph],{context:{observedAt}});
  assert.equal(actual.providers[0].status,"observed");
  assert.equal(actual.resources.length,3);
  assert.equal(queryRelations(actual,{predicate:attributePredicate("id")}).length,2,
    "two source-owned id fields each name their own record, not one actor or office");
  assert.equal(queryRelations(actual,{predicate:attributePredicate("name")}).length,2);
  assert.ok(actual.resources.every(x=>x.resource.includes("sha256:")));
  assert.equal(queryRelations(actual,{predicate:"urn:fars:authorized-incumbent"}).length,0);
  for (const invalid of [
    ["skills"], ["missing"], ["offices","offices"]
  ]) assert.throws(()=>selectCatalogJsonSources(catalog,invalid),TypeError);
  assert.throws(()=>selectCatalogJsonSources({...catalog,duties:[catalog.offices[0]]},
    ["offices","duties"]), /duplicate JSON source path/u);
  const mismatched=selectCatalogJsonSources({...catalog,works:[{
    ...catalog.works[0],digest:"sha256:"+"0".repeat(64)
  }]},["works"]);
  await assert.rejects(()=>jsonSourcesProvider({id:"stale-catalog",root,
    namespace:groups[1],sources:mismatched}).observe({observedAt}),
    /digest changed or is not owner-qualified/u);
});

test("bad JSON or a non-object cannot silently become a qualified source claim", async t => {
  const { root, path } = await fixture(t);
  await writeFile(path, '{"name":');
  await assert.rejects(() => provider(root).observe({observedAt}),/not an admitted UTF-8 JSON/u);
  await writeFile(path, '[{"name":"not an office record"}]');
  await assert.rejects(() => provider(root).observe({observedAt}),/object record/u);
  await writeFile(path, JSON.stringify({big:"x".repeat(1_048_580)}));
  await assert.rejects(() => provider(root).observe({observedAt}),/bounded regular file/u);
});
