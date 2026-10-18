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
  for(const energies of [[],[Infinity],[NaN,1],[-Infinity,0],null,Array(4097)]){
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

test('positive subnormal tail mass cannot erase a conditional loss or reward',()=>{
  const smallest=Number.MIN_VALUE;
  near(upperTailMeanOfFiniteLaw({
    probabilities:[.5,.5],values:[.5,0],tailFraction:smallest,
  }),.5);
  near(upperTailMeanOfFiniteLaw({
    probabilities:[.5,.5],values:[.25,-.25],tailFraction:smallest,
  }),.25);
  near(upperTailMeanOfFiniteLaw({
    probabilities:[.5,.5],values:[-.25,-.5],tailFraction:smallest,
  }),-.25);
  // A tiny conditional tail still has a finite scalar expectation; the
  // tail weight should not be multiplied into the value before normalizing.
  near(upperTailMeanOfFiniteLaw({
    probabilities:[.5,.5],values:[.5,0],tailFraction:1e-310,
  }),.5);
});

const admissionError={
  name:'TypeError',
  message:'complete nonempty finite joint law and finite scalar values required',
};
const readers={
  expectation:law=>finiteLawExpectation(law),
  'TV minimum':law=>extremalTotalVariationExpectation({
    ...law,radius:.2,direction:'min',
  }),
  'TV maximum':law=>extremalTotalVariationExpectation({
    ...law,radius:.2,direction:'max',
  }),
  'upper-tail mean':law=>upperTailMeanOfFiniteLaw({...law,tailFraction:.8}),
};
const inheritIndex=(array,index,descriptor)=>{
  const prototype=Object.create(Array.prototype);
  Object.defineProperty(prototype,index,descriptor);
  return Object.setPrototypeOf(array,prototype);
};

for(const [name,read] of Object.entries(readers)){
  test(name+' rejects missing indices in either finite-law array',()=>{
    for(const law of [
      {probabilities:[,,],values:[1,2]},
      {probabilities:[,1],values:[1,2]},
      {probabilities:[1,,],values:[1,2]},
      {probabilities:[.5,,.5],values:[1,2,3]},
      {probabilities:[.5,.5],values:[,,]},
      {probabilities:[0,1],values:[,2]},
      {probabilities:[1,0],values:[1,,]},
      {probabilities:[.5,0,.5],values:[1,,3]},
    ])assert.throws(()=>read(law),admissionError);
  });

  test(name+' requires own values even when a prototype fills the hole',()=>{
    for(const law of [
      {probabilities:inheritIndex([,.5],0,{value:.5}),values:[1,2]},
      {probabilities:inheritIndex([.5,,],1,{value:.5}),values:[1,2]},
      {probabilities:[.5,.5],values:inheritIndex([,2],0,{value:1})},
      {probabilities:[.5,.5],values:inheritIndex([1,,],1,{value:2})},
    ])assert.throws(()=>read(law),admissionError);
    let inheritedReads=0;
    const probabilities=inheritIndex([,.5],0,{
      get(){inheritedReads++;return .5;},
    });
    assert.throws(()=>read({probabilities,values:[1,2]}),admissionError);
    assert.equal(inheritedReads,0,'admission must not read inherited probability');
    const values=inheritIndex([,2],0,{
      get(){inheritedReads++;return 1;},
    });
    assert.throws(()=>read({probabilities:[.5,.5],values}),admissionError);
    assert.equal(inheritedReads,0,'admission must not read inherited scalar');
  });
}

test('dense laws support one and arbitrarily many finite worlds, without hidden count policy',()=>{
  for(const law of [
    {probabilities:[1],values:[2]},
    {probabilities:[0,1],values:[2,2]},
    {probabilities:[1,0],values:[2,2]},
    {probabilities:Array(512).fill(1/512),values:Array(512).fill(2)},
    {probabilities:Array(513).fill(1/513),values:Array(513).fill(2)},
    {probabilities:Array(4097).fill(1/4097),values:Array(4097).fill(2)},
  ]){
    Object.freeze(law.probabilities);Object.freeze(law.values);
    for(const read of Object.values(readers)){
      const result=read(law);
      near(typeof result==='number'?result:result.value,2);
    }
  }
  for(const law of [
    {probabilities:[],values:[]},
    {probabilities:[.5],values:[2]},
    {probabilities:Array(513),values:Array(513).fill(2)},
    {probabilities:[.5,.5],values:[1]},
    {probabilities:new Float64Array([.5,.5]),values:[1,2]},
    {probabilities:[.5,.5],values:new Float64Array([1,2])},
  ])for(const read of Object.values(readers))
    assert.throws(()=>read(law),admissionError);
});

test('dense laws retain the existing probability-mass tolerance',()=>{
  for(const offset of [-5e-10,0,5e-10]){
    const law={probabilities:[.5,.5+offset],values:[0,0]};
    for(const read of Object.values(readers))assert.doesNotThrow(()=>read(law));
  }
  for(const offset of [-2e-9,2e-9]){
    const law={probabilities:[.5,.5+offset],values:[0,0]};
    for(const read of Object.values(readers))assert.throws(()=>read(law),{
      name:'RangeError',message:'finite joint probability mass must equal one',
    });
  }
});

test('complete arrays still reject non-finite or out-of-range own values',()=>{
  for(const value of [undefined,null,'1',NaN,Infinity,-Infinity]){
    for(const read of Object.values(readers)){
      assert.throws(()=>read({probabilities:[value,.5],values:[1,2]}),admissionError);
      assert.throws(()=>read({probabilities:[.5,.5],values:[value,2]}),admissionError);
    }
  }
  for(const probability of [-Number.EPSILON,1+Number.EPSILON])
    for(const read of Object.values(readers))assert.throws(()=>read({
      probabilities:[probability,1-probability],values:[1,2],
    }),admissionError);
});

test('complete arrays with a custom prototype remain admitted',()=>{
  const probabilities=inheritIndex([.5,.5],0,{value:0});
  const values=inheritIndex([1,2],0,{value:99});
  near(finiteLawExpectation({probabilities,values}),1.5);
  near(extremalTotalVariationExpectation({probabilities,values,radius:0}).value,1.5);
  near(upperTailMeanOfFiniteLaw({probabilities,values,tailFraction:1}),1.5);
});

const boltzmannEnergyAdmissionError = {
  name: 'TypeError',
  message: 'Boltzmann law requires nonempty finite continuation energies',
};

for (const [name, operation] of [
  ['Gibbs law', finiteBoltzmannLaw],
  ['Gibbs draw', drawFiniteBoltzmann],
]) {
  test(`${name} rejects every missing own energy before normalization or entropy`, () => {
    for (const temperature of [0, Number.MIN_VALUE, 1, Number.MAX_VALUE]) {
      for (const make of [
        () => Array(1),
        () => Array(3),
        () => [, 0, 1],
        () => [0, , 1],
        () => [0, 1, ,],
        () => { const energies = Array(4096).fill(0); delete energies[4095]; return energies; },
      ]) {
        let rngCalls = 0;
        assert.throws(() => operation({
          energies: make(), temperature, rng: () => { rngCalls++; return 0; },
        }), boltzmannEnergyAdmissionError);
        assert.equal(rngCalls, 0, 'invalid energies cannot consume the caller random source');
      }
    }
  });

  test(`${name} rejects prototype-supplied energy coordinates`, () => {
    for (const temperature of [0, 1]) for (const missingIndex of [0, 1, 2]) {
      const energies = [0, 1, 2];
      delete energies[missingIndex];
      const prototype = Object.create(Array.prototype);
      Object.defineProperty(prototype, missingIndex, { value: -1 });
      Object.setPrototypeOf(energies, prototype);
      let rngCalls = 0;
      assert.equal(Object.hasOwn(energies, missingIndex), false);
      assert.throws(() => operation({
        energies, temperature, rng: () => { rngCalls++; return 0; },
      }), boltzmannEnergyAdmissionError);
      assert.equal(rngCalls, 0);
    }
  });

  test(`${name} refuses inherited energy without invoking its getter`, () => {
    for (const temperature of [0, 1]) {
      let reads = 0, rngCalls = 0;
      const energies = [0, , 1];
      const prototype = Object.create(Array.prototype);
      Object.defineProperty(prototype, 1, { get() { reads++; return -1; } });
      Object.setPrototypeOf(energies, prototype);
      assert.throws(() => operation({
        energies, temperature, rng: () => { rngCalls++; return 0; },
      }), boltzmannEnergyAdmissionError);
      assert.equal(reads, 0);
      assert.equal(rngCalls, 0);
    }
  });

  test(`${name} retains finite own-coordinate and array-shape admission`, () => {
    for (const temperature of [0, 1]) for (const energies of [
      [0, undefined, 1], [0, null], [0, '1'], [0, 1n], [0, NaN],
      [0, Infinity], [0, -Infinity], [], Array(4097),
      new Float64Array([0, 1]), { 0: 0, 1: 1, length: 2 }, null,
    ]) {
      let rngCalls = 0;
      assert.throws(() => operation({
        energies, temperature, rng: () => { rngCalls++; return 0; },
      }), boltzmannEnergyAdmissionError);
      assert.equal(rngCalls, 0);
    }
  });
}

test('Gibbs complete frozen and custom-prototype energies retain their laws and draws', () => {
  const frozen = Object.freeze([3, -1, -1, 9]);
  const custom = [3, -1, -1, 9];
  Object.setPrototypeOf(custom, Object.assign(Object.create(Array.prototype), { note: 'valid own energies' }));
  // Completeness concerns ownership, not enumerability.
  const nonEnumerable = [3, -1, -1, 9];
  Object.defineProperty(nonEnumerable, 1, { enumerable: false });
  for (const temperature of [0, Number.MIN_VALUE, 1, Number.MAX_VALUE]) {
    const expected = finiteBoltzmannLaw({ energies: [3, -1, -1, 9], temperature });
    for (const energies of [frozen, custom, nonEnumerable]) {
      assert.deepEqual(finiteBoltzmannLaw({ energies, temperature }), expected);
      for (const variate of [0, .25, .5, .9999999999999999]) {
        let rngCalls = 0;
        assert.deepEqual(drawFiniteBoltzmann({ energies, temperature, rng: () => { rngCalls++; return variate; } }),
          drawFiniteBoltzmann({ energies: [3, -1, -1, 9], temperature, rng: () => variate }));
        assert.equal(rngCalls, 1, 'an admitted draw consumes exactly one uniform variate');
      }
    }
  }
});

test('Gibbs candidate counts are a caller budget, not a fixed mathematical type limit', () => {
  for (const count of [1, 4096, 8192]) for (const temperature of [0, Number.MIN_VALUE, 1, Number.MAX_VALUE]) {
    const energies = Object.freeze(Array(count).fill(-7));
    const law = finiteBoltzmannLaw({ energies, temperature });
    assert.equal(law.minimumEnergy, -7);
    assert.deepEqual(law.probabilities, Array(count).fill(1 / count));
    assert.ok(Object.isFrozen(law) && Object.isFrozen(law.probabilities));
    assert.equal(drawFiniteBoltzmann({ energies, temperature, rng: () => 0 }).index, 0);
    assert.equal(drawFiniteBoltzmann({ energies, temperature, rng: () => .9999999999999999 }).index, count - 1);
  }
});

test('Gibbs energy admission still precedes invalid temperature and entropy', () => {
  for (const temperature of [-1, NaN, Infinity, undefined]) {
    assert.throws(() => finiteBoltzmannLaw({ energies: [0, , 1], temperature }), boltzmannEnergyAdmissionError);
    assert.throws(() => drawFiniteBoltzmann({ energies: [0, , 1], temperature }), boltzmannEnergyAdmissionError);
  }
});

// The old 4096-state boundary was a host policy leaking into pure mathematics.
// Compare values well above it without a source-owned cardinality ceiling.
test('large finite Boltzmann laws use an iterative minimum rather than spread argument limits',()=>{
  const n=75000;
  const energies=Array.from({length:n},(_,i)=>i===n-1?-2:2);
  const law=finiteBoltzmannLaw({energies,temperature:0});
  assert.equal(law.probabilities.length,n);
  assert.equal(law.minimumEnergy,-2);
  assert.equal(law.probabilities[n-1],1);
  assert.equal(drawFiniteBoltzmann({energies,temperature:0,rng:()=>0}).index,n-1);
});
