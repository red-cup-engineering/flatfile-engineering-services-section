import test from "node:test";
import assert from "node:assert/strict";
import examples from "./fixtures/exact-resource-work.json" with { type: "json" };
import {
  admitExactResourceMathWork, computeExactResourceMathWork, verifyExactResourceMathWork,
} from "@red-cup-engineering/metrologic/obstruction/exact-resource-work";
import { verifyResourceFlowCertificate } from "@red-cup-engineering/metrologic/obstruction/resource-flow-verifier";
import { solveExactResourceFlow, solveExactResourceFrontier } from "@red-cup-engineering/metrologic/obstruction/exact-resource-flow";

function freeze(value) {
  if(value&&typeof value==="object") {
    for(const item of Object.values(value))freeze(item);
    Object.freeze(value);
  }
  return value;
}

test("public exact-resource entry computes and independently receives frozen original source", () => {
  const request=freeze(structuredClone(examples.funded));
  const before=JSON.stringify(request);
  assert.equal(admitExactResourceMathWork(request).operation,"exact-resource-flow");
  const work=computeExactResourceMathWork(request);
  assert.equal(work.result.withBudget.delivered,"4");
  assert.equal(work.result.withoutBudget.maximumDelivery,"8");
  assert.equal(work.result.withBudget.resourceCost,"2");
  const received=verifyExactResourceMathWork(request,freeze(work));
  assert.equal(received.verified,true);
  assert.equal(received.optimizerExecuted,false);
  assert.equal(received.intermediatePrimalCertificates,false);
  assert.equal(JSON.stringify(request),before);
});

test("preflight and solver share the fourteen-digit numeric input boundary", () => {
  const admitted=99999999999999, excessive=100000000000000;
  const setters=[
    (x,n)=>{x.links[0].capacity=n;},
    (x,n)=>{x.links[0].unitResourceCost=n;},
    (x,n)=>{x.sources[0].capacity=n;},
    (x,n)=>{x.demands[0].amount=n;},
    (x,n)=>{x.budget=n;},
  ];
  for(const set of setters) {
    const good=structuredClone(examples.funded);set(good,admitted);
    assert.equal(admitExactResourceMathWork(good).admitted,true);
    for(const value of [excessive,String(excessive),0.5]) {
      const bad=structuredClone(examples.funded);set(bad,value);
      assert.throws(()=>admitExactResourceMathWork(bad));
    }
  }
  assert.throws(()=>admitExactResourceMathWork({...examples.frontier,budgets:[excessive]}));
});

test("receiving refuses forged primal, cost, dual, marginal and summary claims", () => {
  const mutations=[
    x=>{x.result.withBudget.resourceCost="1";},
    x=>{x.result.withBudget.flows[0].volume="9";},
    x=>{x.result.withBudget.reducedCostPotentials.fill("0");},
    x=>{x.result.withBudget.nextMarginalResourceCost="99";},
    x=>{x.result.withoutBudget.maximumDelivery="9";},
    x=>{x.result.limitedByNetwork=true;},
    x=>{x.result.limitedByBudget=false;},
    x=>{x.result.allDemandFeasible="false";},
    x=>{x.verification.verified=false;},
    x=>{x.baselineVerification.verifiedResourceCost="3";},
    x=>{x.result.absoluteTruth=true;},
    x=>{x.result.withBudget.absoluteTruth=true;},
    x=>{x.result.withBudget.flows[0].absoluteTruth=true;},
    x=>{x.result.withBudget.augmentations=4097;},
  ];
  for(const mutate of mutations) {
    const work=computeExactResourceMathWork(examples.funded);mutate(work);
    const received=verifyExactResourceMathWork(examples.funded,work);
    assert.equal(received.verified,false,JSON.stringify(work));
    assert.equal(received.mathematicalNegationEstablished,false);
  }
  const work=computeExactResourceMathWork(examples.funded);
  assert.equal(verifyExactResourceMathWork({...examples.funded,budget:"3"},work).verified,false);
});

test("frontier carries a replayable full optimum and exactly reproduces five budget quotes", () => {
  const request=freeze(structuredClone(examples.frontier));
  const before=JSON.stringify(request);
  const work=computeExactResourceMathWork(request);
  assert.equal(work.originalOptimum.maximumDelivery,"10");
  assert.equal(work.originalOptimum.minimumResourceForMaximumDelivery,"68/5");
  assert.deepEqual(work.budgetQuotes.map(x=>x.maximumDelivery),["0","5/2","21/5","41/5","10"]);
  const witness=work.originalOptimum.witness;
  assert.equal(verifyResourceFlowCertificate(request.network,{
    totalDemand:"10",budget:null,allDemandFeasible:true,withBudget:witness,
  }).verified,true);
  const received=verifyExactResourceMathWork(request,freeze(work));
  assert.equal(received.verified,true);
  assert.equal(received.independentlyChecked,"original unbudgeted and all requested budget primal/dual optima");
  assert.equal(received.arithmeticReproduction,"convex envelope closure and exact budget quotes");
  assert.equal(received.intermediatePrimalCertificates,true);
  assert.equal(JSON.stringify(request),before);
});

test("frontier receiving rejects changed quote, endpoint, claim scope and sparse rows", () => {
  const mutations=[
    x=>{x.budgetQuotes[2].maximumDelivery="5";},
    x=>{x.budgetQuotes[2].unspentResource="1";},
    x=>{x.budgetQuotes[2].demandComplete=true;},
    x=>{x.originalOptimum.witness.flows[0].volume="9";},
    x=>{x.originalOptimum.minimumResourceForMaximumDelivery="1";},
    x=>{x.originalOptimum.independentResidualPotentials=[];},
    x=>{x.marginalCostFrontier=[];},
    x=>{x.excludedClaims=[];},
    x=>{x.budgetQuotes.length+=1;},
  ];
  for(const mutate of mutations) {
    const work=structuredClone(computeExactResourceMathWork(examples.frontier));mutate(work);
    assert.equal(verifyExactResourceMathWork(examples.frontier,work).verified,false);
  }
});

test("admitted 48-node rational chain survives computed denominators larger than512digits", () => {
  const nodes=Array.from({length:48},(_,i)=>"n"+i);
  const network={nodes,links:nodes.slice(1).map((to,i)=>({
    id:"e"+i,from:nodes[i],to,capacity:"1",
    unitResourceCost:"1/"+(99999999999999n-2n*BigInt(i)),
  })),sources:[{node:nodes[0],capacity:"1"}],demands:[{node:nodes[47],amount:"1"}]};
  assert.equal(admitExactResourceMathWork(network).admitted,true);
  const work=computeExactResourceMathWork(network);
  const denominator=work.result.withBudget.resourceCost.split("/")[1];
  assert.ok(denominator.length>512);
  assert.equal(work.verification.verified,true);
  assert.equal(verifyExactResourceMathWork(network,work).verified,true);
  const damaged=structuredClone(work);
  damaged.result.withBudget.resourceCost="0";
  assert.equal(verifyExactResourceMathWork(network,damaged).verified,false);
});

test("oversized computed certificates refuse without asserting mathematical negation", () => {
  const work=structuredClone(computeExactResourceMathWork(examples.funded));
  work.result.withBudget.reducedCostPotentials[0]="1".repeat(4097);
  const received=verifyExactResourceMathWork(examples.funded,work);
  assert.equal(received.verified,false);
  assert.match(received.reason,/rational/);
  assert.equal(received.mathematicalNegationEstablished,false);
});

test("work receiving accepts ordinary JSON property reordering without losing source matching", () => {
  const source=computeExactResourceMathWork(examples.funded);
  const reordered=Object.fromEntries(Object.entries(source).reverse());
  assert.equal(verifyExactResourceMathWork(examples.funded,reordered).verified,true);
  assert.equal(verifyExactResourceMathWork(examples.funded,{...reordered,unproved:true}).verified,false);
});

test("primal/dual receiving explicitly leaves source algorithm traces independently unverified", () => {
  const work=structuredClone(computeExactResourceMathWork(examples.funded));
  work.result.withBudget.augmentations=4096;
  const received=verifyExactResourceMathWork(examples.funded,work);
  assert.equal(received.verified,true);
  assert.equal(received.sourceTraceIndependentlyVerified,false);
  assert.deepEqual(received.sourceTraceFields,["augmentations","marginalCostFrontier"]);
});

test("every frontier budget carries its own allocation in source order, including duplicates and breakpoints", () => {
  const request=freeze({network:structuredClone(examples.frontier.network),
    budgets:["100","0","8/5","1","1/1","68/5","2"]});
  const before=JSON.stringify(request);
  const work=computeExactResourceMathWork(request);
  assert.equal(work.optimizationPasses,1);
  assert.equal(work.budgetCertificates.length,request.budgets.length);
  assert.deepEqual(work.budgetQuotes.map(x=>x.maximumDelivery),["10","0","4","5/2","5/2","10","21/5"]);
  work.budgetCertificates.forEach((entry,index)=>{
    const quote=work.budgetQuotes[index];
    assert.equal(entry.index,index);
    assert.equal(entry.budget,quote.budget);
    assert.equal(entry.verification.verified,true);
    const independent=verifyResourceFlowCertificate({...request.network,budget:entry.budget},{
      totalDemand:"10",budget:entry.budget,allDemandFeasible:quote.demandComplete,withBudget:entry.witness,
    });
    assert.equal(independent.verified,true);
    assert.equal(independent.verifiedDelivered,quote.maximumDelivery);
    assert.equal(independent.verifiedResourceCost,quote.minimumResourceForMaximumDelivery);
    const single=solveExactResourceFlow({...request.network,budget:request.budgets[index]});
    assert.equal(entry.witness.delivered,single.withBudget.delivered);
    assert.equal(entry.witness.resourceCost,single.withBudget.resourceCost);
  });
  assert.equal(JSON.stringify(request),before);
  assert.equal(verifyExactResourceMathWork(request,work).intermediatePrimalCertificates,true);
});

test("budget snapshots retain reverse-arc rerouting and include free delivery before budget zero", () => {
  const network={nodes:["S","A","C","B","D"],links:[
    {id:"SA",from:"S",to:"A",capacity:"1",unitResourceCost:"0"},
    {id:"SC",from:"S",to:"C",capacity:"1",unitResourceCost:"0"},
    {id:"AB",from:"A",to:"B",capacity:"1",unitResourceCost:"0"},
    {id:"AD",from:"A",to:"D",capacity:"1",unitResourceCost:"1"},
    {id:"CB",from:"C",to:"B",capacity:"1",unitResourceCost:"1"},
    {id:"CD",from:"C",to:"D",capacity:"1",unitResourceCost:"100"},
  ],sources:[{node:"S",capacity:"2"}],demands:[{node:"B",amount:"1"},{node:"D",amount:"1"}]};
  const request={network,budgets:["0","1/2","1","2","100"]};
  const work=computeExactResourceMathWork(request);
  assert.deepEqual(work.budgetQuotes.map(x=>x.maximumDelivery),["1","5/4","3/2","2","2"]);
  const middle=Object.fromEntries(work.budgetCertificates[2].witness.flows.map(x=>[x.id,x.volume]));
  assert.equal(middle.AB,"1/2");
  assert.equal(middle.AD,"1/2");
  assert.equal(middle.CB,"1/2");
  assert.equal(middle.CD,"0");
  assert.equal(verifyExactResourceMathWork(request,freeze(work)).verified,true);
  const ordinary=solveExactResourceFlow(network), captured=solveExactResourceFrontier(network,request.budgets);
  assert.deepEqual(captured.result,ordinary,"snapshotting must leave the original optimization and trace unchanged");
});

test("terminal budget certificates preserve all-free, unreachable and empty-demand models", () => {
  const cases=[
    {nodes:["s","t"],links:[{id:"free",from:"s",to:"t",capacity:"7",unitResourceCost:"0"}],
      sources:[{node:"s",capacity:"7"}],demands:[{node:"t",amount:"9"}]},
    {nodes:["s","t"],links:[],sources:[{node:"s",capacity:"7"}],demands:[{node:"t",amount:"9"}]},
    {nodes:["s"],links:[],sources:[],demands:[]},
  ];
  cases.forEach((network,index)=>{
    const request={network,budgets:["5","0","0/7"]};
    const work=computeExactResourceMathWork(request);
    assert.equal(verifyExactResourceMathWork(request,work).verified,true);
    assert.ok(work.budgetCertificates.every(x=>x.witness.delivered===(index===0?"7":"0")));
    assert.ok(work.budgetCertificates.every(x=>x.witness.resourceCost==="0"));
    assert.ok(work.budgetCertificates.every(x=>x.witness.nextMarginalResourceCost===null));
  });
});

test("frontier receiving refuses missing, foreign, forged and unbounded budget certificates", () => {
  const mutations=[
    x=>{delete x.budgetCertificates;},
    x=>{x.budgetCertificates.pop();},
    x=>{delete x.budgetCertificates[1];},
    x=>{x.budgetCertificates[1]=structuredClone(x.budgetCertificates[0]);},
    x=>{x.budgetCertificates[1].budget="0";},
    x=>{x.budgetCertificates[1].index=0;},
    x=>{x.budgetCertificates[1].witness.flows[0].volume="99";},
    x=>{x.budgetCertificates[1].witness.reducedCostPotentials.fill("0");},
    x=>{x.budgetCertificates[1].witness.resourceCost="0";},
    x=>{x.budgetCertificates[1].witness.nextMarginalResourceCost="999";},
    x=>{x.budgetCertificates[1].witness.reducedCostPotentials[0]="1".repeat(4097);},
    x=>{x.budgetCertificates[1].witness.authorized=true;},
    x=>{x.budgetCertificates[1].verification.verified=false;},
    x=>{delete x.budgetCertificates[1].verification;},
  ];
  const original=computeExactResourceMathWork(examples.frontier);
  for(const mutate of mutations){
    const work=structuredClone(original);mutate(work);
    const received=verifyExactResourceMathWork(examples.frontier,work);
    assert.equal(received.verified,false);
    assert.equal(received.mathematicalNegationEstablished,false);
    assert.equal(received.optimizerExecuted,false);
  }
});

test("a forged convex frontier with the same endpoint cannot change a certified selected quote", () => {
  const request={network:examples.frontier.network,budgets:["1"]};
  const work=structuredClone(computeExactResourceMathWork(request));
  const forged=[{fromDelivered:"0",untilDelivered:"10",fromResourceCost:"0",
    untilResourceCost:"68/5",resourceCostPerDeliveredUnit:"34/25"}];
  work.marginalCostFrontier=forged;
  work.originalOptimum.witness.marginalCostFrontier=forged;
  work.budgetQuotes[0].maximumDelivery="25/34";
  work.budgetQuotes[0].nextMarginalResourcePerDeliveredUnit="34/25";
  const received=verifyExactResourceMathWork(request,work);
  assert.equal(received.verified,false);
  assert.match(received.reason,/independently checked allocation/);
});

test("historical frontier receipt remains receivable with its original weaker scope", () => {
  // Generated once by original work Git blob9460949969a597287819c190917db433da6cd06f.
  const work=freeze(structuredClone(examples.historicalFrontierWork));
  const received=verifyExactResourceMathWork(examples.frontier,work);
  assert.equal(received.verified,true);
  assert.equal(received.intermediatePrimalCertificates,false);
  assert.equal(received.independentlyChecked,"original unbudgeted primal/dual optimum");
  assert.equal(received.sourceTraceIndependentlyVerified,false);
});
