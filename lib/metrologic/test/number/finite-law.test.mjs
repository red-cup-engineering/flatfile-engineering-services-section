import test from 'node:test';
import assert from 'node:assert/strict';
import {
  finiteLawExpectation,
  extremalTotalVariationExpectation,
  upperTailMeanOfFiniteLaw,
  finiteBoltzmannLaw,
  drawFiniteBoltzmann,
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

test('Gibbs finite-law agrees with its exact two-state ratio and temperature limit',()=>{
  const hot=finiteBoltzmannLaw({energies:[0,Math.log(2)],temperature:1});
  near(hot.probabilities[0],2/3);
  near(hot.probabilities[1],1/3);
  near(hot.probabilities.reduce((a,b)=>a+b,0),1);
  assert.ok(Object.isFrozen(hot) && Object.isFrozen(hot.probabilities));
  assert.deepEqual(finiteBoltzmannLaw({
    energies:[8,1,1,5],temperature:0,
  }).probabilities,[0,.5,.5,0]);
  assert.deepEqual(finiteBoltzmannLaw({
    energies:[0],temperature:0,
  }).probabilities,[1]);
});

test('absolute-energy scales cannot turn a finite Gibbs law into NaN or the wrong candidate',()=>{
  const huge=finiteBoltzmannLaw({
    energies:[1e300,1e300+1e286,1e300+3e286],
    temperature:1e286,
  });
  assert.ok(huge.probabilities.every(p=>Number.isFinite(p)&&p>=0&&p<=1));
  // The first energy is minimal, but the next lies about one thermal unit
  // away; a large common offset does not make the Gibbs law deterministic.
  assert.ok(huge.probabilities[0]>.5);
  assert.ok(huge.probabilities[0]>huge.probabilities[1]);
  assert.ok(huge.probabilities[1]>huge.probabilities[2]);
  near(huge.probabilities.reduce((a,b)=>a+b,0),1);
  const signCrossing=finiteBoltzmannLaw({
    energies:[-1e308,1e308],temperature:1,
  });
  assert.deepEqual(signCrossing.probabilities,[1,0]);
  const extremelyCold=finiteBoltzmannLaw({
    energies:[100000,100010,100020],temperature:Number.MIN_VALUE,
  });
  assert.deepEqual(extremelyCold.probabilities,[1,0,0]);
  const commonShift=finiteBoltzmannLaw({
    energies:[1000001,1000003,1000004],temperature:2,
  });
  const unshifted=finiteBoltzmannLaw({
    energies:[1,3,4],temperature:2,
  });
  assert.deepEqual(commonShift.probabilities,unshifted.probabilities);
});

test('zero-probability moves are never selected even for the zero variate',()=>{
  const first=drawFiniteBoltzmann({energies:[20,0,0],temperature:0,rng:()=>0});
  assert.equal(first.index,1);
  assert.equal(first.chosenProbability,.5);
  const next=drawFiniteBoltzmann({energies:[20,0,0],temperature:0,rng:()=>.5});
  assert.equal(next.index,2);
  const last=drawFiniteBoltzmann({energies:[20,0,0],temperature:0,rng:()=>.999999999});
  assert.equal(last.index,2);
  assert.equal(first.variate,0);
  assert.ok(Object.isFrozen(first));
});

test('finite Gibbs selection is deterministic for an injected quantile across all intervals',()=>{
  const probs=finiteBoltzmannLaw({energies:[2,1,3],temperature:1}).probabilities;
  for(let i=0;i<probs.length;i++){
    const left=probs.slice(0,i).reduce((a,b)=>a+b,0);
    const r=left+probs[i]*.5;
    assert.equal(drawFiniteBoltzmann({energies:[2,1,3],temperature:1,rng:()=>r}).index,i);
  }
  assert.equal(drawFiniteBoltzmann({energies:[5],temperature:0,rng:()=>.999999}).index,0);
});

test('all finite generative scores produce finite, normalized nonnegative probabilities',()=>{
  for(let count=1;count<=512;count+=17){
    const energies=Array.from({length:count},(_,i)=>
      i%2===0 ? i*1e4-2e6 : -i*1e4+3e5);
    for(const temp of [0,1e-9,.2,1,100,1e50]){
      const p=finiteBoltzmannLaw({energies,temperature:temp}).probabilities;
      assert.equal(p.length,count);
      assert.ok(p.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
      near(p.reduce((a,b)=>a+b,0),1);
    }
  }
});

test('nonfinite energies, temperatures and entropy are mathematical refusals',()=>{
  for(const energies of [[],[Infinity],[NaN,1],[-Infinity,0],null,Array(4097).fill(0)]){
    assert.throws(()=>finiteBoltzmannLaw({energies,temperature:1}));
  }
  for(const temperature of [-1,Infinity,NaN,undefined]){
    assert.throws(()=>finiteBoltzmannLaw({energies:[1,2],temperature}));
  }
  for(const r of [-.1,1,1.1,NaN,Infinity,undefined,'0.5']){
    assert.throws(()=>drawFiniteBoltzmann({
      energies:[0,1],temperature:1,rng:()=>r,
    }),/variate/);
  }
  assert.throws(()=>drawFiniteBoltzmann({energies:[0],temperature:1}),/random source/);
});

test('finite giant opposite-sign energies retain the correct temperature-scaled Gibbs ratio',()=>{
  const energies=[-1e308,1e308];
  const law=finiteBoltzmannLaw({energies,temperature:1e308});
  const expected=1/(1+Math.exp(-2));
  near(law.probabilities[0],expected);
  near(law.probabilities[1],1-expected);
  assert.ok(law.probabilities[1]>.1,
    'opposite-sign subtraction must not falsely force a zero-temperature law');
  near(law.probabilities.reduce((a,b)=>a+b,0),1);
  const mirrored=finiteBoltzmannLaw({
    energies:[1e308,-1e308],temperature:1e308,
  });
  near(mirrored.probabilities[0],law.probabilities[1]);
  const tiny=finiteBoltzmannLaw({
    energies:[-1e308,1e308],temperature:Number.MIN_VALUE,
  });
  assert.deepEqual(tiny.probabilities,[1,0]);
});
