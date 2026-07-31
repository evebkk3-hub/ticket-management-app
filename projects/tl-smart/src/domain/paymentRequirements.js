const PAYMENT_CHANNELS = ["QR_CODE", "CREDIT_CARD", "CHEQUE", "DIRECT_DEBIT"];

function availablePaymentChannels({ hasTopUp = false, isForeigner = false } = {}) {
  return PAYMENT_CHANNELS.filter((channel) => {
    if (hasTopUp && channel === "CREDIT_CARD") return false;
    if (isForeigner && channel === "DIRECT_DEBIT") return false;
    return true;
  });
}

function nextPaymentState(current, event) {
  const transitions = {
    WAITING_PAYMENT: {
      START_PAYMENT: "PAYMENT_PENDING",
      ATTACH_EVIDENCE: "WAITING_VERIFICATION",
    },
    PAYMENT_PENDING: {
      CONFIRMED: "PAYMENT_SUCCESS",
      FAILED: "WAITING_PAYMENT",
      NO_RESULT: "WAITING_PAYMENT",
      ATTACH_EVIDENCE: "WAITING_VERIFICATION",
    },
    WAITING_VERIFICATION: {
      VERIFYING: "VERIFYING_PAYMENT",
    },
    VERIFYING_PAYMENT: {
      APPROVED: "PAYMENT_SUCCESS",
      REJECTED: "WAITING_PAYMENT",
    },
  };
  return transitions[current]?.[event] || current;
}

module.exports = {
  PAYMENT_CHANNELS,
  availablePaymentChannels,
  nextPaymentState,
};
