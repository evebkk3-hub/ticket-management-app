const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clampStep,
  policiesForMonthlyTarget,
  simulateCareer,
} = require("../src/domain/careerSimulation");

test("clamps values to configured min, max and step", () => {
  const range = { min: 20000, max: 300000, step: 10000 };
  assert.equal(clampStep(1000, range), 20000);
  assert.equal(clampStep(30777, range), 30000);
  assert.equal(clampStep(999999, range), 300000);
});

test("calculates the MVP first-year sales illustration", () => {
  const result = simulateCareer({
    policiesPerMonth: 4,
    premiumPerPolicy: 20000,
    commissionRate: 40,
  });
  assert.equal(result.monthlyPremium, 80000);
  assert.equal(result.monthlyIncome, 32000);
  assert.equal(result.firstYearIncome, 384000);
  assert.equal(result.activity.calls, 40);
  assert.equal(result.modelStatus, "ILLUSTRATIVE_MVP");
});

test("derives policy count for a monthly income target", () => {
  assert.equal(policiesForMonthlyTarget(50000, 20000, 40), 7);
  assert.equal(policiesForMonthlyTarget(300000, 20000, 10), 8);
});

test("returns qualification from annual premium threshold", () => {
  const result = simulateCareer({
    policiesPerMonth: 8,
    premiumPerPolicy: 150000,
    commissionRate: 40,
  });
  assert.equal(result.annualPremium, 14400000);
  assert.equal(result.highestQualification, "TOT");
});
