import test from "node:test";
import assert from "node:assert/strict";
import { gyrobifastigiumJ26 as j26 } from "../src/articulation/predicating/geometry/spatial/gyrobifastigium-j26.mjs";

const orientedIncidences = geometry => {
  const edges = new Map();
  for (const face of geometry.faces) {
    for (let i=0;i<face.vertices.length;i++) {
      const a=face.vertices[i], b=face.vertices[(i+1)%face.vertices.length];
      const key=JSON.stringify([a,b].sort());
      const entries=edges.get(key)??[];
      entries.push({face:face.name, a, b});
      edges.set(key,entries);
    }
  }
  return edges;
};

test("original Obsmetrologia J26 faces form one closed, consistently oriented exterior",()=>{
  assert.deepEqual(j26.faces.map(f=>f.name),[
    "leftTop","leftBottom","leftSide0","leftSide1",
    "rightTop","rightBottom","rightSide0","rightSide1"]);
  assert.equal(Object.keys(j26.vertices).length,8);
  assert.deepEqual(j26.faces.map(f=>f.vertices.length),[3,3,4,4,3,3,4,4]);
  const edges=orientedIncidences(j26);
  assert.equal(edges.size,14);
  for (const [edge,incident] of edges) {
    assert.equal(incident.length,2,edge+" has exactly two exterior faces");
    assert.equal(incident[0].a,incident[1].b,edge+" oriented faces oppose");
    assert.equal(incident[0].b,incident[1].a,edge+" oriented faces oppose");
  }
  assert.ok(j26.faces.every(f=>Object.isFrozen(f.vertices)));
});

test("reversing just one correctly oriented exterior face is a concrete boundary defect",()=>{
  const mutant={...j26,faces:j26.faces.map(face=>face.name!=="rightTop"
    ? face : {...face,vertices:[...face.vertices].reverse()})};
  const bad=[...orientedIncidences(mutant).values()].filter(inc=>
    inc.length!==2 || inc[0].a===inc[1].a);
  assert.equal(bad.length,3,"a triangular face reversal corrupts all three incident edges");
});
