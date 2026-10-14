/** W3C SPARQL 1.1 SELECT/ASK JSON results over the existing RDF/EAVT
 * BGP evaluator; no query engine, source store, or inference axioms here. */
import {evaluateSparql} from "./sparql-over-eavt.mjs";
import {parseSparqlText} from "./sparql-text.mjs";
const XSD="http://www.w3.org/2001/XMLSchema#";
const ABSOLUTE=/^[A-Za-z][A-Za-z0-9+.-]*:[^\s]*$/u;

/** RDF terms to W3C SPARQL result bindings; accept explicitly tagged
 * RDF terms where available to avoid inferring datatype from lexical data. */
export function resultTerm(value){
 if(value&&typeof value==="object"&&!Array.isArray(value)){
  if(value.kind==="iri"&&typeof value.value==="string"&&ABSOLUTE.test(value.value))
   return {type:"uri",value:value.value};
  if(value.kind==="literal"&&typeof value.value==="string"){
   if(value.language!==undefined)return {type:"literal",value:value.value,"xml:lang":value.language};
   if(value.datatype!==undefined)return {type:"literal",value:value.value,datatype:value.datatype};
   return {type:"literal",value:value.value};
  }
  throw new TypeError("unsupported RDF term; source must supply an admitted literal or IRI");
 }
 if(typeof value==="string")return ABSOLUTE.test(value)
   ? {type:"uri",value}
   : {type:"literal",value};
 if(typeof value==="boolean")return {type:"literal",value:String(value),datatype:XSD+"boolean"};
 if(typeof value==="number"&&Number.isFinite(value))
  return {type:"literal",value:String(value),datatype:XSD+(Number.isInteger(value)?"integer":"double")};
 throw new TypeError("unsupported EAVT value in RDF results");
}
export function sparqlResultsJson(result,{offset=0,limit}={}){
 if(result?.type==="ask")return {head:{},boolean:result.ask===true};
 if(result?.type!=="select"||!Array.isArray(result.variables)||!Array.isArray(result.bindings))
  throw new TypeError("W3C SELECT/ASK JSON results require a SELECT or ASK result");
 const bindings=result.bindings.slice(offset,limit===undefined?undefined:offset+limit)
  .map(row=>Object.fromEntries(Object.entries(row).map(([name,value])=>[name,resultTerm(value)])));
 return {head:{vars:[...result.variables]},results:{bindings}};
}
/** Evaluate standard SPARQL BGP query text; SELECT/ASK return W3C JSON;
 * CONSTRUCT returns the RDF Turtle graph already owned by the evaluator. */
export function queryRdfRows(rows,text){
 const query=parseSparqlText(text);
 if(!Array.isArray(rows)||rows.length>10000)throw new TypeError("SPARQL data source requires at most 10000 RDF/EAVT rows");
 const result=evaluateSparql(rows,query);
 return query.type==="construct"
  ? Object.freeze({type:"construct",mediaType:"text/turtle",body:result.turtle})
  : Object.freeze({type:query.type,mediaType:"application/sparql-results+json",
    body:JSON.stringify(sparqlResultsJson(result,{offset:query.offset??0,limit:query.limit}))+"\n"});
}
