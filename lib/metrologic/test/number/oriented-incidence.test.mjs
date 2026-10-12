import test from 'node:test';
import assert from 'node:assert/strict';
import {toInt} from '@red-cup-engineering/exact-number-data-service/exact-number';
import {
  boundaryOfOrientedEdges,
} from '../../src/articulation/predicating/positing/settling/analysis/laplacian.mjs';

const values=boundary=>boundary.map(toInt);

test('a three-premise star has negative unit sources and a positive triple proof target',()=>{
  const result=boundaryOfOrientedEdges(4,[[0,3],[1,3],[2,3]]);
  assert.deepEqual(values(result),[-1,-1,-1,3]);
  assert.equal(Object.isFrozen(result),true);
});

test('reversal negates the boundary even when the underlying undirected edges are unchanged',()=>{
  const edges=[[0,3],[1,3],[2,3]];
  const forward=values(boundaryOfOrientedEdges(4,edges));
  const reversed=values(boundaryOfOrientedEdges(4,edges.map(([a,b])=>[b,a])));
  assert.deepEqual(reversed,forward.map(x=>-x));
  assert.equal(forward.reduce((sum,x)=>sum+x,0),0);
});

test('self-references have zero boundary and parallel edges keep multiplicity',()=>{
  assert.deepEqual(values(boundaryOfOrientedEdges(2,[[0,0],[1,1]])),[0,0]);
  assert.deepEqual(values(boundaryOfOrientedEdges(2,[[0,1],[0,1]])),[-2,2]);
});

test('invalid or malicious graph indices fail closed before any apparent proof',()=>{
  for(const args of [
    [0,[]],[4097,[]],[-1,[]],[3,[[0,3]]],[3,[[0,-1]]],
    [3,[[NaN,2]]],[3,[[1,2,0]]],[3,[{}]],[3,'source-to-proof'],
  ])assert.throws(()=>boundaryOfOrientedEdges(...args),TypeError);
});
