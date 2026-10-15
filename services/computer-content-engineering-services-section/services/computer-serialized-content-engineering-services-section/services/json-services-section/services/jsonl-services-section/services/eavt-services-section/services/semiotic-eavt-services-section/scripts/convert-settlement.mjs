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
// Resolve the existing ancestor before comparing paths: aliases cannot turn a
// separate-looking candidate or report into a write inside retained custody.
const destinationPath = value => {
  let ancestor = path.resolve(value); const tail = [];
  for (;;) {
    try { fs.lstatSync(ancestor); break; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor); if (parent === ancestor) throw error;
      tail.unshift(path.basename(ancestor)); ancestor = parent;
    }
  }
  return path.join(fs.realpathSync(ancestor), ...tail);
};
const under = (file, root) => file === root || file.startsWith(root + path.sep);
const overlaps = (left, right) => under(left, right) || under(right, left);
const source = fs.realpathSync(args.settlement), output = destinationPath(args.into);
if (source === output || output.startsWith(source + path.sep) || source.startsWith(output + path.sep)) throw new TypeError('conversion requires a separate nonnested output');
const reportPath = destinationPath(args.report);
if (reportPath === source || reportPath.startsWith(source + path.sep)) throw new TypeError('report must preserve original custody');
let parent=path.dirname(output);while(!fs.existsSync(parent))parent=path.dirname(parent);
const parentReal=fs.realpathSync(parent);
if(fs.statSync(source).dev!==fs.statSync(parentReal).dev||output==='/tmp'||output.startsWith('/tmp/')||output.startsWith('/var/tmp/'))throw new TypeError('candidate must use original custody volume outside temporary storage');
let originalQueue;
// Queue selection and ordinary ready/claimed custody are preflighted before
// either representation's receiver can write any candidate records or bodies.
if(args.activitypub){
  if(typeof args.queue !== 'string')throw new TypeError('ActivityPub qualification requires explicit original queue custody');
  originalQueue=fs.realpathSync(args.queue);
  if(!fs.lstatSync(originalQueue).isDirectory())throw new TypeError('original queue custody must be a directory');
  for(const part of ['ready','claimed'])if(!fs.lstatSync(path.join(originalQueue,part)).isDirectory())throw new TypeError('original queue needs ordinary ready and claimed directories');
  const liveParent=path.dirname(source),candidateParent=path.dirname(output),candidateQueue=destinationPath(path.join(candidateParent,'queue'));
  if(under(candidateParent,liveParent))throw new TypeError('queue candidate must not use the live ActivityPub parent');
  if(overlaps(output,originalQueue)||under(reportPath,originalQueue)||overlaps(candidateQueue,originalQueue)||overlaps(candidateQueue,source))throw new TypeError('candidate paths overlap original queue or journal custody');
  if(fs.statSync(originalQueue).dev!==fs.statSync(source).dev)throw new TypeError('original queue must use the custody volume');
  if(fs.existsSync(candidateQueue))throw new TypeError('candidate queue custody must not exist');
}
if (fs.existsSync(output)) throw new TypeError('output must not exist; originals remain in their original custody');
const oldRoot = fs.realpathSync(args['old-store']), newRoot = fs.realpathSync(args['new-store']);
if(args.activitypub){
 const {activityPubSourceFormat,receiveNativeActivityPub,receiveActivityPubQueue}=await import('./receive-native-activitypub.mjs');
 if(typeof args['old-activitypub']!=='string'||typeof args['new-activitypub']!=='string')throw new TypeError('exact ActivityPub providers required');
 const oldAp=fs.realpathSync(args['old-activitypub']),currentAp=fs.realpathSync(args['new-activitypub']);
 const sourceFormat=activityPubSourceFormat({source,sourceStoreRoot:oldRoot,sourceActivitypubRoot:oldAp});
 if(sourceFormat==='native-activitypub-13bca0b8'){
  if(args['clock-last']!==undefined)throw new TypeError('native ActivityPub does not receive a world clock source');
  const held=await receiveNativeActivityPub({source,output,sourceStoreRoot:oldRoot,targetStoreRoot:newRoot,sourceActivitypubRoot:oldAp,targetActivitypubRoot:currentAp});
  const queueStamps=new Map(),observe=file=>{const s=fs.statSync(file);if(!queueStamps.has(file))queueStamps.set(file,[s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs]);};
  const queue=await receiveActivityPubQueue({queue:originalQueue,output,currentAp,observe});
  for(const[file,before]of queueStamps){const s=fs.statSync(file);if(JSON.stringify(before)!==JSON.stringify([s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs]))throw new TypeError('original queue changed during receiving');}
  const store=await import(pathToFileURL(path.join(newRoot,'src/store.mjs')).href),types={};
  for(const type of ['activitypub-inbox','activitypub-outbox','activitypub-follower']){let n=0;for(const _ of store.each(output,type,{strict:true}))n++;if(n)types[type]={read:n,written:n,duplicates:0,heads:[...store.heads(output,type,{strict:true})].length,verified:n};}
  const report={type:'OneTimeStoreConversion',version:1,source,output,sourceFormat,originalsPreserved:true,ordersExecuted:false,transportActivated:false,suppliers:{oldStore:oldRoot,newStore:newRoot,oldActivitypub:oldAp,currentActivitypub:currentAp,currentQueueReader:sha(fs.readFileSync(path.join(currentAp,'src/flatfile-queue.mjs')))},types,missingBodies:[],queue,nativeReceiving:held,qualified:held.qualified&&queue.originalOnly.length===0&&queue.archivedOriginalOnly===0};
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({type:report.type,qualified:report.qualified,types,originalsPreserved:true,ordersExecuted:false,transportActivated:false}));return;
 }
}

if (args['clock-last'] !== undefined && (args.activitypub || typeof args['clock-last'] !== 'string')) throw new TypeError('an explicit last-run source belongs to a world conversion');
const clockLastSource = args['clock-last'] === undefined ? undefined : fs.realpathSync(args['clock-last']);
if (clockLastSource !== undefined && (under(reportPath,clockLastSource) || !fs.statSync(clockLastSource).isDirectory() || fs.statSync(clockLastSource).dev !== fs.statSync(source).dev || output === clockLastSource || output.startsWith(clockLastSource + path.sep) || clockLastSource.startsWith(output + path.sep))) throw new TypeError('last-run originals require separate same-volume directory custody');
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
const { canonicalJson } = await supplier(newRequire, '@red-cup-engineering/json-services-section/canonical');
const { originalJournalFiles, createBucketMap, streamJsonLines, hashSource } = await import('./conversion-buckets.mjs');
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
  if (typeof args['old-activitypub'] !== 'string' || typeof args['new-activitypub'] !== 'string') throw new TypeError('exact --old-activitypub and --new-activitypub providers are required');
  const oldAp = fs.realpathSync(args['old-activitypub']), currentAp = fs.realpathSync(args['new-activitypub']);
  const currentApRequire = createRequire(path.join(currentAp, 'package.json'));
  const { receiveCutoverBytes } = await load(path.join(oldAp, 'src/receiving/custody-bytes.mjs'));
  const { createFileStoreSync: oldFileStore } = await supplier(createRequire(path.join(oldAp, 'package.json')), '@red-cup-engineering/immutable-content-custody-service/file-store');
  const { createFileStoreSync: newFileStore } = await supplier(currentApRequire, '@red-cup-engineering/immutable-content-custody-service/file-store');
  const { immutableContentKey } = await supplier(currentApRequire, '@red-cup-engineering/immutable-content-custody-service');
  const { makeNiUri } = await supplier(newRequire, '@red-cup-engineering/uri-services-section/ni-uri');
  if (!fs.existsSync(path.join(source,'bodies'))) throw new TypeError('original cited body custody is unavailable');
  const oldBodies = oldFileStore(path.join(source, 'bodies')), bodyStore = newFileStore(path.join(output, 'custody'));
  const bytesForInbox=record=>bodyStore.get(immutableContentKey(record.activityNi)).body;
  for(const file of files(path.join(source,'bodies')))observe(file);
  report.suppliers.oldActivitypub = oldAp;
  report.suppliers.oldBodyReader = sha(fs.readFileSync(path.join(oldAp,'src/receiving/custody-bytes.mjs')));
  report.apOrigins = [];
  const followerOrderRoot = path.join(output, '.conversion-activitypub');
  const followerEvents = createBucketMap(followerOrderRoot, niBucketPath);
  let followerSequence = 0, inboxSequence = 0;
  const targetAp=await load(path.join(currentAp,'src/journal-custody.mjs'));
  if(typeof targetAp.activityPubReplyCoordinates!=='function')throw new TypeError('paired witnessed reply receiver required');
  // Canonical source clocks have the same lexical/locale ordering. Exceptional
  // spellings are compared against prior times using only temporary disk maps;
  // refuse a changed source ordering instead of inventing normalized instants.
  const inboxClock=at=>{
    const id=semanticAddress({at}).id;if(followerEvents.get('inbox-times',id)!==undefined)return;
    const canonical=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(at)&&new Date(at).toISOString()===at;
    for(const {value:other}of followerEvents.entries(canonical?'inbox-exceptional-times':'inbox-times')){
      const raw=at<other?-1:at>other?1:0;
      if(Math.sign(at.localeCompare(other))!==raw)throw new TypeError('witnessed inbox timestamp ordering differs from native receiver');
    }
    followerEvents.put('inbox-times',id,at);if(!canonical)followerEvents.put('inbox-exceptional-times',id,at);
  };
  // Both historical journal owners are real inputs. The kind-layout migration
  // retained witness custody under data/logs; no current runtime legacy reader.
  const historicalFiles = [...originalJournalFiles(source,{observe})];
  for(const file of historicalFiles){observe(file);if(file.endsWith('.jsonl'))throw new TypeError('pre-witness ActivityPub feed needs separate source receiving');}
  const segments = historicalFiles.filter(file => file.endsWith('.witnesses')).sort();
  for (const file of segments) {
    progress={stage:'original-activitypub-segment',source:path.relative(source,file)};
    const kind = path.basename(file).split('-admit-')[1]?.replace(/\.jsonl\.witnesses$/u, '');
    if (kind !== 'activitypub.custody') { report.sourceOnly[kind] = (report.sourceOnly[kind] ?? 0) + 1; continue; }
    let selected = 0;
    for (const witness of witnesses(file)) {
      progress={stage:'original-activitypub-custody',original:witness.id};
      const original = semanticRecordOf(witness, kind);
      if (!original || !['inbox','outbox','followers'].includes(original.category)) { report.sourceOnly[kind] = (report.sourceOnly[kind] ?? 0) + 1; continue; }
      const following = original.told?.for === true && original.told?.against === false;
      if (original.category !== 'followers' && !following) throw new TypeError('unselected non-held ActivityPub custody state');
      if(original.category==='inbox'&&followerEvents.get('inbox-events',witness.id)!==undefined){counts('activitypub-inbox').duplicates++;continue;}
      const at = original.recordedAt;
      if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) throw new TypeError('original ActivityPub clock is unavailable');
      const type = 'activitypub-' + ({inbox:'inbox',outbox:'outbox',followers:'follower'}[original.category]);
      const count = counts(type); count.read++; selected++;
      const { bodyReference, ...rest } = original.record;
      let record;
      if (original.category === 'followers') {
        // The original follower reader removes every non-held row. This is
        // specific to that carrier's fold, not a general interpretation of denial.
        // Its query deduplicates witness ids before retaining append order at
        // equal instants. Carry that actual order into the native record; no
        // timestamp, authorization receipt or runtime legacy reader is invented.
        if (followerEvents.get('follower-events', witness.id) !== undefined) { count.duplicates++; continue; }
        if (!Number.isSafeInteger(followerSequence)) throw new RangeError('original follower order exceeds its exact integer representation');
        record = {...rest, following, at, sourceOrder: followerSequence};
        followerEvents.put('follower-events', witness.id, followerSequence++);
      }
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
        if (original.category === 'inbox' && (rest.receipt?.type !== 'ActivityPubVerifiedArrivalReceipt' || rest.receipt.version !== 1 || rest.receipt.bodySha256 !== sha(bytes)
          || !(rest.receipt.recipient===null||typeof rest.receipt.recipient==='string') || rest.recipient!==rest.receipt.recipient || rest.key!==sha(canonicalJson(rest.receipt)))) throw new TypeError('original arrival receipt does not bind original body');
        record = {...rest, activityNi, activityBytes:bytes.length, at, ...(original.category === 'outbox' ? {contentNi:semanticAddress(activity).id} : {})};
      }
      if(original.category==='inbox'){
        if(!Number.isSafeInteger(inboxSequence))throw new RangeError('original inbox order exceeds its exact integer representation');
        if(rest.reply!==undefined||rest.replyOrder!==undefined||rest.sourceOrder!==undefined)throw new TypeError('undeclared witnessed inbox correlation state');
        inboxClock(at);const reply=targetAp.activityPubReplyCoordinates(JSON.parse(Buffer.from(bytesForInbox(record)).toString('utf8')));
        record={...record,sourceOrder:inboxSequence,...(reply===null?{}:{reply,replyOrder:inboxSequence})};
        followerEvents.put('inbox-events',witness.id,inboxSequence++);
        const name=store.threadName(semanticAddress({type,name:record.key}).id),prior=store.readHead(output,type,name),existing=prior===undefined?undefined:store.get(output,type,prior.frontier[0]);
        const content=value=>{const{at,sourceOrder,replyOrder,...rest}=value;return canonicalJson(rest);};
        if(existing!==undefined&&content(existing)!==content(record))throw new TypeError('original receipt identity names conflicting activity custody');
        const id=store.put(output,type,record);count.written++;
        if(existing===undefined||record.at>existing.at||(record.at===existing.at&&record.sourceOrder>existing.sourceOrder))store.writeHead(output,type,name,{frontier:[id]});
        if(prior===undefined)count.heads++;
        if(reply!==null&&record.recipient!==null){
          const name=targetAp.activityPubReplyHead({identifier:record.recipient,...reply}),head=store.readHead(output,type,name),held=head===undefined?undefined:{address:head.frontier[0],record:store.get(output,type,head.frontier[0])};
          if(held===undefined||targetAp.compareActivityPubReplyRows({address:id,record},held)>0)store.writeHead(output,type,name,{frontier:[id]});
          if(held===undefined)count.heads++;
        }
        report.apOrigins.push({original:witness.id,oldIdentity:original.id,current:id,type,bodyNi:record.activityNi});continue;
      }
      const name = original.category === 'inbox' ? record.key : original.category === 'outbox' ? record.activityId : undefined;
      const headName = name === undefined ? undefined : store.threadName(semanticAddress({type,name}).id);
      const prior = headName === undefined ? undefined : store.readHead(output,type,headName);
      if (prior !== undefined) {
        const existing = store.get(output,type,prior.frontier[0]);
        if (canonicalJson({...existing,at:record.at}) !== canonicalJson(record)) throw new TypeError('original identity names conflicting activity custody');
        count.duplicates++; continue;
      }
      const id = semanticAddress(record).id;
      if (store.get(output,type,id) !== undefined) { count.duplicates++; continue; }
      if (store.put(output,type,record) !== id) throw new TypeError('native record identity differs from selected content');
      count.written++;
      if (headName !== undefined) { store.writeHead(output,type,headName,{frontier:[id]}); count.heads++; }
      report.apOrigins.push({original:witness.id, oldIdentity:original.id, current:id, type, ...(record.activityNi === undefined ? {} : {bodyNi:record.activityNi})});
    }
    report.sourceSegments.push({path:path.relative(source,file),bytes:fs.statSync(file).size,sha256:hashSource(file,{openReader:openSegmentReader}),selected});
  }
  const received=targetAp.createActivityPubJournalCustody({stateDirectory:path.dirname(output)});
  if(path.resolve(received.root)!==output)throw new TypeError('ActivityPub candidate must be journal under its state directory');
  for(const {record}of store.each(output,'activitypub-inbox',{strict:true})){
    const activity=JSON.parse(Buffer.from(bytesForInbox(record)).toString('utf8'));
    const held=await received.inbox.get(record.receipt);if(held===null||canonicalJson(held.activity)!==canonicalJson(activity))throw new TypeError('witnessed inbox body was not received');
    if(canonicalJson(await received.inbox.retain({recipient:record.recipient,jsonLd:activity}))!==canonicalJson(record.receipt))throw new TypeError('witnessed arrival replay changed receipt identity');
  }
  fs.rmSync(followerOrderRoot, {recursive:true, force:true});
  if (args.queue) {
    if (typeof args.queue !== 'string' || typeof args['new-activitypub'] !== 'string') throw new TypeError('queue receiving requires exact original queue and current ActivityPub provider');
    const {receiveActivityPubQueue}=await import('./receive-native-activitypub.mjs');
    report.suppliers.currentActivitypub=currentAp;
    report.suppliers.currentQueueReader=sha(fs.readFileSync(path.join(currentAp,'src/flatfile-queue.mjs')));
    report.queue=await receiveActivityPubQueue({queue:originalQueue,output,currentAp,observe});
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
if(args.activitypub)report.sourceFormat='witnessed-activitypub';
report.qualified = report.missingBodies.length === 0 && report.mainQualified !== false
  && (report.queue.originalOnly?.length ?? 0) === 0
  && (report.queue.archivedOriginalOnly ?? 0) === 0;
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({type:report.type,qualified:report.qualified,types:report.types,missingBodies:report.missingBodies.length,originalsPreserved:true,ordersExecuted:false,transportActivated:false}));

}
main().catch(error => { process.stderr.write(JSON.stringify({type:"OneTimeStoreConversionRefused",code:typeof error?.code === "string" ? error.code : error?.name ?? "Error",...progress,originalsPreserved:true})+"\n"); process.exitCode=1; });

