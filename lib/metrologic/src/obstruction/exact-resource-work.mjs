/**
 * Bounded preflight and delivery contract for original Math Engineering.
 * Admission does not compute the expensive optimum. Work retains explicit
 * semantics and self-checks the funded result against an independent
 * source-side primal/dual verifier before returning it.
 */
import { solveExactResourceFlow } from "./exact-resource-flow.mjs";
import { verifyResourceFlowCertificate } from "./resource-flow-verifier.mjs";
import { divide, ratAdd, ratCompare, ratEqual, ratMultiply, ratSubtract, ratZero, rationalOfBigInts } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { resourceRatioString } from "./resource-flow-wire.mjs";

export function admitExactResourceFlowWork(input) {
  // Bounded typed admission before an expensive optimization / paid execution.
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new TypeError("request must be a JSON object");
  }
  const shape=(v,fields,where)=>{
    if(!v||Array.isArray(v)||typeof v!=="object"||Object.keys(v).some(k=>!fields.includes(k)))
      throw new TypeError(where+" has unsupported or missing object shape");
  };
  shape(input,["nodes","links","sources","demands","budget"],"request");
  const ranges=[["nodes",48],["links",128],["sources",48],["demands",48]];
  for(const [key,max] of ranges){
    if(!Array.isArray(input[key]) || input[key].length>max || (key==="nodes"&&input[key].length===0))
      throw new RangeError(key+" must be an array within the work bound");
  }
  const id=s=>typeof s==="string" && /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(s);
  const rational=s=>(typeof s==="number"&&Number.isSafeInteger(s)&&s>=0&&s<=99999999999999)
     ||(typeof s==="string"&&/^\d{1,14}(?:\/[1-9]\d{0,13})?$/.test(s));
  const names=new Set();
  for(const node of input.nodes){
    if(!id(node)||names.has(node))throw new RangeError("invalid or duplicated node");
    names.add(node);
  }
  const linkIds=new Set();
  for(const link of input.links){
    shape(link,["id","from","to","capacity","unitResourceCost"],"link");
    if(!id(link.id)||linkIds.has(link.id)||!names.has(link.from)||!names.has(link.to)
      ||link.from===link.to||!rational(link.capacity)||!rational(link.unitResourceCost))
      throw new RangeError("invalid link identity, capacity or cost");
    linkIds.add(link.id);
  }
  const seenSources=new Set();
  for(const src of input.sources){
    shape(src,["node","capacity"],"source");
    if(!names.has(src.node)||seenSources.has(src.node)||!rational(src.capacity))
      throw new RangeError("invalid source node or supply");
    seenSources.add(src.node);
  }
  const seenDemands=new Set();
  for(const dst of input.demands){
    shape(dst,["node","amount"],"demand");
    if(!names.has(dst.node)||seenDemands.has(dst.node)||!rational(dst.amount))
      throw new RangeError("invalid demand node or volume");
    seenDemands.add(dst.node);
  }
  if(input.budget!==undefined && input.budget!==null && !rational(input.budget))
    throw new RangeError("invalid budget");
  return {admitted:true,operation:"exact-resource-flow",
    nodeCount:input.nodes.length,linkCount:input.links.length,
    decimalValuesAreNotImplicitlyExact:true,
    warning:"Only directed linear capacities and per-unit costs; no implicit hydraulic, legal, reliability or fairness interpretation"};
}
export function computeExactResourceFlowWork(input) {
  admitExactResourceFlowWork(input);
  return checkedResourceFlowWork(input, solveExactResourceFlow(input));
}

// This receiver calls only the independent checker, never the optimizer.
function checkedResourceFlowWork(input, result) {
  exactOutputShape(result,["model","guarantee","totalDemand","budget","withoutBudget","withBudget",
    "allDemandFeasible","limitedByNetwork","limitedByBudget"],"flow result");
  exactOutputShape(result.withoutBudget,["maximumDelivery","minimumResourceForMaximumDelivery","witness"],"unbudgeted result");
  originalWitnessShape(result.withBudget);
  originalWitnessShape(result.withoutBudget.witness);
  const verification=verifyResourceFlowCertificate(input,result);
  if(!verification.verified)throw new Error("independent funded-output certificate rejected: "+verification.reason);
  const baselineSpec={...input,budget:null};
  const baselineClaim={totalDemand:result.totalDemand,budget:null,
    allDemandFeasible:result.withoutBudget.witness.remainingDemand==="0",
    withBudget:result.withoutBudget.witness};
  const baselineVerification=verifyResourceFlowCertificate(baselineSpec,baselineClaim);
  if(!baselineVerification.verified)throw new Error("independent unconstrained reference certificate rejected: "+baselineVerification.reason);
  if(baselineVerification.verifiedDelivered!==result.withoutBudget.maximumDelivery ||
     baselineVerification.verifiedResourceCost!==result.withoutBudget.minimumResourceForMaximumDelivery)
    throw new Error("unbounded reference summary does not match its checked witness");
  const demand=parseFrontierResult(result.totalDemand);
  const delivered=parseFrontierResult(verification.verifiedDelivered);
  const baselineDelivered=parseFrontierResult(baselineVerification.verifiedDelivered);
  if(result.allDemandFeasible!==ratEqual(delivered,demand) ||
     result.limitedByNetwork!==!ratEqual(baselineDelivered,demand) ||
     result.limitedByBudget!==((input.budget!==undefined&&input.budget!==null)&&
       !ratEqual(delivered,baselineDelivered)))
    throw new Error("flow summary flags disagree with independently checked quantities");
  if(result.model!=="exact-capacitated-directed-linear-resource-flow/v1" ||
     result.guarantee!=="exact arithmetic and min-cost max-flow for input capacities and constant nonnegative link costs; not physical hydraulic certification")
    throw new Error("flow output does not identify the original finite linear model");
  if(result.withBudget.nextMarginalResourceCost!==verification.residualAdditionalUnitCost ||
     result.withoutBudget.witness.nextMarginalResourceCost!==baselineVerification.residualAdditionalUnitCost)
    throw new Error("next marginal resource cost disagrees with the checked residual network");
  return {operation:"exact-resource-flow",version:"1",result,verification,baselineVerification,
    claims:["exact finite rational linear flow optimization", "independently checked funded and unbudgeted primal/dual residual optimality"],
    exclusions:["nonlinear hydraulics","municipal connectivity","water rights","solar weather","engineering safety","social allocation"]};
}


/** Cheap prepayment Work admission: no solver, signer or source-side effect. */
function parseOriginalBudget(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError("resource budget needs a safe nonnegative integer or exact rational string");
    value = String(value);
  }
  if (typeof value !== "string" || !/^\d{1,14}(?:\/[1-9]\d{0,13})?$/u.test(value))
    throw new TypeError("resource budget is a nonnegative exact p/q, never an implicit host float");
  const [n,d="1"] = value.split("/");
  return rationalOfBigInts(BigInt(n), BigInt(d));
}
function parseFrontierResult(value) {
  // Source-calculated BigInt rational results may grow well beyond the input
  // coefficient's fourteen decimal digits; never reject a genuine source
  // optimum by applying the customer input bound to a computed denominator.
  if (typeof value !== "string" ||
      !/^(?:0|[1-9]\d{0,4095})(?:\/[1-9]\d{0,4095})?$/u.test(value))
    throw new TypeError("original exact frontier segment has a malformed or excessive source rational");
  const [n,d="1"] = value.split("/");
  return rationalOfBigInts(BigInt(n), BigInt(d));
}
export function admitExactResourceFrontierWork({network,budgets}={}) {
  if (!network || typeof network !== "object" || Array.isArray(network) ||
      !Array.isArray(budgets) || budgets.length < 1 || budgets.length > 32 ||
      Object.hasOwn(network, "budget"))
    throw new TypeError("frontier Work requires one budgetless original network and 1-32 budget scenarios");
  const admitted = admitExactResourceFlowWork(network);
  budgets.forEach(parseOriginalBudget);
  return {admitted:true,operation:"exact-resource-frontier",
    nodeCount:admitted.nodeCount,linkCount:admitted.linkCount,
    quotedBudgets:budgets.length,actualSpendingAuthorized:false,
    evidenceLimit:"mathematical model with original independently verified full-flow witness; no physical or merchant purchase authority"};
}

/**
 * Buy once, decide many times: exact Pareto delivery/resource-cost frontier
 * and up to 32 source-selected nonmonetary budget scenarios.
 *
 * ONE graph optimization produces the entire exact convex marginal envelope.
 * The original independently verified unbudgeted primal/dual is included.
 * Intermediate budget quotes are arithmetically derived from the produced
 * finite shortest-augmentation envelope; they are NOT independently certified
 * primal allocations, purchased capacity, credit, or a physical pump curve.
 */
export function computeExactResourceFrontierWork({ network, budgets } = {}) {
  admitExactResourceFrontierWork({network,budgets});
  return projectExactResourceFrontierWork({network,budgets}, computeExactResourceFlowWork(network));
}

// Arithmetic projection shared by production and receiving. Replaying this
// envelope is not an independent certificate for each intermediate allocation.
function projectExactResourceFrontierWork({ network, budgets }, work) {
  const checkedBudgets = budgets.map(parseOriginalBudget);
  const witness = work.result.withoutBudget.witness;
  const frontier = witness.marginalCostFrontier;
  if (!Array.isArray(frontier)) throw new Error("original optimizer did not supply its real marginal frontier");
  const zero = ratZero;
  let delivered = zero, resourceCost = zero, previousMarginal = zero;
  const sections = frontier.map(row => {
    const first = parseFrontierResult(row.fromDelivered), last = parseFrontierResult(row.untilDelivered);
    const startCost = parseFrontierResult(row.fromResourceCost), endCost = parseFrontierResult(row.untilResourceCost);
    const marginal = parseFrontierResult(row.resourceCostPerDeliveredUnit);
    if (!ratEqual(first, delivered) || !ratEqual(startCost, resourceCost) ||
        !(ratCompare(last, first) > 0) || (ratCompare(marginal, previousMarginal) < 0) ||
        !ratEqual(endCost, ratAdd(startCost, ratMultiply(marginal, ratSubtract(last, first)))))
      throw new Error("original marginal resource envelope is not an admitted exact convex path");
    delivered = last;
    resourceCost = endCost;
    previousMarginal = marginal;
    return { fromDelivered:first, untilDelivered:last,
      fromResourceCost:startCost, untilResourceCost:endCost, marginal };
  });
  if (!ratEqual(delivered, parseFrontierResult(witness.delivered)) || !ratEqual(resourceCost, parseFrontierResult(witness.resourceCost)))
    throw new Error("source marginal frontier does not close at independently verified original optimum");

  const quotes = checkedBudgets.map((budget, index) => {
    let possible = zero, used = zero, marginal = null;
    for (const section of sections) {
      if (!(ratCompare(section.fromResourceCost, budget) > 0) && !(ratCompare(section.untilResourceCost, budget) > 0)) {
        possible = section.untilDelivered;
        used = section.untilResourceCost;
        marginal = section.marginal;
        continue;
      }
      if (!(ratCompare(section.fromResourceCost, budget) > 0) && (ratCompare(section.marginal, zero) > 0)) {
        const extra = divide(ratSubtract(budget, section.fromResourceCost), section.marginal);
        possible = ratAdd(section.fromDelivered, extra);
        used = ratAdd(section.fromResourceCost, ratMultiply(extra, section.marginal));
        marginal = section.marginal;
      }
      break;
    }
    // The marginal at the first unpurchased feasible delivery segment is
    // required for a real next-budget decision, not just a point estimate.
    const next = sections.find(section => (ratCompare(section.untilDelivered, possible) > 0));
    return {
      index, budget:resourceRatioString(budget),
      maximumDelivery:resourceRatioString(possible),
      minimumResourceForMaximumDelivery:resourceRatioString(used),
      unspentResource:resourceRatioString(ratSubtract(budget, used)),
      nextMarginalResourcePerDeliveredUnit:next === undefined ? null : resourceRatioString(next.marginal),
      demandComplete:ratEqual(possible, parseFrontierResult(work.result.totalDemand)),
      networkLimited:ratEqual(possible, parseFrontierResult(witness.delivered))
        && !ratEqual(possible, parseFrontierResult(work.result.totalDemand)),
      certificateScope:"exact arithmetic projection of source optimizer's full marginal flow; no independent intermediate primal flow asserted",
    };
  });
  return {
    operation:"exact-resource-frontier",
    version:"1",
    frontierType:"exact-continuous-budget-to-throughput-pareto-envelope/v1",
    resourceBudgetCurrency:"no monetary asset implied; caller selects coherent physical or abstract resource units",
    optimizationPasses:1,
    checkedUnbudgetedOriginal:work.verification,
    checkedUnbudgetedReference:work.baselineVerification,
    originalOptimum:{
      maximumDelivery:witness.delivered,
      minimumResourceForMaximumDelivery:witness.resourceCost,
      remainingDemand:witness.remainingDemand,
      witness,
      independentResidualPotentials:witness.reducedCostPotentials,
    },
    marginalCostFrontier:frontier,
    budgetQuotes:quotes,
    claim:"one exact rational shortest-augmentation Pareto envelope, 1-32 derived budgets with one original optimization",
    excludedClaims:["independent intermediate primal certificates","supply rights","hydraulic headloss","nonlinear pressure","measured source capacity","spending authorization","paid customer fulfillment"],
  };
}


/** The ORIGINAL Market's one mathematical resource-flow product admits either
 * its long-standing single-budget request or the newer multi-budget envelope.
 * Do not split overlapping product identities or make a second optimizer. */
function isFrontierResourceRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new TypeError("original resource mathematics needs one typed JSON input");
  const hasNetwork=Object.hasOwn(input,"network");
  const hasBudgets=Object.hasOwn(input,"budgets");
  if (hasNetwork !== hasBudgets)
    throw new TypeError("resource-frontier request must supply both network and budgets");
  if (hasNetwork &&
      (Object.keys(input).length !== 2 || !Object.keys(input).every(k=>["network","budgets"].includes(k))))
    throw new TypeError("resource-frontier root accepts only network and budgets");
  return hasNetwork;
}

export function admitExactResourceMathWork(input) {
  return isFrontierResourceRequest(input)
    ? admitExactResourceFrontierWork(input)
    : admitExactResourceFlowWork(input);
}

export function computeExactResourceMathWork(input) {
  const multiBudget = isFrontierResourceRequest(input);
  const admission = admitExactResourceMathWork(input);
  const received = multiBudget
    ? computeExactResourceFrontierWork(input)
    : computeExactResourceFlowWork(input);
  return resourceMathWorkEnvelope(admission,received);
}

function resourceMathWorkEnvelope(admission,received) {
  return {...received, marketOperation:"original-mathematical-resource-work/v1",
    admittedMode:admission.operation,
    merchantAndPaymentAuthority:"owned by original Market seller; no source operation can authorize cash spending"};
}

function sameWorkOutput(left,right) {
  if(left===right)return true;
  if(left===null||right===null||typeof left!=="object"||typeof right!=="object")return false;
  if(Array.isArray(left)!==Array.isArray(right))return false;
  if(Array.isArray(left)&&left.length!==right.length)return false;
  const keys=Object.keys(left),other=Object.keys(right);
  return keys.length===other.length&&keys.every(key=>
    Object.hasOwn(right,key)&&sameWorkOutput(left[key],right[key]));
}

function exactOutputShape(value,keys,label) {
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key)))
    throw new TypeError(label+" has unknown or missing output fields");
}

function outputRows(value,max,label,receive) {
  if(!Array.isArray(value)||value.length>max)throw new TypeError(label+" exceeds its output bound");
  for(let index=0;index<value.length;index++) {
    if(!Object.hasOwn(value,index))throw new TypeError(label+" contains an absent output row");
    receive(value[index]);
  }
}

function originalWitnessShape(witness) {
  exactOutputShape(witness,["delivered","resourceCost","remainingDemand","flows","supplied","served",
    "nextMarginalResourceCost","reducedCostPotentials","augmentations","marginalCostFrontier"],"flow witness");
  if(!Number.isSafeInteger(witness.augmentations)||witness.augmentations<0||witness.augmentations>4096)
    throw new TypeError("source augmentation count exceeds its declared bound");
  outputRows(witness.flows,128,"flow rows",row=>{
    exactOutputShape(row,["id","from","to","volume"],"flow row");parseFrontierResult(row.volume);
  });
  outputRows(witness.supplied,48,"source rows",row=>{
    exactOutputShape(row,["node","volume"],"source row");parseFrontierResult(row.volume);
  });
  outputRows(witness.served,48,"demand rows",row=>{
    exactOutputShape(row,["node","requested","delivered"],"demand row");
    parseFrontierResult(row.requested);parseFrontierResult(row.delivered);
  });
  outputRows(witness.reducedCostPotentials,50,"dual potentials",value=>{
    if(typeof value!=="string")throw new TypeError("dual potential must retain its exact source rational");
  });
  outputRows(witness.marginalCostFrontier,4096,"source marginal envelope",row=>{
    const keys=["fromDelivered","untilDelivered","fromResourceCost","untilResourceCost","resourceCostPerDeliveredUnit"];
    exactOutputShape(row,keys,"source marginal segment");
    for(const key of keys)parseFrontierResult(row[key]);
  });
}

/**
 * Receive a complete original mathematical Work without running the optimizer.
 * Funded and unbudgeted primal/dual optimality are independently checked.
 * Frontier/quote agreement is deterministic arithmetic reproduction from the
 * supplied envelope and checked endpoint, not intermediate primal certification.
 * A refusal does not establish the negation of the customer's mathematical claim.
 */
export function verifyExactResourceMathWork(input,work) {
  try {
    const admission=admitExactResourceMathWork(input);
    const multiBudget=isFrontierResourceRequest(input);
    let received,checked;
    if(multiBudget) {
      const witness=work?.originalOptimum?.witness;
      if(!witness)throw new TypeError("frontier output requires its original full primal/dual witness");
      let total=ratZero;
      for(const demand of input.network.demands)total=ratAdd(total,parseOriginalBudget(demand.amount));
      const totalDemand=resourceRatioString(total);
      const complete=ratEqual(parseFrontierResult(witness.delivered),total);
      const result={
        model:"exact-capacitated-directed-linear-resource-flow/v1",
        guarantee:"exact arithmetic and min-cost max-flow for input capacities and constant nonnegative link costs; not physical hydraulic certification",
        totalDemand,budget:null,
        withoutBudget:{maximumDelivery:work.originalOptimum.maximumDelivery,
          minimumResourceForMaximumDelivery:work.originalOptimum.minimumResourceForMaximumDelivery,witness},
        withBudget:witness,allDemandFeasible:complete,
        limitedByNetwork:!complete,limitedByBudget:false,
      };
      checked=checkedResourceFlowWork(input.network,result);
      received=projectExactResourceFrontierWork(input,checked);
    } else {
      checked=checkedResourceFlowWork(input,work?.result);
      received=checked;
    }
    const expected=resourceMathWorkEnvelope(admission,received);
    if(!sameWorkOutput(expected,work))
      throw new Error("received mathematical work disagrees with its checked source or arithmetic projection");
    return {
      verified:true,operation:admission.operation,
      verification:checked.verification,baselineVerification:checked.baselineVerification,
      optimizerExecuted:false,
      independentlyChecked:multiBudget?"original unbudgeted primal/dual optimum":"funded and unbudgeted primal/dual optima",
      arithmeticReproduction:multiBudget?"convex envelope closure and exact budget quotes":"source totals and summary flags",
      intermediatePrimalCertificates:false,
      sourceTraceIndependentlyVerified:false,
      sourceTraceFields:["augmentations","marginalCostFrontier"],
      scope:"fixed supplied rational network; no measured capacity, authority, payment or external acceptance",
    };
  } catch(error) {
    return {verified:false,reason:error instanceof Error?error.message:String(error),
      optimizerExecuted:false,mathematicalNegationEstablished:false};
  }
}
