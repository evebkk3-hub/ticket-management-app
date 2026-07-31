const test = require("node:test");
const assert = require("node:assert/strict");
const {
  completionByStep,
  evaluateDopaFailureAttempt,
  submitApplication,
  validateApplication,
} = require("../src/domain/application");

const completeAddress = {
  houseNo: "99/9",
  subdistrict: "คลองตัน",
  district: "คลองเตย",
  province: "กรุงเทพมหานคร",
  postalCode: "10110",
};

const complete = {
  insured: {
    firstName: "สมชาย",
    lastName: "ใจดี",
    nationalId: "1103700123456",
    mobile: "0812345678",
    height: "175",
    weight: "70",
    nationality: "ไทย",
    email: "somchai@example.com",
    hasFormerName: false,
    maritalStatus: "โสด",
    additionalHealth: "ไม่มี / สุขภาพแข็งแรง",
    annualIncome: "600000",
    addresses: {
      "ทะเบียนบ้าน": completeAddress,
      "ปัจจุบัน": completeAddress,
      "ที่ทำงาน": completeAddress,
      "สถานที่ติดต่อ": completeAddress,
    },
  },
  payerGuardian: {
    payer: {
      firstName: "สมชาย",
      lastName: "ใจดี",
      relation: "ผู้ขอเอาประกัน",
      birthDate: "1 ม.ค. 2530",
      gender: "ชาย",
      nationalId: "1103700123456",
      mobile: "0812345678",
    },
    guardianRequired: false,
  },
  beneficiaries: [{
    type: "บุคคล",
    prefix: "นาง",
    firstName: "สมหญิง",
    lastName: "ใจดี",
    gender: "หญิง",
    birthDate: "1 ม.ค. 2533",
    age: "36",
    relation: "คู่สมรส",
    addressType: "ตามที่อยู่ทะเบียนบ้าน",
    sumAssuredShare: 100,
    accountValueShare: 100,
  }],
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
    beneficiaries: [{ ...complete.beneficiaries[0], sumAssuredShare: 80, accountValueShare: 70 }],
  });
  assert.ok(result.missing.includes("สัดส่วนเงินเอาประกันภัยรวม 100%"));
  assert.ok(result.missing.includes("สัดส่วนมูลค่าบัญชีรวม 100%"));
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

test("allows application to continue when DOPA is unavailable", () => {
  const result = validateApplication({
    ...complete,
    insured: {
      ...complete.insured,
      dopaStatus: "UNAVAILABLE",
      dopaMessageCode: "MSG_0025",
    },
  });
  assert.equal(result.valid, true);
});

test("shows DOPA failure modal on first attempt and bypasses the second attempt", () => {
  const first = evaluateDopaFailureAttempt(0, "next");
  assert.equal(first.showModal, true);
  assert.equal(first.bypass, false);
  assert.equal(first.pendingAction, "next");

  const second = evaluateDopaFailureAttempt(first.nextAttemptCount, "next");
  assert.equal(second.showModal, false);
  assert.equal(second.bypass, true);
});

test("requires the insured fields defined by Application LV V10", () => {
  const result = validateApplication({
    ...complete,
    insured: {
      ...complete.insured,
      email: "",
      annualIncome: "",
      addresses: { ...complete.insured.addresses, "ที่ทำงาน": {} },
    },
  });
  assert.ok(result.missing.includes("อีเมล"));
  assert.ok(result.missing.includes("รายได้ต่อปี"));
  assert.ok(result.missing.includes("ที่อยู่ที่ทำงาน"));
});

test("requires payer and conditional guardian data before beneficiary step", () => {
  const result = validateApplication({
    ...complete,
    payerGuardian: {
      payer: { ...complete.payerGuardian.payer, mobile: "" },
      guardianRequired: true,
      guardian: {},
    },
  });
  assert.ok(result.missing.includes("ข้อมูลผู้ชำระเบี้ยไม่ครบ"));
  assert.ok(result.missing.includes("ข้อมูลผู้ปกครองไม่ครบ"));
});
