import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { normalizeUrl,formToJson,jsonToForm,nameContent,verifyContentName } from "../src/address-transformations.mjs";
import { assertHttpUrl } from "../src/http-url.mjs";
import { makeNiUriService } from "../src/ni-uri.mjs";

test("native URL normalization resolves bases, international hosts and IP representations", () => {
  const r=normalizeUrl({url:"../data?q=a+b#part",base:"https://EXAMPLE.com:443/a/b/"});
  assert.equal(r.href,"https://example.com/a/data?q=a+b#part");
  assert.equal(r.search,"?q=a+b");
  assert.equal(normalizeUrl({url:"https://bücher.example/"}).hostname,"xn--bcher-kva.example");
  assert.equal(normalizeUrl({url:"http://0x7f.1/"}).hostname,"127.0.0.1");
  assert.equal(normalizeUrl({url:"mailto:user@example.org"}).origin,"null");
  assert.equal(assertHttpUrl(" HTTPS://example.org ")," HTTPS://example.org ");
  for(const value of [{toString:()=>"https://example.org"},42,"https://example.org/\ud800"]) assert.throws(()=>assertHttpUrl(value));
  assert.throws(()=>normalizeUrl({url:"relative"}));
  assert.throws(()=>normalizeUrl({url:"https://x/",extra:true}));
});
test("form conversion preserves duplicate keys, blanks, own keys and ordered UTF-8 pairs", () => {
  const pairs=[["x","1"],["x","2"],["__proto__","safe"],["blank",""],["=","a + b"],["name","Pheží Ocháǧe"]];
  assert.deepEqual(formToJson(jsonToForm({pairs})),{pairs});
  assert.equal(jsonToForm({pairs:[["x","a + b"]]}).text,"x=a+%2B+b");
  assert.deepEqual(formToJson({text:"a=b=c&blank&=x&&"}),{pairs:[["a","b=c"],["blank",""],["","x"]]});
  for(const text of ["x=%FF","x=%ED%A0%80","x=%GG","x=%","\ud800"]) assert.throws(()=>formToJson({text}));
  assert.throws(()=>jsonToForm({pairs:[["x",3]]}));
  assert.throws(()=>formToJson({text:Array(2049).fill("a=b").join("&")}),RangeError);
});
test("NI names preserve exact binary contents and refuse silent decode substitutions", () => {
  const carrier={mediaType:"application/octet-stream",contentBase64:"AAEC/w=="};
  const named=nameContent({carrier});
  const digest=createHash("sha256").update(new Uint8Array([0,1,2,255])).digest("base64url");
  assert.equal(named.uri,"ni:///sha-256;"+digest);
  assert.equal(named.wellKnownPath,"/.well-known/ni/sha-256/"+digest);
  assert.equal(verifyContentName({carrier,uri:named.uri}).matches,true);
  assert.equal(verifyContentName({carrier:{...carrier,contentBase64:"AAEC/g=="},uri:named.uri}).matches,false);
  assert.equal(makeNiUriService({bytesBase64:carrier.contentBase64}).uri,named.uri);
  for(const bytesBase64 of ["!!!!","AB==","AAEC/w","AA EC/w=="]) assert.throws(()=>makeNiUriService({bytesBase64}));
  assert.throws(()=>makeNiUriService({text:"\ud800"}));
  const full={...carrier,contentBase64:Buffer.alloc(65536,255).toString("base64")};
  assert.equal(nameContent({carrier:full}).byteLength,65536);
  assert.throws(()=>nameContent({carrier:{...full,contentBase64:Buffer.alloc(65537).toString("base64")}}),RangeError);
});
