const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateDisplayAge,
  estimateBirthDate,
  findDuplicate,
  validateLead,
  validateNationalId,
} = require("../src/domain/lead");

test("validates required short-form fields", () => {
  const result = validateLead({ firstName: " ", gender: "", ageValue: "" });
  assert.equal(result.valid, false);
  assert.equal(result.errors.firstName, "กรุณาระบุข้อมูล");
  assert.equal(result.errors.gender, "กรุณาเลือกข้อมูล");
});

test("trims values and validates Thai mobile format", () => {
  const result = validateLead({
    firstName: " สมชาย ",
    gender: "ชาย",
    ageValue: "30",
    mobile: "0812345678",
  });
  assert.equal(result.valid, true);
  assert.equal(result.lead.firstName, "สมชาย");
});

test("requires exactly 13 digits for national ID search", () => {
  assert.equal(validateNationalId("1103700123456"), true);
  assert.equal(validateNationalId("110370012345"), false);
});

test("estimates birth date from years and months", () => {
  const now = new Date(2025, 3, 5);
  assert.equal(estimateBirthDate(3, "year", now), "2022-04-01");
  assert.equal(estimateBirthDate(10, "month", now), "2024-06-01");
});

test("displays age in years or months", () => {
  const now = new Date(2025, 3, 5);
  assert.deepEqual(calculateDisplayAge("1987-05-18", now), { value: 37, unit: "year" });
  assert.deepEqual(calculateDisplayAge("2024-06-08", now), { value: 9, unit: "month" });
});

test("detects duplicate within the same sales owner", () => {
  const lead = { saleId: "A1", firstName: "เมย์", lastName: "ดี", gender: "หญิง", mobile: "0811111111" };
  assert.equal(findDuplicate([lead], { ...lead }, "A1"), lead);
  assert.equal(findDuplicate([lead], { ...lead }, "A2"), undefined);
});
