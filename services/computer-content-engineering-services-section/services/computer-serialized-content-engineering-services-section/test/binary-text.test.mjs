import assert from "node:assert/strict";
import test from "node:test";
import * as codecs from "../src/binary-text.mjs";
import { encode, decode } from "@red-cup-engineering/base58-encoding-service";

const carrier = bytes => ({ mediaType: "application/octet-stream", contentBase64: Buffer.from(bytes).toString("base64") });
const pairs = [["Base16", "base16", 65536], ["Base32", "base32", 65536], ["Base58", "base58btc", 1024], ["Base64url", "base64url", 65536]];

test("RFC4648 vectors, exact arbitrary bytes, leading zeroes and bounded canonical carriers", () => {
  const vectors = [
    ["", "", "", ""], ["f", "66", "MY======", "Zg"], ["fo", "666F", "MZXQ====", "Zm8"],
    ["foo", "666F6F", "MZXW6===", "Zm9v"], ["foob", "666F6F62", "MZXW6YQ=", "Zm9vYg"],
    ["fooba", "666F6F6261", "MZXW6YTB", "Zm9vYmE"], ["foobar", "666F6F626172", "MZXW6YTBOI======", "Zm9vYmFy"],
  ];
  for (const [source, b16, b32, b64] of vectors) for (const [suffix, expected] of [["Base16",b16],["Base32",b32],["Base64url",b64]]) {
    assert.equal(codecs["encode"+suffix+"Content"]({carrier:carrier(Buffer.from(source))}).text,expected);
    assert.equal(codecs["decode"+suffix+"Content"]({text:expected,mediaType:"application/octet-stream"}).carrier.contentBase64,carrier(Buffer.from(source)).contentBase64);
  }
  for (const [suffix, encoding, maximum] of pairs) {
    for (const bytes of [Buffer.alloc(0),Buffer.from([0,0,0,255,128,0,10,250]),Buffer.alloc(maximum,255)]) {
      const packed=codecs["encode"+suffix+"Content"]({carrier:carrier(bytes)});
      assert.equal(packed.encoding,encoding);assert.equal(packed.byteLength,bytes.length);
      const decoded=codecs["decode"+suffix+"Content"]({text:packed.text,mediaType:"application/test"});
      assert.deepEqual(Buffer.from(decoded.carrier.contentBase64,"base64"),bytes);assert.equal(decoded.carrier.mediaType,"application/test");
    }
    assert.throws(()=>codecs["encode"+suffix+"Content"]({carrier:carrier(Buffer.alloc(maximum+1))}));
  }
  assert.equal(encode(Buffer.from([0,0,0,1])),"1112");
  assert(Buffer.isBuffer(decode("1112")));assert.deepEqual(decode("1112"),Buffer.from([0,0,0,1]));
  assert.equal(encode(Buffer.from("foobar")),"t1Zv2yaZ");
  for(const [suffix,text] of [["Base16","ab"],["Base16","0"],["Base16","00 "],["Base32","MY"],["Base32","my======"],["Base32","MZ======"],["Base58","0OIl"],["Base58"," 1112"],["Base64url","_x"],["Base64url","Zg=="],["Base64url","+/8"]]) assert.throws(()=>codecs["decode"+suffix+"Content"]({text,mediaType:"application/octet-stream"}));
  assert.throws(()=>codecs.decodeBase58Content({text:"1".repeat(1025),mediaType:"application/octet-stream"}));
});
