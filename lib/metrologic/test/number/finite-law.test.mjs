import test from 'node:test';
import assert from 'node:assert/strict';
import {
  finiteLawExpectation,
  extremalTotalVariationExpectation,
  upperTailMeanOfFiniteLaw,
} from '../../src/number/finite-law.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,String(a)+' != '+String(b));

test('two-state finite-law TV extrema use one global probability distribution',()=>{
  const probabilities=[.5,.5],values=[2,-1];
  near(finiteLawExpectation({probabilities,values}),.5);
  const low=extremalTotalVariationExpectation({
    probabilities,values,radius:.2,direction:'min',
  });
  const high=extremalTotalVariationExpectation({
    probabilities,values,radius:.2,direction:'max',
  });
  near(low.value,-.1);near(high.value,1.1);
  near(low.usedTotalVariation,.2);near(high.usedTotalVariation,.2);
  near(low.probabilities[0],.3);
  near(low.probabilities[1],.7);
  near(high.probabilities[0],.7);
  near(high.probabilities[1],.3);
  assert.ok(Object.isFrozen(low.probabilities));
});

test('upper tail selects probability mass, including a fractional boundary world',()=>{
  const probabilities=[.5,.5],losses=[-2,1];
  near(upperTailMeanOfFiniteLaw({probabilities,values:losses,tailFraction:.8}),-.125);
  near(upperTailMeanOfFiniteLaw({probabilities,values:losses,tailFraction:1}),-.5);
  const worst=extremalTotalVariationExpectation({
    probabilities,values:losses,radius:.2,direction:'max',
  });
  near(upperTailMeanOfFiniteLaw({
    probabilities:worst.probabilities,values:losses,tailFraction:.8,
  }),.625);
});

test('tiny donor cannot truncate a later large transport',()=>{
  const probabilities=[.6,1e-20,.4],values=[-10,100,10];
  const worst=extremalTotalVariationExpectation({
    probabilities,values,radius:.35,direction:'min',
  });
  near(worst.value,-9);
  near(worst.usedTotalVariation,.35);
  near(worst.probabilities.reduce((a,b)=>a+b,0),1);
  const best=extremalTotalVariationExpectation({
    probabilities,values,radius:.35,direction:'max',
  });
  near(best.value,36.5);
});

test('split worlds do not change value or upper-tail probability mass',()=>{
  const a=upperTailMeanOfFiniteLaw({
    probabilities:[.4,.6],values:[-2,3],tailFraction:.7,
  });
  const b=upperTailMeanOfFiniteLaw({
    probabilities:[.2,.2,.6],values:[-2,-2,3],tailFraction:.7,
  });
  near(a,b);
});

test('extremal law agrees with boundary candidates for binary finite simplex',()=>{
  for(const p of [0,.1,.2,.5,.75,.9,1]){
    for(const radius of [0,.1,.2,.4,1]){
      const probabilities=[p,1-p],values=[-3,7];
      const low=extremalTotalVariationExpectation({
        probabilities,values,radius,direction:'min',
      });
      const high=extremalTotalVariationExpectation({
        probabilities,values,radius,direction:'max',
      });
      const candidates=[0,1,p,Math.max(0,p-radius),Math.min(1,p+radius)]
        .filter(x=>Math.abs(x-p)<=radius+1e-12);
      const estimates=candidates.map(x=>-3*x+7*(1-x));
      near(low.value,Math.min(...estimates));
      near(high.value,Math.max(...estimates));
    }
  }
});

test('invalid probability laws and numerical preferences fail closed',()=>{
  const valid={probabilities:[.5,.5],values:[1,2]};
  for(const bad of [
    {probabilities:[.3,.3],values:[1,2]},
    {probabilities:[-1,2],values:[1,2]},
    {probabilities:[.5,.5],values:[NaN,2]},
    {probabilities:[.5],values:[1]},
    {probabilities:[.5,.5],values:[1]},
  ]){
    assert.throws(()=>finiteLawExpectation(bad));
    assert.throws(()=>extremalTotalVariationExpectation({...bad,radius:.2}));
    assert.throws(()=>upperTailMeanOfFiniteLaw({...bad,tailFraction:.8}));
  }
  for(const radius of [-.1,1.1,NaN,Infinity]){
    assert.throws(()=>extremalTotalVariationExpectation({...valid,radius}));
  }
  for(const tailFraction of [0,-1,1.1,NaN,Infinity]){
    assert.throws(()=>upperTailMeanOfFiniteLaw({...valid,tailFraction}));
  }
});
