/**
 * Data-owned contracts for source-addressed content-space operations.
 * Bytes are carried through the ORIGINAL JSON byte-carrier codec, never
 * a second Base64 interpreter. Names are mutable references, not NI IDs.
 * These are operation input/output shapes, not authority or storage code.
 */
export const CONTENT_SPACE_INLINE_MAX_BYTES = 65536;

const name = Object.freeze({type:"string",minLength:1,maxLength:512});
const ni = Object.freeze({type:"string",minLength:1});
const path = Object.freeze({type:"array",minItems:1,maxItems:16,
  items:{type:"string",minLength:1,maxLength:128}});
const expected = Object.freeze({anyOf:[{type:"null"},ni]});
const carrier = Object.freeze({type:"object",required:["mediaType","contentBase64"],
  additionalProperties:false,properties:{
    mediaType:{type:"string",minLength:1,maxLength:256},
    contentBase64:{type:"string",maxLength:4*Math.ceil(CONTENT_SPACE_INLINE_MAX_BYTES/3)},
  }});
const record = (properties,required) => Object.freeze({
  type:"object",properties,required,additionalProperties:false,
});

/** One immutable NI source link; its path is a collection coordinate, not a filesystem path. */
const linkRecord = record({path,ni},["path","ni"]);
const links = Object.freeze({type:"array",minItems:1,maxItems:128,items:linkRecord});
const node = record({
  path:{type:"array",minItems:0,maxItems:16,items:{type:"string",minLength:1,maxLength:128}},
  ni,kind:{enum:["tree","object"]},
  mediaType:{type:"string",minLength:1},
  byteLength:{type:"integer",minimum:0},
},["path","ni","kind","mediaType","byteLength"]);

/** Publish a complete admitted set of already-held sources under ONE CAS transition. */
export const contentSpaceLinkBatchInputSchema = record(
  {name,expected,links},["name","expected","links"]);
export const contentSpaceBatchPublicationSchema = record({
  kind:{const:"semiotic-content.named-batch-publication"},version:{const:1},
  action:{const:"link-batch"},name,expected,rootNi:ni,links,
},["kind","version","action","name","expected","rootNi","links"]);

/** Read a bounded immutable Merkle snapshot, subject to independent grants. */
export const contentSpaceWalkInputSchema = record({
  name,
  maximumNodes:{type:"integer",minimum:1,maximum:256},
  maximumDepth:{type:"integer",minimum:0,maximum:16},
},["name"]);
export const contentSpaceWalkOutputSchema = record({
  kind:{const:"semiotic-content.named-walk"},version:{const:1},
  name,rootNi:ni,count:{type:"integer",minimum:1,maximum:256},
  nodes:{type:"array",minItems:1,maxItems:256,items:node},
},["kind","version","name","rootNi","count","nodes"]);

export const contentSpacePutInputSchema = record(
  {name,expected,path,carrier},["name","expected","path","carrier"]);
export const contentSpaceLinkInputSchema = record(
  {name,expected,path,ni},["name","expected","path","ni"]);
export const contentSpacePublicationSchema = record({
  kind:{const:"semiotic-content.named-publication"},version:{const:1},
  action:{enum:["put","link"]},name,rootNi:ni,ni,path,expected,
  byteLength:{type:"integer",minimum:0},mediaType:{type:"string",minLength:1},
  durable:{type:"boolean"},
},["kind","version","action","name","rootNi","ni","path","expected"]);
