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
