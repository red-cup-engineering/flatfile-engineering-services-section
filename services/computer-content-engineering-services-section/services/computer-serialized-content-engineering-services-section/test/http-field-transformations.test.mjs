import test from "node:test";
import assert from "node:assert/strict";
import { fieldToJson, jsonToField, validateField } from "../services/http-data-services-section/src/field-transformations.mjs";

test("native fields retain all eight bare types, decimal identity, order and inner-list parameters", () => {
  const text = 'int=999999999999999, dec=1.0, str="a\\\"b", tok=Foo/bar, bin=:AP8=:, bool, date=@-999999999999999, disp=%"caf%c3%a9", inner=("@method";bs "@path");created=@1';
  const result = fieldToJson({ kind: "dictionary", text });
  assert.deepEqual(result.value.map(([key, entry]) => [key, entry.type === "item" ? entry.value.type : entry.type]), [["int","integer"],["dec","decimal"],["str","string"],["tok","token"],["bin","byteSequence"],["bool","boolean"],["date","date"],["disp","displayString"],["inner","innerList"]]);
  assert.equal(result.value[1][1].value.value, 1);
  assert.equal(result.value[4][1].value.value, "AP8=");
  assert.equal(result.value[6][1].value.value, -999999999999999);
  assert.equal(result.value[7][1].value.value, "café");
  assert.equal(jsonToField(result).text, text);
  const duplicate = fieldToJson({ kind: "dictionary", text: "a=1, b, a=2" });
  assert.equal(jsonToField(duplicate).text, "a=2, b"); // RFC dictionary overwrite retains key order.
  assert.deepEqual(fieldToJson({ kind: "list", text: "" }), { kind: "list", value: [] });
  assert.equal(jsonToField(fieldToJson({ kind: "item", text: "1.0" })).text, "1.0");
});
test("JSON serialization refuses rounding, duplicate map keys, nested inner lists and malformed bytes", () => {
  const item = value => ({ type: "item", value, parameters: [] });
  for (const value of [{type:"decimal",value:0.0005},{type:"integer",value:1.5},{type:"date",value:1.5},{type:"byteSequence",value:"AB=="},{type:"displayString",value:"\ud800"},{type:"string",value:"é"}]) assert.throws(() => jsonToField({kind:"item",value:item(value)}));
  assert.throws(() => jsonToField({kind:"dictionary",value:[["a",item({type:"integer",value:1})],["a",item({type:"integer",value:2})]]}));
  const inner = {type:"innerList",value:[],parameters:[]};
  assert.throws(() => jsonToField({kind:"list",value:[{...inner,value:[inner]}]}));
  for (const text of ["1.0001", "@1.0", "%\"%ff\"", "foo,", ":bad?:"]) assert.equal(validateField({kind:"item",text}).valid,false);
  assert.throws(() => fieldToJson({kind:"item",text:"foo\r\nInjected: yes"}));
  assert.throws(() => fieldToJson({kind:"list",text:"a".repeat(16385)}));
});
