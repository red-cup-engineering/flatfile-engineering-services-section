/**
 * Finite probability laws over an already named family of possible worlds.
 *
 * A weight is a mathematical probability and must never be silently read as
 * SignCell/SignChain FOUR support, a source authentication witness, or a
 * venue-implied event probability. World names, source clocks, currencies,
 * decisions and custody belong to the consumer's existing carriers.
 *
 * These are finite real-arithmetic operations realized in binary64. They
 * produce NUMERICAL conditional deductions, not theorem receipts. In
 * particular, the TV radius is a premise: this library does not infer a
 * confidence set or certify that the unknown empirical law is in the ball.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const sum=values=>{
  let total=0,compensation=0;
  for(const x of values){
    const y=x-compensation,next=total+y;
    compensation=(next-total)-y;
    total=next;
  }
  return total;
};

function admit({probabilities,values}){
  if(!Array.isArray(probabilities)||probabilities.length<2||
    probabilities.length>512||!Array.isArray(values)||
    probabilities.length!==values.length)
    throw new TypeError('bounded finite joint law and complete finite scalar values required');
  for(let i=0;i<probabilities.length;i++){
    if(!Object.hasOwn(probabilities,i)||!Object.hasOwn(values,i)||
      !finite(probabilities[i])||probabilities[i]<0||probabilities[i]>1||
      !finite(values[i]))
      throw new TypeError('bounded finite joint law and complete finite scalar values required');
  }
  const mass=sum(probabilities);
  if(Math.abs(mass-1)>1e-9)
    throw new RangeError('finite joint probability mass must equal one');
  return mass;
}

/** Linearity of expectation on the admitted common finite probability space. */
export function finiteLawExpectation({probabilities,values}={}){
  admit({probabilities,values});
  return sum(probabilities.map((p,i)=>p*values[i]));
}

/**
 * Min/max of E_q[value] on TV(q,p)<=radius, q on the SAME finite simplex.
 *
 * The extremal mass transport is ordered: transfer probability from maximal
 * values to minimal values for a minimum (reverse for a maximum), until the
 * given radius is spent or no improving transport remains. This realizes the
 * finite rearrangement/transfer argument; it does NOT optimize portfolio
 * feasibility, risk tolerance, or model calibration.
 *
 * Separate zero-based incoming/outgoing ledgers are essential. In-place
 * floating addition can lose a tiny source world when its destination has a
 * much larger weight and accidentally abort all remaining transfers.
 */
export function extremalTotalVariationExpectation({
  probabilities,values,radius,direction='min',
}={}){
  admit({probabilities,values});
  if(!finite(radius)||radius<0||radius>1||
     !['min','max'].includes(direction))
    throw new TypeError('bounded TV radius and extremum direction required');
  const minimize=direction==='min';
  const indices=probabilities.map((_,i)=>i);
  const donors=[...indices].sort((a,b)=>
    (minimize?values[b]-values[a]:values[a]-values[b])||a-b);
  const recipients=[...indices].sort((a,b)=>
    (minimize?values[a]-values[b]:values[b]-values[a])||a-b);
  const inflow=probabilities.map(()=>0),outflow=probabilities.map(()=>0);
  let di=0,ri=0,remaining=radius;
  while(remaining>0&&di<indices.length&&ri<indices.length){
    const d=donors[di],r=recipients[ri];
    if(minimize?values[d]<=values[r]:values[d]>=values[r])break;
    const available=probabilities[d]-outflow[d];
    const capacity=1-probabilities[r]-inflow[r];
    if(available<=0){di++;continue;}
    if(capacity<=0){ri++;continue;}
    const amount=Math.min(remaining,available,capacity);
    if(amount<=0)break;
    outflow[d]+=amount;inflow[r]+=amount;remaining-=amount;
    if(outflow[d]>=probabilities[d])di++;
    if(inflow[r]>=1-probabilities[r])ri++;
  }
  const extremal=probabilities.map((p,i)=>p+inflow[i]-outflow[i]);
  return Object.freeze({
    value:sum(extremal.map((p,i)=>p*values[i])),
    probabilities:Object.freeze(extremal),
    usedTotalVariation:sum(extremal.map((p,i)=>
      Math.abs(p-probabilities[i])))/2,
  });
}

/**
 * Upper tail mean of scalar values, by PROBABILITY MASS, not row count.
 *
 * If the desired mass cuts through one world, only that fractional mass
 * contributes. With tailFraction=1 this is the ordinary expectation.
 * A caller computing downside expected shortfall passes losses=-netPayoffs.
 */
export function upperTailMeanOfFiniteLaw({
  probabilities,values,tailFraction,
}={}){
  const total=admit({probabilities,values});
  if(!finite(tailFraction)||tailFraction<=0||tailFraction>1)
    throw new TypeError('finite strictly positive tail mass fraction <= one required');
  const target=tailFraction*total;
  if(!(target>0))throw new RangeError('tail mass underflows binary64');
  const ranks=values.map((value,i)=>({
    value,probability:probabilities[i],i,
  })).sort((a,b)=>b.value-a.value||a.i-b.i);
  let remaining=target;
  const contributions=[];
  for(const row of ranks){
    if(remaining<=0)break;
    const taken=Math.min(remaining,row.probability);
    // Normalize probability mass BEFORE multiplying by value: for a tiny
    // positive tail target, taken * value can underflow to zero even though
    // the conditional mean is exactly that nonzero value.
    contributions.push((taken/target)*row.value);
    remaining-=taken;
  }
  if(remaining>1e-12)
    throw new RangeError('finite law lacks sufficient upper-tail probability mass');
  return sum(contributions);
}

/**
 * Normalize the Gibbs/Boltzmann law over an actual finite list of continuation
 * energies. These are binary64 numerical valuations, never FOUR evidence or a
 * proof that a proposed transition is authorized.
 *
 * Compute exp(-(E - min E)/T) rather than exp(-E/T): at least one weight is
 * exactly 1 even for very large absolute energies, so the partition function
 * cannot underflow to zero. T=0 is the well-defined cold limit: uniform mass
 * over all exactly tied minimum-energy states.
 */
export function finiteBoltzmannLaw({ energies, temperature } = {}) {
  if (!Array.isArray(energies) || energies.length === 0 ||
      energies.length > 4096)
    throw new TypeError('Boltzmann law requires 1–4096 finite continuation energies');
  for (let index = 0; index < energies.length; index++) {
    if (!Object.hasOwn(energies, index) || !finite(energies[index]))
      throw new TypeError('Boltzmann law requires 1–4096 finite continuation energies');
  }
  if (!finite(temperature) || temperature < 0)
    throw new RangeError('Boltzmann temperature must be finite and nonnegative');
  const minEnergy = Math.min(...energies);
  let probabilities;
  if (temperature === 0) {
    const count = energies.filter(energy => energy === minEnergy).length;
    probabilities = energies.map(energy => energy === minEnergy ? 1 / count : 0);
  } else {
    // Subtract before division to preserve nearby energies. If two finite
    // extreme energies have an overflowing difference, compare their
    // dimensionless energies instead: (E/T) - (minE/T). The latter may be
    // finite even when E-minE is not (e.g. ±1e308 at T=1e308).
    const weights = energies.map(energy => {
      const difference = energy - minEnergy;
      let scaled = difference / temperature;
      if (!Number.isFinite(scaled) && !Number.isFinite(difference)) {
        const upper = energy / temperature;
        const lower = minEnergy / temperature;
        scaled = Number.isFinite(upper) && Number.isFinite(lower)
          ? upper - lower : Infinity;
      }
      return Math.exp(-scaled);
    });
    const partition = sum(weights);
    // At least one normalized numerator is exactly exp(0) = 1.
    if (!finite(partition) || partition < 1)
      throw new RangeError('Boltzmann partition function is not finite');
    probabilities = weights.map(weight => weight / partition);
  }
  return Object.freeze({
    minimumEnergy: minEnergy, temperature,
    probabilities: Object.freeze(probabilities),
  });
}

/**
 * Draw one index in the finite normalized law from a caller-owned uniform
 * variate. Reject missing/invalid entropy instead of silently selecting the
 * final alternative. The strict inequality prevents zero-probability entries
 * from being selected when the variate is exactly zero.
 */
export function drawFiniteBoltzmann({ energies, temperature, rng } = {}) {
  const law = finiteBoltzmannLaw({ energies, temperature });
  if (typeof rng !== 'function') throw new TypeError('Boltzmann draw requires an injected random source');
  const variate = rng();
  if (!finite(variate) || variate < 0 || variate >= 1)
    throw new RangeError('Boltzmann variate must be in [0, 1)');
  let cumulative = 0;
  let chosen = -1;
  let lastPositive = -1;
  for (let index = 0; index < law.probabilities.length; index++) {
    const probability = law.probabilities[index];
    if (probability <= 0) continue;
    lastPositive = index;
    cumulative += probability;
    if (variate < cumulative) { chosen = index; break; }
  }
  if (chosen === -1) chosen = lastPositive; // protect rounded final mass
  if (chosen < 0) throw new RangeError('Boltzmann law has no selectable state');
  return Object.freeze({ index: chosen, variate,
    probabilities: law.probabilities,
    chosenProbability: law.probabilities[chosen],
  });
}
