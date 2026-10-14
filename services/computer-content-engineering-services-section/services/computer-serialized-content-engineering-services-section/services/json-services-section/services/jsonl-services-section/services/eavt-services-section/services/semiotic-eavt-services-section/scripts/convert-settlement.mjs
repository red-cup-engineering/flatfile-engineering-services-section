#!/usr/bin/env node
/** One-time, never-merge branch tool. See store-conversion.md. Originals are never changed. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

let progress={stage:'source-inputs'};
async function main() {
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const args = Object.fromEntries(process.argv.slice(2).reduce((out, value, index, values) => {
  if (value.startsWith('--')) out.push([value.slice(2), values[index + 1]?.startsWith('--') || values[index + 1] === undefined ? true : values[index + 1]]);
  return out;
}, []));
for (const key of ['settlement', 'into', 'old-store', 'new-store', 'report']) if (typeof args[key] !== 'string') throw new TypeError(`required --${key}`);
const source = fs.realpathSync(args.settlement), output = path.resolve(args.into);
if (source === output || output.startsWith(source + path.sep) || source.startsWith(output + path.sep)) throw new TypeError('conversion requires a separate nonnested output');
const reportPath = path.resolve(args.report);
if (reportPath === source || reportPath.startsWith(source + path.sep)) throw new TypeError('report must preserve original custody');
let parent=path.dirname(output);while(!fs.existsSync(parent))parent=path.dirname(parent);
const parentReal=fs.realpathSync(parent);
if(fs.statSync(source).dev!==fs.statSync(parentReal).dev||output==='/tmp'||output.startsWith('/tmp/')||output.startsWith('/var/tmp/'))throw new TypeError('candidate must use original custody volume outside temporary storage');
if(args.activitypub){const liveParent=path.dirname(source),candidateParent=path.dirname(output);if(candidateParent===liveParent||candidateParent.startsWith(liveParent+path.sep))throw new TypeError('queue candidate must not use the live ActivityPub parent');}
if (fs.existsSync(output)) throw new TypeError('output must not exist; originals remain in their original custody');
const oldRoot = fs.realpathSync(args['old-store']), newRoot = fs.realpathSync(args['new-store']);
if (args['clock-last'] !== undefined && (args.activitypub || typeof args['clock-last'] !== 'string')) throw new TypeError('an explicit last-run source belongs to a world conversion');
const clockLastSource = args['clock-last'] === undefined ? undefined : fs.realpathSync(args['clock-last']);
if (clockLastSource !== undefined && (!fs.statSync(clockLastSource).isDirectory() || fs.statSync(clockLastSource).dev !== fs.statSync(source).dev || output === clockLastSource || output.startsWith(clockLastSource + path.sep) || clockLastSource.startsWith(output + path.sep))) throw new TypeError('last-run originals require separate same-volume directory custody');
const load = file => import(pathToFileURL(file).href);
const oldRequire = createRequire(path.join(oldRoot, 'package.json'));
const newRequire = createRequire(path.join(newRoot, 'package.json'));
const supplier = async (require, specifier) => load(require.resolve(specifier));
const { parseJournalWitness } = await load(path.join(oldRoot, 'src/journal/event.mjs'));
const { openSegmentReader } = await load(path.join(oldRoot, 'src/journal/filesystem/segment-bytes.mjs'));
let projectionFile = 'src/query-semantic-records.mjs';
let { semanticRecordOf } = await load(path.join(oldRoot, projectionFile));
if (typeof semanticRecordOf !== 'function') {
  // The earlier BCF provider keeps its query projection private. Receive the
  // public original projection, with its original identity and witness laws;
  // never copy that private implementation or substitute a CRG reader.
  projectionFile = 'src/semantic-record.mjs';
  const { projectSemanticRecords } = await load(path.join(oldRoot, projectionFile));
  const { termToJson } = await supplier(oldRequire, '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec');
  const { tm } = await supplier(oldRequire, '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation');
  const { canonicalJson: originalCanonicalJson } = await supplier(oldRequire, '@red-cup-engineering/json-services-section');
  if (typeof projectSemanticRecords !== 'function') throw new TypeError('original public semantic projection unavailable');
  const claims = new Set(['unknown','held','denied','contested'].map(charge => originalCanonicalJson(tm.mark('semantic-record.' + charge))));
  semanticRecordOf = (witness, objectKind) => {
    if (!claims.has(originalCanonicalJson(witness.observation.claim))) return undefined;
    const category = termToJson(witness.observation.payload[1]);
    const records = projectSemanticRecords({objectKind, category, witnesses:[witness]}, () => { throw new TypeError('unselected legacy artifact projection'); });
    if (!Array.isArray(records) || records.length > 1) throw new TypeError('original projection is not one selected record');
    return records[0];
  };
}
const store = await load(path.join(newRoot, 'src/store.mjs'));
const { semanticAddress } = await supplier(newRequire, '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address');
const { niBucketPath } = await supplier(newRequire, '@red-cup-engineering/computer-content-address-engineering-services-section/ni-path');
const { canonicalJson } = await supplier(newRequire, '@red-cup-engineering/json-services-section/canonical-json');
const { streamJsonLines, hashSource } = await import('./conversion-buckets.mjs');
fs.mkdirSync(output, { mode: 0o700, recursive: true });
process.umask(0o077);
const report = { type: 'OneTimeStoreConversion', version: 1, source, output, originalsPreserved: true, ordersExecuted: false, transportActivated: false,
  suppliers: { oldStore: oldRoot, newStore: newRoot, oldWitnessReader: sha(fs.readFileSync(path.join(oldRoot,'src/journal/event.mjs'))), oldPackedReader:sha(fs.readFileSync(path.join(oldRoot,'src/journal/filesystem/segment-bytes.mjs'))), oldSemanticProjection:sha(fs.readFileSync(path.join(oldRoot,projectionFile))), oldSemanticProjectionFile:projectionFile, newWriter: sha(fs.readFileSync(path.join(newRoot,'src/store-core.mjs'))) },
  types: {}, sourceOnly: {}, referencesRewritten: 0, referencesLeft: 0, causesDropped: 0, sourceSegments: [], missingBodies: [], queue: { activated: 0 } };
const counts = type => report.types[type] ??= { read: 0, written: 0, duplicates: 0, heads: 0, verified: 0 };
const files = function* (root) { if (!fs.existsSync(root)) return; observe(root); for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const file=path.join(root,entry.name); if(entry.isSymbolicLink()) throw new TypeError('source custody contains a symlink');
  if(entry.isDirectory()) yield* files(file); else if(entry.isFile()) yield file;
} };
const stamps = new Map();
const stamp = file => { const s=fs.statSync(file); return [s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs]; };
const observe = file => { if(!stamps.has(file)) stamps.set(file,stamp(file)); };
function* witnesses(file) {
  observe(file);
  const ledger=file.replace(/\.witnesses$/u,'.admitted');
  if(fs.existsSync(ledger)){
    observe(ledger);for(const {record}of streamJsonLines(ledger))if(!Number.isSafeInteger(record.end)||record.end<0||record.end>fs.statSync(file).size)throw new TypeError('original segment lacks its admitted custody');
  }
  for(const {record}of streamJsonLines(file,{openReader:openSegmentReader}))yield parseJournalWitness(record);
}
if (!args.activitypub) {
  const { convertMainWorld } = await import('./conversion-main-world.mjs');
  const originalManifest = JSON.parse(fs.readFileSync(path.join(oldRoot,'package.json'),'utf8'));
  const eavtProviders = ['@red-cup-engineering/eavt-services-section','@red-cup-engineering/eavt'].filter(name => Object.hasOwn(originalManifest.dependencies ?? {}, name));
  if (eavtProviders.length !== 1) throw new TypeError('one declared original EAVT path provider required');
  const { dataArtifactAddress } = await supplier(oldRequire, eavtProviders[0] + '/data-artifact-address');
  await convertMainWorld({source, output, oldRoot, newRoot, store, report, parseJournalWitness, openSegmentReader, semanticRecordOf, niBucketPath, semanticAddress, dataArtifactAddress, clockLastSource});
} else {
  if (typeof args['old-activitypub'] !== 'string') throw new TypeError('--old-activitypub is required');
  const oldAp = fs.realpathSync(args['old-activitypub']);
  const { receiveCutoverBytes } = await load(path.join(oldAp, 'src/receiving/custody-bytes.mjs'));
  const { createFileStoreSync: oldFileStore } = await supplier(createRequire(path.join(oldAp, 'package.json')), '@red-cup-engineering/immutable-content-custody-service/file-store');
  const { createFileStoreSync: newFileStore } = await supplier(newRequire, '@red-cup-engineering/immutable-content-custody-service/file-store');
  const { immutableContentKey } = await supplier(newRequire, '@red-cup-engineering/immutable-content-custody-service');
  const { makeNiUri } = await supplier(newRequire, '@red-cup-engineering/uri-services-section/ni-uri');
  if (!fs.existsSync(path.join(source,'bodies'))) throw new TypeError('original cited body custody is unavailable');
  const oldBodies = oldFileStore(path.join(source, 'bodies')), bodyStore = newFileStore(path.join(output, 'custody'));
  for(const file of files(path.join(source,'bodies')))observe(file);
  report.suppliers.oldActivitypub = oldAp;
  report.suppliers.oldBodyReader = sha(fs.readFileSync(path.join(oldAp,'src/receiving/custody-bytes.mjs')));
  report.apOrigins = [];
  const segments = [...files(path.join(source,'data/journals'))].filter(file => file.endsWith('.witnesses')).sort();
  for (const file of segments) {
    progress={stage:'original-activitypub-segment',source:path.relative(source,file)};
    const kind = path.basename(file).split('-admit-')[1]?.replace(/\.jsonl\.witnesses$/u, '');
    if (kind !== 'activitypub.custody') { report.sourceOnly[kind] = (report.sourceOnly[kind] ?? 0) + 1; continue; }
    let selected = 0;
    for (const witness of witnesses(file)) {
      progress={stage:'original-activitypub-custody',original:witness.id};
      const original = semanticRecordOf(witness, kind);
      if (!original || !['inbox','outbox','followers'].includes(original.category) || original.told?.for !== true || original.told?.against !== false) { report.sourceOnly[kind] = (report.sourceOnly[kind] ?? 0) + 1; continue; }
      const at = original.recordedAt;
      if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) throw new TypeError('original ActivityPub clock is unavailable');
      const type = 'activitypub-' + ({inbox:'inbox',outbox:'outbox',followers:'follower'}[original.category]);
      const count = counts(type); count.read++; selected++;
      const { bodyReference, ...rest } = original.record;
      let record;
      if (original.category === 'followers') record = {...rest, following:true, at};
      else {
        let bytes;
        try { bytes = receiveCutoverBytes(oldBodies, bodyReference); }
        catch { report.missingBodies.push({original:witness.id, reason:'cited-original-body-unavailable'}); continue; }
        const activity = JSON.parse(Buffer.from(bytes).toString('utf8'));
        if (!Buffer.from(canonicalJson(activity)).equals(Buffer.from(bytes))) throw new TypeError('original JSON requires exact-byte custody judgment');
        const activityNi = makeNiUri(bytes), key = immutableContentKey(activityNi);
        bodyStore.putIfAbsent(key,{body:bytes,mediaType:'application/json'});
        const held = bodyStore.get(key);
        if (held === null || !Buffer.from(held.body).equals(Buffer.from(bytes))) throw new TypeError('current body receiving failed');
        if (original.category === 'inbox' && (rest.receipt?.type !== 'ActivityPubVerifiedArrivalReceipt' || rest.receipt.version !== 1 || rest.receipt.bodySha256 !== sha(bytes))) throw new TypeError('original arrival receipt does not bind original body');
        record = {...rest, activityNi, activityBytes:bytes.length, at, ...(original.category === 'outbox' ? {contentNi:semanticAddress(activity).id} : {})};
      }
      const name = original.category === 'inbox' ? record.key : original.category === 'outbox' ? record.activityId : undefined;
      const headName = name === undefined ? undefined : store.threadName(semanticAddress({type,name}).id);
      const prior = headName === undefined ? undefined : store.readHead(output,type,headName);
      if (prior !== undefined) {
        const existing = store.get(output,type,prior.frontier[0]);
        if (canonicalJson({...existing,at:record.at}) !== canonicalJson(record)) throw new TypeError('original identity names conflicting activity custody');
        count.duplicates++; continue;
      }
      const id = store.put(output,type,record); count.written++;
      if (headName !== undefined) { store.writeHead(output,type,headName,{frontier:[id]}); count.heads++; }
      report.apOrigins.push({original:witness.id, oldIdentity:original.id, current:id, type, ...(record.activityNi === undefined ? {} : {bodyNi:record.activityNi})});
    }
    report.sourceSegments.push({path:path.relative(source,file),bytes:fs.statSync(file).size,sha256:hashSource(file,{openReader:openSegmentReader}),selected});
  }
  if (args.queue) {
    if (typeof args.queue !== 'string' || typeof args['new-activitypub'] !== 'string') throw new TypeError('queue receiving requires exact original queue and current ActivityPub provider');
    const queue = fs.realpathSync(args.queue), currentAp = fs.realpathSync(args['new-activitypub']);
    const { extractSenActivity } = await load(path.join(currentAp,'src/sen-activity.mjs'));
    report.suppliers.currentActivitypub = currentAp;
    report.suppliers.currentQueueReader = sha(fs.readFileSync(path.join(currentAp,'src/flatfile-queue.mjs')));
    report.queue = { activated:0, retained:0, originalOnly:[], archivedOriginalOnly:0 };
    const claimed = path.join(queue,'claimed');
    if (fs.existsSync(claimed) && fs.readdirSync(claimed).length) throw new TypeError('an actual claimed delivery requires outcome receiving before queue conversion');
    const ready = path.join(queue,'ready'), target = path.join(path.dirname(output),'queue','ready');
    for (const file of files(ready)) {
      observe(file); const bytes = fs.readFileSync(file), item = JSON.parse(bytes.toString('utf8'));
      const message = item.message, activity = message?.activity;
      let admissible = false;
      if (message?.type === 'outbox' && activity && typeof activity === 'object') {
        const sender = typeof activity.actor === 'string' ? activity.actor : activity.actor?.id;
        const to = Array.isArray(activity.to) ? activity.to[0] : activity.to;
        const recipient = typeof to === 'string' ? to : to?.id;
        try { extractSenActivity(activity,{expectedActor:sender,expectedRecipient:recipient}); admissible = true; } catch { /* No fabricated current witness for an older semantic wire. */ }
      }
      if (!admissible) {
        report.queue.originalOnly.push({name:path.basename(file),sha256:sha(bytes),reason:'pending-wire-not-admitted-by-current-transport'}); continue;
      }
      fs.mkdirSync(target,{recursive:true,mode:0o700});
      const destination = path.join(target,path.basename(file));fs.writeFileSync(destination,bytes,{flag:'wx',mode:0o600});
      if (!fs.readFileSync(destination).equals(bytes)) throw new TypeError('pending queue bytes changed during receiving');report.queue.retained++;
    }
    for (const entry of fs.readdirSync(queue,{withFileTypes:true})) if (entry.isDirectory() && entry.name.startsWith('ready.')) report.queue.archivedOriginalOnly += fs.readdirSync(path.join(queue,entry.name)).length;
  }
}
for (const [type, expected] of Object.entries(report.types)) {
  progress={stage:'current-native-receiving',type};
  let found = 0;
  for (const {address,record} of store.each(output,type)) {
    if (!store.get(output,type,address) || semanticAddress(record).id !== address) throw new TypeError('native record identity receiving failed'); found++;
  }
  if (found !== expected.written) throw new TypeError('native record count differs from conversion receipt'); expected.verified = found;
  for (const {head} of store.heads(output,type)) for (const step of store.walk(output,type,head.frontier,{limit:100000})) if(step.missing || step.truncated) throw new TypeError('native head receiving is incomplete');
}
for(const [file,original] of stamps) if(JSON.stringify(stamp(file)) !== JSON.stringify(original)) throw new TypeError('original custody changed during conversion; candidate is unqualified');
report.qualified = report.missingBodies.length === 0 && report.mainQualified !== false;
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({type:report.type,qualified:report.qualified,types:report.types,missingBodies:report.missingBodies.length,originalsPreserved:true,ordersExecuted:false,transportActivated:false}));

}
main().catch(error => { process.stderr.write(JSON.stringify({type:"OneTimeStoreConversionRefused",code:typeof error?.code === "string" ? error.code : error?.name ?? "Error",...progress,originalsPreserved:true})+"\n"); process.exitCode=1; });
