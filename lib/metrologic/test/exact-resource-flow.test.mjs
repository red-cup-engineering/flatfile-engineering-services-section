import test from "node:test";
import assert from "node:assert/strict";

import { solveExactResourceFlow } from "../src/obstruction/exact-resource-flow.mjs";
import { computeExactResourceEnvelopeWork, admitExactResourceEnvelope } from "../src/obstruction/exact-resource-envelope.mjs";
import { verifyResourceFlowCertificate } from "../src/obstruction/resource-flow-verifier.mjs";
import { admitExactResourceFlowWork, computeExactResourceFlowWork } from "../src/obstruction/exact-resource-work.mjs";

const chain = {
  nodes: ["lake", "ridge", "hamlet"],
  links: [
    { id: "a", from: "lake", to: "ridge", capacity: "10", unitResourceCost: "1/5" },
    { id: "b", from: "ridge", to: "hamlet", capacity: "10", unitResourceCost: "3/10" },
  ],
  sources: [{ node: "lake", capacity: "10" }],
  demands: [{ node: "hamlet", amount: "8" }],
  budget: "2",
};

test("real source work: exact priced serial links, budget, independently verified receipt", () => {
  const data = computeExactResourceFlowWork(chain);
  assert.equal(data.result.withoutBudget.minimumResourceForMaximumDelivery, "4");
  assert.equal(data.result.withBudget.delivered, "4");
  assert.equal(data.result.withBudget.resourceCost, "2");
  assert.equal(data.verification.verified, true);
  assert.equal(data.result.limitedByBudget, true);
  assert.equal(data.result.limitedByNetwork, false);
});

test("cost-optimal residual rerouting beats greedy irreversible assignment", () => {
  const sample = {
    nodes: ["S", "A", "C", "B", "D"],
    links: [
      { id:"SA",from:"S",to:"A",capacity:"1",unitResourceCost:"0" },
      { id:"SC",from:"S",to:"C",capacity:"1",unitResourceCost:"0" },
      { id:"AB",from:"A",to:"B",capacity:"1",unitResourceCost:"0" },
      { id:"AD",from:"A",to:"D",capacity:"1",unitResourceCost:"1" },
      { id:"CB",from:"C",to:"B",capacity:"1",unitResourceCost:"1" },
      { id:"CD",from:"C",to:"D",capacity:"1",unitResourceCost:"100" },
    ],
    sources:[{node:"S",capacity:"2"}],
    demands:[{node:"B",amount:"1"},{node:"D",amount:"1"}],
  };
  const result=computeExactResourceFlowWork(sample);
  assert.equal(result.result.withBudget.delivered, "2");
  assert.equal(result.result.withBudget.resourceCost, "2");
  assert.equal(result.verification.verified,true);
  const flows=Object.fromEntries(result.result.withBudget.flows.map(x=>[x.id,x.volume]));
  assert.equal(flows.AB,"0");
  assert.equal(flows.AD,"1");
  assert.equal(flows.CB,"1");
  assert.equal(flows.CD,"0");
  const funded=computeExactResourceFlowWork({...sample,budget:"1"});
  assert.equal(funded.result.withBudget.delivered,"3/2");
  assert.equal(funded.result.withBudget.resourceCost,"1");
  assert.equal(funded.verification.verified,true);
});

test("zero marginal pumping cost can deliver flow with zero spending", () => {
  const data=computeExactResourceFlowWork({
    nodes:["source","tap"],
    links:[{id:"gravity",from:"source",to:"tap",capacity:"7",unitResourceCost:"0"}],
    sources:[{node:"source",capacity:"7"}],
    demands:[{node:"tap",amount:"7"}],
    budget:"0",
  });
  assert.equal(data.result.withBudget.delivered,"7");
  assert.equal(data.result.withBudget.resourceCost,"0");
  assert.equal(data.verification.verified,true);
});

test("independently certifies budget-impossible and network-limited outcomes", () => {
  const budget=solveExactResourceFlow(chain);
  assert.equal(verifyResourceFlowCertificate(chain,budget).verified,true);
  const insufficient={...chain,links:chain.links.map((l,i)=>({...l,capacity:i===0?"2":"10"})),budget:"100"};
  const output=solveExactResourceFlow(insufficient);
  assert.equal(output.limitedByNetwork,true);
  assert.equal(output.withoutBudget.maximumDelivery,"2");
  assert.equal(verifyResourceFlowCertificate(insufficient,output).verified,true);
});

test("forged cost, link quantity and dual potentials each fail independent verification", () => {
  const valid=solveExactResourceFlow(chain);
  const fake=structuredClone(valid); fake.withBudget.resourceCost="1";
  assert.equal(verifyResourceFlowCertificate(chain,fake).verified,false);
  const fakeFlow=structuredClone(valid);fakeFlow.withBudget.flows[0].volume="9";
  assert.equal(verifyResourceFlowCertificate(chain,fakeFlow).verified,false);
  const fakeDual=structuredClone(valid);fakeDual.withBudget.reducedCostPotentials.fill("0");
  assert.equal(verifyResourceFlowCertificate(chain,fakeDual).verified,false);
});

test("admission excludes silent approximation and malformed graph", () => {
  assert.equal(admitExactResourceFlowWork(chain).admitted,true);
  assert.throws(()=>admitExactResourceFlowWork({...chain,demands:[{node:"hamlet",amount:0.1}]}));
  assert.throws(()=>admitExactResourceFlowWork({...chain,links:[{id:"loop",from:"lake",to:"lake",capacity:1,unitResourceCost:0}]}));
  assert.throws(()=>admitExactResourceFlowWork({...chain,nodes:["lake","lake"]}));
});

test("empty demand has zero resource work and independently verified zero flow", () => {
  const sample={nodes:["any"],links:[],sources:[],demands:[],budget:"0"};
  const value=computeExactResourceFlowWork(sample);
  assert.equal(value.result.allDemandFeasible,true);
  assert.equal(value.result.withBudget.delivered,"0");
  assert.equal(value.verification.verified,true);
});

test("cost-envelope math distinguishes excluded, sufficient, and unresolved service with exact bounds", () => {
  const caseAtBudget = (budget) => ({
    nodes: ["lake", "home"],
    links: [{
      id: "lift", from: "lake", to: "home", capacity: "10",
      unitResourceLower: "1/5", unitResourceUpper: "1/2",
    }],
    sources: [{ node: "lake", capacity: "10" }],
    demands: [{ node: "home", amount: "8" }],
    budget,
  });
  const middle = computeExactResourceEnvelopeWork(caseAtBudget("2"));
  assert.equal(middle.minimumBudgetFeasibleDelivery, "4");
  assert.equal(middle.maximumBudgetFeasibleDelivery, "8");
  assert.equal(middle.classification, "indeterminate-between-optimistic-and-pessimistic-costs");
  assert.equal(middle.optimistic.verification.verified, true);
  assert.equal(middle.pessimistic.verification.verified, true);
  assert.equal(middle.optimistic.baselineVerification.verified, true);
  assert.equal(middle.pessimistic.baselineVerification.verified, true);

  const enough = computeExactResourceEnvelopeWork(caseAtBudget("4"));
  assert.equal(enough.classification, "energy-sufficient-under-all-admitted-costs");
  assert.equal(enough.minimumBudgetFeasibleDelivery, "8");
  const excluded = computeExactResourceEnvelopeWork(caseAtBudget("1"));
  assert.equal(excluded.classification, "excluded-even-with-optimistic-costs");
  assert.equal(excluded.maximumBudgetFeasibleDelivery, "5");
  assert.throws(() => admitExactResourceEnvelope({
    ...caseAtBudget("2"),
    links: [{ ...caseAtBudget("2").links[0], unitResourceLower: "3/5" }]
  }), /upper per-unit cost/);
});

test("full unbudgeted reference is witnessed and checked, not merely asserted", () => {
  const computed = computeExactResourceFlowWork(chain);
  assert.equal(computed.baselineVerification.verified, true);
  assert.equal(computed.baselineVerification.verifiedDelivered, "8");
  assert.equal(computed.baselineVerification.verifiedResourceCost, "4");
  assert.equal(computed.result.withoutBudget.witness.delivered, "8");
  const damaged = structuredClone(computed.result);
  damaged.withoutBudget.witness.resourceCost = "3";
  const evidence = {
    totalDemand: damaged.totalDemand, budget: null,
    allDemandFeasible: true, withBudget: damaged.withoutBudget.witness,
  };
  assert.equal(verifyResourceFlowCertificate({...chain,budget:null},evidence).verified, false);
});
