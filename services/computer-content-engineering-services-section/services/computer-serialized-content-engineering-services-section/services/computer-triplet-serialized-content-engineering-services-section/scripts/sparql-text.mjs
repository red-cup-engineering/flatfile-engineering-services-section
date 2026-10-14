/** SPARQL 1.1 text input, restricted to SELECT/ASK/CONSTRUCT BGP, PREFIX,
 * DISTINCT and SELECT LIMIT/OFFSET. Unsupported features are rejected;
 * not a full SPARQL 1.1 engine or a substitute for OWL entailment. */
import {sparqlVariable,triplePattern} from "./sparql-over-eavt.mjs";
const RDF_TYPE="http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const refuse=m=>{throw new SyntaxError("SPARQL BGP profile: "+m);};
function tokenize(s){
 if(typeof s!=="string"||!s.trim()||Buffer.byteLength(s)>8192)refuse("query size outside 1–8192 bytes");
 const xs=[];let i=0;
 while(i<s.length){
  if(/\s/u.test(s[i])){i++;continue;}
  if(s[i]==="#"){while(i<s.length&&s[i]!=="\n")i++;continue;}
  if("{}.*".includes(s[i])){xs.push(s[i++]);continue;}
  if(s[i]==="<"){
   const k=s.indexOf(">",i+1);if(k<0)refuse("unterminated IRI");
   const iri=s.slice(i+1,k);
   if(!/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(iri)||/[\x00-\x20<>"{}|^\\]/u.test(iri))refuse("absolute IRI required");
   xs.push(s.slice(i,k+1));i=k+1;continue;
  }
  if(s[i]==='"'){
   const start=i++;let esc=false,closed=false;
   while(i<s.length){const c=s[i++];if(esc){esc=false;continue;}if(c==="\\"){esc=true;continue;}if(c==='"'){closed=true;break;}}
   if(!closed)refuse("unterminated quoted string");
   try{JSON.parse(s.slice(start,i))}catch{refuse("invalid quoted string escape")}
   xs.push(s.slice(start,i));continue;
  }
  const m=/^(?:\?[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_-]*(?::[A-Za-z0-9_-]*)?|:[A-Za-z0-9_-]+|-?[0-9]+(?:\.[0-9]+)?)/u.exec(s.slice(i));
  if(!m)refuse("unsupported syntax near "+JSON.stringify(s.slice(i,i+16)));
  xs.push(m[0]);i+=m[0].length;if(xs.length>512)refuse("token limit exceeded");
 }
 return xs;
}
export function parseSparqlText(text){
 const seq=tokenize(text),prefix=new Map();let i=0;
 const peek=()=>seq[i],pop=()=>seq[i++],is=x=>peek()?.toUpperCase()===x;
 const take=x=>{if(!is(x))refuse("expected "+x);pop()};
 while(is("PREFIX")){
  pop();const name=pop(),uri=pop();
  if(!/^(?:[A-Za-z_][A-Za-z0-9_-]*)?:$/u.test(name??"")||!/^<[^>]+>$/u.test(uri??"")||prefix.has(name))refuse("invalid or repeated PREFIX");
  prefix.set(name,uri.slice(1,-1));
 }
 const term=()=>{
  const x=pop();if(x===undefined)refuse("missing term");
  if(/^\?[A-Za-z_][A-Za-z0-9_]*$/u.test(x))return sparqlVariable(x.slice(1));
  if(x.startsWith("<"))return x.slice(1,-1);
  if(x.startsWith('"'))return JSON.parse(x);
  if(x==="a")return RDF_TYPE;
  if(x==="true")return true;if(x==="false")return false;
  if(/^-?[0-9]+(?:\.[0-9]+)?$/u.test(x))return Number(x);
  const m=/^([A-Za-z_][A-Za-z0-9_-]*|):([A-Za-z0-9_-]+)$/u.exec(x);
  if(m){const base=prefix.get(m[1]+":");if(base===undefined)refuse("unbound prefix");return base+m[2];}
  refuse("unsupported term "+x);
 };
 const graph=()=>{
  take("{");const patterns=[];
  while(peek()!=="}"){
   if(peek()===undefined||patterns.length>=64)refuse("unclosed or oversized graph");
   patterns.push(triplePattern(term(),term(),term()));
   if(peek()===".")pop();else if(peek()===undefined)refuse("unclosed graph");else if(peek()!=="}")refuse("missing dot separator");
  }
  pop();if(!patterns.length)refuse("empty BGP unsupported");return patterns;
 };
 const kind=pop()?.toUpperCase();let query;
 if(kind==="SELECT"){
  const distinct=is("DISTINCT");if(distinct)pop();let select;
  if(peek()==="*")pop();
  else{select=[];while(/^\?[A-Za-z_][A-Za-z0-9_]*$/u.test(peek()??""))select.push(pop().slice(1));if(!select.length)refuse("SELECT needs variables or *");}
  take("WHERE");query={type:"select",where:graph(),distinct,...(select?{select}:{})};
 }else if(kind==="ASK"){if(is("WHERE"))pop();query={type:"ask",where:graph()};}
 else if(kind==="CONSTRUCT"){const construct=graph();take("WHERE");query={type:"construct",construct,where:graph()};}
 else refuse("only SELECT/ASK/CONSTRUCT supported; updates forbidden");
 if(kind==="SELECT"){
  for(let n=0;n<2&&(is("LIMIT")||is("OFFSET"));n++){
   const k=pop().toLowerCase(),v=pop();
   if(!/^[0-9]+$/u.test(v??"")||Number(v)>10000||query[k]!==undefined)refuse("invalid "+k);
   query[k]=Number(v);
  }
 }
 if(i!==seq.length)refuse("unsupported clause "+String(peek()));
 return Object.freeze(query);
}
