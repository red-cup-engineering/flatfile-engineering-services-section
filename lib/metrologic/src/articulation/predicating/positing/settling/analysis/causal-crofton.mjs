/**
 * A finite Crofton-style endpoint-contrast chart on ORIGINAL causal-diamond
 * points. The caller must pass the canonical K(C) built by causal.mjs;
 * causal.mjs validates that space again before invoking this supplier.
 *
 * This is exact finite mixed-difference algebra on an explicitly chosen
 * integer-valued interval observation. It is NOT quantum entropy, RT area,
 * an invariant geodesic measure, or a proof of chart gluing.
 */
// Original measured observations are bounded to 76 decimal digits. A mixed
// contrast adds four of them and may therefore require 77 digits. Separate
// the input and derived-coordinate limits so every admitted chart can be
// serialized to a packet AND decoded without silently losing integer range.
const EXACT = /^-?(0|[1-9][0-9]{0,75})$/u;
const EXACT_CONTRAST = /^-?(0|[1-9][0-9]{0,76})$/u;
function exactInteger(value) {
  if (typeof value === 'bigint' && EXACT.test(String(value))) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === 'string' && EXACT.test(value)) return BigInt(value);
  throw new TypeError('Crofton observations require exact signed integers within 76 digits');
}
function exactContrast(value) {
  if (typeof value === 'string' && EXACT_CONTRAST.test(value)) return BigInt(value);
  throw new TypeError('Crofton mixed contrasts require canonical signed integers within 77 digits');
}

function integers(list, limit, label) {
  if (!Array.isArray(list) || list.length < 2 || list.length > limit ||
      list.some((x, i) => !Number.isSafeInteger(x) || x < 0 || x >= limit ||
          (i > 0 && x <= list[i-1])))
    throw new TypeError('Crofton ' + label + ' must be distinct increasing event indices');
  return list;
}

/**
 * Only canonical strict intervals in the already-generated K(C) are valid.
 * Every cross-window interval must exist. Both endpoint windows must each
 * themselves be CAUSAL CHAINS (not just increasing array indices), since
 * a coordinate rectangle over spacelike branches is a fabricated chart.
 *
 * The chosen observable identifies source, revision and measurement unit;
 * those labels do not confer source authority or entanglement semantics.
 */
export function finiteKinematicCroftonChartOf(space, {
  leftEventIndices, rightEventIndices, intervalValues, observable,
} = {}) {
  if (space?.kind !== 'metrologic.finiteKinematicDiamondSpace.v1' ||
      !Number.isSafeInteger(space.sourceEventCount) ||
      !Array.isArray(space.points))
    throw new TypeError('Crofton chart needs original finite K(C) carrier');
  const n = space.sourceEventCount;
  const left = integers(leftEventIndices, n, 'left endpoints');
  const right = integers(rightEventIndices, n, 'right endpoints');
  if (left.at(-1) >= right[0])
    throw new TypeError('Crofton chart needs disjoint ordered endpoint windows');
  if (observable === null || typeof observable !== 'object' || Array.isArray(observable) ||
      ['sourceRef', 'revision', 'unit'].some(field =>
        typeof observable?.[field] !== 'string' ||
        observable[field].trim() === '' || observable[field].length > 512))
    throw new TypeError('Crofton chart requires sourceRef, revision and unit');
  const points = new Map(space.points.map((point, i) =>
    [point.lowerEventIndex + ':' + point.upperEventIndex, i]));
  if (points.size !== space.points.length ||
      space.pointCount !== space.points.length)
    throw new TypeError('Crofton chart needs distinct canonical K(C) points');
  const hasInterval = (a,b) => points.has(a + ':' + b);
  for (const chain of [left,right]) for (let i=1;i<chain.length;i++)
    if (!hasInterval(chain[i-1],chain[i]))
      throw new RangeError('Crofton chart endpoint window is not a causal chain');
  const pointIndices = left.map(a => right.map(b => {
    const point = points.get(a + ':' + b);
    if (point === undefined)
      throw new RangeError('Crofton chart has a missing strict interval corner: ' + a + ':' + b);
    return point;
  }));
  const m = left.length, k = right.length;
  if (!Array.isArray(intervalValues) || intervalValues.length !== m ||
      intervalValues.some(row => !Array.isArray(row) || row.length !== k))
    throw new TypeError('Crofton observations must cover all admitted chart corners');
  const S = intervalValues.map(row => row.map(exactInteger));
  const contrasts = Array.from({length:m-1},(_,i) =>
    Array.from({length:k-1},(_,j) =>
      S[i][j] + S[i+1][j+1] - S[i][j+1] - S[i+1][j]));
  // A 2D prefix gives O(1) reconstruction per table entry, reusing
  // the chosen boundary gauge. Neither storage nor runtime is claimed
  // improved over the raw table without an actual consumer benchmark.
  const prefix = Array.from({length:m},()=>Array(k).fill(0n));
  for (let i=1;i<m;i++) for(let j=1;j<k;j++)
    prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1] + contrasts[i-1][j-1];
  const reconstruct = (i,j) => S[i][0] + S[0][j] - S[0][0] + prefix[i][j];
  for (let i=0;i<m;i++) for (let j=0;j<k;j++)
    if (reconstruct(i,j)!==S[i][j])
      throw new Error('Crofton boundary + mixed contrast reconstruction failed');
  const totalContrast=contrasts.flat().reduce((sum,x)=>sum+x,0n);
  const fourCorners=S[0][0]+S[m-1][k-1]-S[0][k-1]-S[m-1][0];
  if (totalContrast!==fourCorners)
    throw new Error('Crofton finite telescoping identity failed');
  const observedNonnegative=contrasts.every(row=>row.every(x=>x>=0n));
  const freezeMatrix = mat => Object.freeze(mat.map(row=>Object.freeze(row.map(String))));
  return Object.freeze({
    kind:'metrologic.kinematicFiniteCroftonContrast.v1',
    sourceKind:space.kind,
    sourceEventCount:n,
    leftEventIndices:Object.freeze([...left]),
    rightEventIndices:Object.freeze([...right]),
    pointIndices:Object.freeze(pointIndices.map(row=>Object.freeze(row))),
    observable:Object.freeze({sourceRef:observable.sourceRef,revision:observable.revision,unit:observable.unit}),
    firstRow:Object.freeze(S[0].map(String)),
    firstColumn:Object.freeze(S.map(row=>String(row[0]))),
    mixedContrasts:freezeMatrix(contrasts),
    reconstructedValues:freezeMatrix(S.map((row,i)=>row.map((_,j)=>reconstruct(i,j)))),
    totalContrast:String(totalContrast),
    fourCornerContrast:String(fourCorners),
    gaugeRank:m+k-1,
    mixedContrastRank:(m-1)*(k-1),
    allContrastsNonnegative:observedNonnegative,
    positivityStatus:observedNonnegative?'nonnegative-chosen-observations':'signed-chosen-observations',
    reconstruction:'exact-finite-boundary-gauge-plus-mixed-differences',
    physicalEntropy:'not-established-by-observation',
    croftonGeodesicMeasure:'not-established-by-interval-incidence',
    status:'conditional-mathematical-shadow',
  });
}

/**
 * A genuinely transferable boundary packet, not a table disguised as an
 * inverse. The full table is omitted. This change of coordinates stores
 * EXACTLY m*n scalars: m+n-1 gauge cells plus (m-1)*(n-1) contrasts.
 * It offers no automatic compression or cryptographic authentication.
 */
export function finiteKinematicCroftonBoundaryPacketOf(chart) {
  if (chart?.kind !== 'metrologic.kinematicFiniteCroftonContrast.v1')
    throw new TypeError('Crofton packet requires a qualified source chart');
  return Object.freeze({
    kind:'metrologic.kinematicFiniteCroftonBoundaryPacket.v1',
    sourceKind:chart.sourceKind, sourceEventCount:chart.sourceEventCount,
    leftEventIndices:Object.freeze([...chart.leftEventIndices]),
    rightEventIndices:Object.freeze([...chart.rightEventIndices]),
    pointIndices:Object.freeze(chart.pointIndices.map(row=>Object.freeze([...row]))),
    observable:Object.freeze({...chart.observable}),
    firstRow:Object.freeze([...chart.firstRow]),
    firstColumn:Object.freeze([...chart.firstColumn]),
    mixedContrasts:Object.freeze(chart.mixedContrasts.map(row=>Object.freeze([...row]))),
    sourceRights:'not-attested-by-packet',
    physicalInterpretation:'not-claimed',
  });
}

/**
 * Decode using ONLY separately transferred boundary + contrast coordinates.
 * The original intervalValue table is absent. The source space is passed in
 * separately and must be certified by causal.mjs before calling this supplier.
 * Deliberately refuse omitted gauge, forged interval points and inconsistent
 * endpoint/observable types. The inverse checks algebra, NOT testimony truth.
 */
export function finiteKinematicCroftonDecodeOf(space, packet) {
  if (packet?.kind !== 'metrologic.kinematicFiniteCroftonBoundaryPacket.v1')
    throw new TypeError('Crofton decode needs an explicit boundary packet');
  const row = packet.firstRow, column = packet.firstColumn, omega = packet.mixedContrasts;
  if (!Array.isArray(row)||!Array.isArray(column)||
      row.length < 2||column.length < 2||
      !Array.isArray(omega)||omega.length!==column.length-1||
      omega.some(r=>!Array.isArray(r)||r.length!==row.length-1))
    throw new TypeError('Crofton packet lacks complete gauge/contrast coordinates');
  const n=row.length,m=column.length;
  const top=row.map(exactInteger),first=column.map(exactInteger);
  if(top[0]!==first[0])throw new TypeError('Crofton boundary gauge disagrees at shared corner');
  const D=omega.map(r=>r.map(exactContrast));
  const values=Array.from({length:m},()=>Array(n).fill(0n));
  for(let j=0;j<n;j++)values[0][j]=top[j];
  for(let i=0;i<m;i++)values[i][0]=first[i];
  // Local 2D recurrence: independently reconstructs all interior values,
  // not by rereading original S or forwarding the original output table.
  for(let i=1;i<m;i++)for(let j=1;j<n;j++)
    values[i][j]=values[i-1][j]+values[i][j-1]-values[i-1][j-1]+D[i-1][j-1];
  const regenerated=finiteKinematicCroftonChartOf(space,{
    leftEventIndices:packet.leftEventIndices,
    rightEventIndices:packet.rightEventIndices,
    observable:packet.observable,intervalValues:values,
  });
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(packet.sourceKind!==regenerated.sourceKind||
      packet.sourceEventCount!==regenerated.sourceEventCount||
      !same(packet.pointIndices,regenerated.pointIndices)||
      !same(packet.firstRow,regenerated.firstRow)||
      !same(packet.firstColumn,regenerated.firstColumn)||
      !same(packet.mixedContrasts,regenerated.mixedContrasts))
    throw new TypeError('Crofton packet contradicts source interval coordinates');
  return Object.freeze({...regenerated,
    kind:'metrologic.kinematicFiniteCroftonDecoded.v1',
    reconstructionInput:'boundary-gauge-and-contrasts-only',
    sourceRights:'not-attested-by-packet',
    authenticOriginalObservation:'not-attested-by-algebra',
  });
}

/**
 * The actual restriction/gluing obstruction: compare TWO independently
 * decoded source-qualified charts at overlapping ORIGINAL K(C) point indices.
 * No overlap is UNKNOWN, not agreement; one mismatch forbids gluing these
 * chosen observations. Equality only on these two charts says nothing about
 * arbitrary third charts, full sheaves, or geometric RT bulk reconstruction.
 */
export function finiteKinematicCroftonOverlapOf(space, leftPacket, rightPacket) {
  const left=finiteKinematicCroftonDecodeOf(space,leftPacket);
  const right=finiteKinematicCroftonDecodeOf(space,rightPacket);
  const fields=['sourceRef','revision','unit'];
  if(fields.some(k=>left.observable[k]!==right.observable[k]))
    throw new TypeError('Crofton overlapping charts require one observation source, revision and unit');
  const seen=new Map();
  for(let i=0;i<left.pointIndices.length;i++)
    for(let j=0;j<left.pointIndices[i].length;j++)
      seen.set(left.pointIndices[i][j],left.reconstructedValues[i][j]);
  let overlapCount=0;
  const conflicts=[];
  for(let i=0;i<right.pointIndices.length;i++)
    for(let j=0;j<right.pointIndices[i].length;j++){
      const id=right.pointIndices[i][j];
      if(!seen.has(id))continue;
      overlapCount++;
      const first=seen.get(id),second=right.reconstructedValues[i][j];
      if(first!==second)conflicts.push(Object.freeze({
        pointIndex:id, firstValue:first, secondValue:second,
      }));
    }
  const status=overlapCount===0?'unassayed-no-overlap'
    :conflicts.length?'incompatible-on-overlap':'compatible-on-overlap-only';
  return Object.freeze({
    kind:'metrologic.kinematicFiniteCroftonOverlap.v1',
    status,overlapCount,
    conflicts:Object.freeze(conflicts),
    observation:Object.freeze({...left.observable}),
    implication:'finite-chart-values-only; not a global sheaf or physical geometry',
  });
}

/**
 * Set-theoretic finite gluing, downstream of independently decoded ORIGINAL
 * K(C) interval charts. Pairwise equality on shared point indices is exactly
 * the condition for one unambiguous scalar assignment on their UNION.
 * A conflicting chart refuses a merged value; unobserved kinematic points
 * remain UNKNOWN. Neither this union nor chart overlap asserts a sheaf,
 * Lorentzian metric, quantum state or physical bulk reconstruction.
 */
export function finiteKinematicCroftonGlueOf(space, packets) {
  if(!Array.isArray(packets) || packets.length===0 || packets.length>64)
    throw new RangeError('Crofton gluing requires 1..64 boundary packets');
  const charts=packets.map(p=>finiteKinematicCroftonDecodeOf(space,p));
  const observable=charts[0].observable;
  if(charts.some(c=>['sourceRef','revision','unit'].some(k=>c.observable[k]!==observable[k])))
    throw new TypeError('Crofton gluing requires the same observation source, revision and unit');
  const observed=new Map(),conflicts=[];
  let repeatedIncidences=0;
  for(let packetIndex=0;packetIndex<charts.length;packetIndex++){
    const c=charts[packetIndex];
    for(let i=0;i<c.pointIndices.length;i++)
      for(let j=0;j<c.pointIndices[i].length;j++){
        const pointIndex=c.pointIndices[i][j];
        const value=c.reconstructedValues[i][j];
        const prev=observed.get(pointIndex);
        if(prev){
          repeatedIncidences++;
          if(prev.value!==value)conflicts.push(Object.freeze({
            pointIndex,firstValue:prev.value,secondValue:value,
            firstPacketIndex:prev.packetIndices[0],secondPacketIndex:packetIndex,
          }));
          else prev.packetIndices.push(packetIndex);
        }else observed.set(pointIndex,{value,packetIndices:[packetIndex]});
      }
  }
  const coveredPointIndices=Object.freeze([...observed.keys()].sort((a,b)=>a-b));
  const uncoveredPointIndices=Object.freeze(Array.from(
    {length:space.pointCount},(_,i)=>i).filter(i=>!observed.has(i)));
  const conflictFree=conflicts.length===0;
  const records=Object.freeze(conflictFree?coveredPointIndices.map(pointIndex=>
    Object.freeze({pointIndex,value:observed.get(pointIndex).value,
      supportingPacketIndices:Object.freeze([...observed.get(pointIndex).packetIndices])})):[]);
  const status=!conflictFree?'conflicted-refuse-global-assignment'
    : uncoveredPointIndices.length?'partial-union-only'
      :'complete-finite-point-assignment-only';
  return Object.freeze({
    kind:'metrologic.kinematicFiniteCroftonGlue.v1',
    status,
    sourceKind:space.kind,
    sourcePointCount:space.pointCount,
    observable:Object.freeze({...observable}),
    packetCount:charts.length,
    observedPointCount:coveredPointIndices.length,
    repeatedIncidences,
    coveredPointIndices,uncoveredPointIndices,
    conflicts:Object.freeze(conflicts),
    records,
    originalStateOrRights:'not-attested-by-algebra',
    physicalReconstruction:'not-established',
  });
}
