/** Temporary, branch-only conversion tables. No legacy reader enters a release. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Both retained historical layouts are inputs to the one-time conversion.
export const ORIGINAL_JOURNAL_ROOTS = Object.freeze(['data/journals','data/logs']);
const journalGuard = /^This settlement's journal is filed by kind under data\/logs since (\d{4}-\d{2}-\d{2}) \(semiotic-eavt-services-section scripts\/file-journal-store-by-kind\.mjs\)\.\nA release that still writes here runs the dated layout and must be rebuilt\.\n$/u;
const originalStat = file => {try{return fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return;throw error;}};
/** Admit the exact historical filing guard, never arbitrary files or redirected
 * journal roots. The bounded supported layout keeps logs inside this custody. */
export function* originalJournalFiles(source,{observe=()=>{}}={}){
  observe(source);
  const data=path.join(source,'data'),dataStat=originalStat(data);
  if(dataStat!==undefined){if(!dataStat.isDirectory())throw new TypeError('original data custody is not an ordinary directory');observe(data);}
  for(const relative of ORIGINAL_JOURNAL_ROOTS){
    const root=path.join(source,relative),stat=originalStat(root);if(stat===undefined)continue;
    if(stat.isDirectory()){observe(root);yield* sourceFiles(root,{observe});continue;}
    if(relative==='data/journals'&&stat.isFile()){
      const match=journalGuard.exec(fs.readFileSync(root,'utf8'));
      const date=match&&new Date(match[1]+'T00:00:00.000Z');
      if(match&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===match[1]&&originalStat(path.join(source,'data/logs'))?.isDirectory()){
        observe(root);yield root;continue;
      }
    }
    throw new TypeError('original journal root is neither an ordinary directory nor the exact historical filing guard');
  }
}

export const SOURCE_LINE_BYTES_MAX=1_048_576; // the original witness provider envelope
export const sourceStamp=file=>{const s=fs.statSync(file);return [s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs];};
export function assertSourceStamps(stamps){for(const [file,stamp]of stamps)if(JSON.stringify(sourceStamp(file))!==JSON.stringify(stamp))throw new TypeError('original conversion source changed');}
const plainReader=file=>{const fd=fs.openSync(file,'r');return {read:(...args)=>fs.readSync(fd,...args),close:()=>fs.closeSync(fd)};};

/** One original line and its exact logical byte position, including packed segments. */
export function* streamJsonLines(file,{openReader=plainReader,maxLineBytes=SOURCE_LINE_BYTES_MAX}={}){
 const reader=openReader(file),buffer=Buffer.alloc(65_536),end=fs.statSync(file).size;let position=0,offset=0,carry=Buffer.alloc(0);
 try{while(position<end){const count=reader.read(buffer,0,Math.min(buffer.length,end-position),position);if(!count)break;position+=count;
  const bytes=carry.length?Buffer.concat([carry,buffer.subarray(0,count)]):Buffer.from(buffer.subarray(0,count));let start=0,index;
  while((index=bytes.indexOf(10,start))>=0){const line=bytes.subarray(start,index);if(line.length>maxLineBytes||line.includes(0))throw new TypeError('original line violates its provider envelope');
   if(!line.length)throw new TypeError('empty conversion table/source line');
   yield {offset,length:line.length,bytes:line,record:JSON.parse(line.toString('utf8'))};offset+=line.length+1;start=index+1;
  }
  carry=Buffer.from(bytes.subarray(start));if(carry.length>maxLineBytes)throw new RangeError('original line violates its provider envelope');
 }if(carry.length&&!carry.every(byte=>byte===0))throw new TypeError('torn original source requires custody judgment');
 }finally{reader.close();}
}

/** Stream the logical bytes supplied by the original provider; never read a segment whole. */
export function hashSource(file,{openReader=plainReader}={}){
 const reader=openReader(file),buffer=Buffer.alloc(65_536),hash=createHash('sha256'),end=fs.statSync(file).size;let position=0;
 try{while(position<end){const count=reader.read(buffer,0,Math.min(buffer.length,end-position),position);if(!count)break;hash.update(buffer.subarray(0,count));position+=count;}return hash.digest('hex');}finally{reader.close();}
}

export function* sourceFiles(root,{observe=()=>{}}={}){if(!fs.existsSync(root))return;observe(root);for(const entry of fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
 const file=path.join(root,entry.name);if(entry.isSymbolicLink())throw new TypeError('source custody contains a symlink');
 if(entry.isDirectory())yield* sourceFiles(file,{observe});else if(entry.isFile())yield file;
}}

/** ni-path-v1 determines one bucket. Lookup streams it, retaining one matching value. */
export function createBucketMap(root,niBucketPath){
 const ni=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
 const fileOf=(area,id)=>{if(!/^[a-z]+(?:-[a-z]+)*$/u.test(area)||!ni.test(id))throw new TypeError('conversion map requires an area and canonical address');return path.join(root,area,niBucketPath(id,'ni-path-v1'));};
 return {
  get(area,id){if(!ni.test(id))return;const file=fileOf(area,id);if(!fs.existsSync(file))return;let value;for(const {record}of streamJsonLines(file))if(record.id===id)value=record.value;return value;},
  put(area,id,value){const file=fileOf(area,id);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.appendFileSync(file,JSON.stringify({id,value})+'\n',{mode:0o600});},
  *entries(area){for(const file of sourceFiles(path.join(root,area)))for(const {record}of streamJsonLines(file))yield record;},
 };
}

/** Reopen exactly the witness named by pass one's position, through the old provider. */
export function witnessAt({file,offset,length},{openSegmentReader,parseJournalWitness}){
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(length)||length<1||length>SOURCE_LINE_BYTES_MAX)throw new TypeError('original witness position invalid');
 const reader=openSegmentReader(file),bytes=Buffer.alloc(length);let count=0;
 try{while(count<length){const n=reader.read(bytes,count,length-count,offset+count);if(!n)throw new TypeError('original witness position unavailable');count+=n;}return parseJournalWitness(JSON.parse(bytes.toString('utf8')));}finally{reader.close();}
}
