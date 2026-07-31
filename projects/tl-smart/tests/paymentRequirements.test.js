const test = require("node:test");
const assert = require("node:assert/strict");
const {
  availablePaymentChannels,
  nextPaymentState,
} = require("../src/domain/paymentRequirements");

test("hides credit card for top-up and direct debit for foreign customers", () => {
  assert.ok(!availablePaymentChannels({ hasTopUp: true }).includes("CREDIT_CARD"));
  assert.ok(!availablePaymentChannels({ isForeigner: true }).includes("DIRECT_DEBIT"));
});

test("tracks payment confirmation and evidence verification separately", () => {
  assert.equal(nextPaymentState("WAITING_PAYMENT", "START_PAYMENT"), "PAYMENT_PENDING");
  assert.equal(nextPaymentState("PAYMENT_PENDING", "CONFIRMED"), "PAYMENT_SUCCESS");
  assert.equal(nextPaymentState("PAYMENT_PENDING", "ATTACH_EVIDENCE"), "WAITING_VERIFICATION");
  assert.equal(nextPaymentState("WAITING_VERIFICATION", "VERIFYING"), "VERIFYING_PAYMENT");
});
