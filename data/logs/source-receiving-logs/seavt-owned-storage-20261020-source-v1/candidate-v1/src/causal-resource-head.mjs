/**
 * Canonical causal resource head over the existing typed SEN/SEAVT and SCA store.
 *
 * A resource identity names an enduring entity; its dated, content-addressed
 * observations and their cause records remain separate immutable evidence.
 * A compare-and-swap head selects only the latest source-time frontier.
 *
 * This is engineering transport/storage law, NOT any claim that an actor owns,
 * can spend, can sell or can publicly distribute the observed resource.
 * Consumers state their own event kind, record type and source witness kind.
 */
import {isNiUri} from '@red-cup-engineering/uri-services-section/ni-uri';
import {termToJson} from '@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec';
import {seavtRow,compareAbsoluteSeavtClocks,isAbsoluteSeavtClock} from './admit-seavt-row.mjs';
import {get,put,readHead,writeHead} from './store-core.mjs';
import {HeadConflict,checkTypeName} from './layout.mjs';

const fail=reason=>{throw new TypeError('SEAVT causal resource: '+reason);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);

/**
 * Construct an existing native-store projection, not a second data store.
 * A named event is policy: a cloud observation, film original, service
 * measurement or commodity finding cannot impersonate another's receipts.
 */
export function createCausalResourceHead({
 recordType,witnessType,event,frontierLimit=32,maxRetries=5
}={}){
 checkTypeName(recordType);
 checkTypeName(witnessType);
 if(typeof event!=='string'||!event.trim()||event.length>128)
  fail('nonempty bounded observation event required');
 if(!Number.isSafeInteger(frontierLimit)||frontierLimit<1||frontierLimit>32)
  fail('frontier limit must be within 1..32');
 if(!Number.isSafeInteger(maxRetries)||maxRetries<1||maxRetries>10)
  fail('CAS retry budget must be within 1..10');

 const validateRow=row=>{
  if(!object(row))fail('typed SEAVT observation required');
  seavtRow({e:row.e,a:row.a,v:row.v,t:row.t});
  if(!isAbsoluteSeavtClock(row.t))fail('absolute source observation clock required');
  const subject=termToJson(row.e),attribute=termToJson(row.a);
  if(typeof subject!=='string'||!isNiUri(subject))
   fail('canonical SCA NI resource subject required');
  if(!object(attribute)||attribute.event!==event)
   fail('resource event does not match the admitted observation policy');
  if(!Array.isArray(row.causes)||row.causes.length!==1||
     row.causes[0]?.type!==witnessType||
     typeof row.causes[0]?.id!=='string'||!isNiUri(row.causes[0].id))
   fail('exact native content-addressed observation cause required');
  return {subject,witness:row.causes[0].id};
 };
 const requireWitness=(root,id)=>{
  if(get(root,witnessType,id)===undefined)
   fail('native SCA witness must be committed before resource admission');
 };
 const readFrontier=(root,subject)=>{
  const head=readHead(root,recordType,subject);
  if(head===undefined)return null;
  const ids=head.frontier;
  if(!Array.isArray(ids)||ids.length<1||ids.length>frontierLimit||
     new Set(ids).size!==ids.length)
   fail('native resource frontier is unavailable, unbounded or duplicated');
  const records=ids.map(id=>{
   if(typeof id!=='string'||!isNiUri(id))
    fail('native resource record address invalid');
   const row=get(root,recordType,id);
   if(row===undefined)fail('native resource record missing');
   const admitted=validateRow(row);
   if(admitted.subject!==subject)
    fail('native resource record belongs to another subject');
   requireWitness(root,admitted.witness);
   return {id,row};
  });
  const at=records[0].row.t;
  if(records.some(x=>compareAbsoluteSeavtClocks(x.row.t,at)!==0))
   fail('current frontier combines distinct source observation instants');
  if(!isAbsoluteSeavtClock(head.at)||
     compareAbsoluteSeavtClocks(head.at,at)!==0)
   fail('native resource head source clock disagrees with its witnesses');
  return {head,records,at};
 };

 const receive=(root,row)=>{
  const {subject,witness}=validateRow(row);
  requireWitness(root,witness);
  const record=put(root,recordType,row);
  for(let attempt=0;attempt<maxRetries;attempt++){
   const prior=readFrontier(root,subject);
   const order=prior===null?1:compareAbsoluteSeavtClocks(row.t,prior.at);
   if(order<0)return Object.freeze({
    subject,record,asOf:prior.at,status:'historical-observation-retained'});
   const old=prior?.head.frontier??[];
   const frontier=order>0?[record]:[...new Set([...old,record])].sort();
   if(frontier.length>frontierLimit)
    fail('simultaneous source observation frontier exceeds its bound');
   if(prior!==null&&frontier.length===old.length&&frontier.every((id,i)=>id===old[i]))
    return Object.freeze({subject,record,asOf:prior.at,status:'already-received'});
   try{
    writeHead(root,recordType,subject,{frontier,at:row.t},{
     expect:prior===null?null:old
    });
    return Object.freeze({subject,record,asOf:row.t,
     status:frontier.length>1?'contested-at-source-time':'received'});
   }catch(error){if(!(error instanceof HeadConflict))throw error;}
  }
  fail('native resource head could not be advanced under concurrent writes');
 };
 const read=(root,subject)=>{
  if(typeof subject!=='string'||!isNiUri(subject))
   fail('canonical NI subject required');
  const current=readFrontier(root,subject);
  if(current===null)return null;
  return Object.freeze({
   kind:'semiotic-eavt.causal-resource-current',
   subject,asOf:current.at,
   state:current.records.length===1?'one-observation':'multiple-simultaneous-observations',
   recordIds:Object.freeze(current.records.map(x=>x.id)),
   observations:Object.freeze(current.records.map(x=>x.row))
  });
 };
 return Object.freeze({receive,read});
}
