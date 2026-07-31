const test = require("node:test");
const assert = require("node:assert/strict");
const {
  completionByStep,
  submitApplication,
  validateApplication,
} = require("../src/domain/application");

const complete = {
  insured: { firstName: "สมชาย", lastName: "ใจดี", nationalId: "1103700123456", mobile: "0812345678" },
  beneficiaries: [{ firstName: "สมหญิง", relation: "คู่สมรส", share: 100 }],
  health: { answered: true },
  documents: { identityCard: true },
  signature: { insured: true, agent: true },
  payment: { method: "QR" },
};

test("reports missing e-Application requirements", () => {
  const result = validateApplication({ insured: {}, beneficiaries: [] });
  assert.equal(result.valid, false);
  assert.ok(result.missing.includes("ผู้รับประโยชน์"));
  assert.ok(result.missing.includes("ลายมือชื่อผู้เอาประกัน"));
});

test("requires beneficiary shares to total one hundred", () => {
  const result = validateApplication({
    ...complete,
    beneficiaries: [{ ...complete.beneficiaries[0], share: 80 }],
  });
  assert.ok(result.missing.includes("สัดส่วนผู้รับประโยชน์รวม 100%"));
});

test("marks every step complete for a valid application", () => {
  assert.ok(completionByStep(complete).every((step) => step.complete));
});

test("submits a valid application with a reference", () => {
  const result = submitApplication(complete, new Date("2026-07-30T00:00:00Z"));
  assert.equal(result.ok, true);
  assert.equal(result.status, "รอนำส่ง");
  assert.match(result.applicationNo, /^APP-2026-/);
});
