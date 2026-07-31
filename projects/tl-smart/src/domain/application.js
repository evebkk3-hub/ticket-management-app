const APPLICATION_STEPS = [
  { key: "insured", label: "ผู้เอาประกัน" },
  { key: "beneficiary", label: "ผู้รับประโยชน์" },
  { key: "health", label: "สุขภาพ" },
  { key: "documents", label: "เอกสาร" },
  { key: "signature", label: "ลงลายมือชื่อ" },
  { key: "payment", label: "ชำระเงิน" },
];

function validateApplication(application) {
  const missing = [];
  if (!application.insured?.firstName?.trim()) missing.push("ชื่อผู้เอาประกัน");
  if (!application.insured?.lastName?.trim()) missing.push("นามสกุลผู้เอาประกัน");
  if (!/^\d{13}$/.test(application.insured?.nationalId || "")) {
    missing.push("เลขประจำตัวประชาชน 13 หลัก");
  }
  if (!application.insured?.mobile?.match(/^0\d{9}$/)) {
    missing.push("เบอร์โทรศัพท์มือถือ");
  }
  const totalShare = (application.beneficiaries || []).reduce(
    (sum, item) => sum + Number(item.share || 0),
    0,
  );
  if (!application.beneficiaries?.length) missing.push("ผู้รับประโยชน์");
  else if (totalShare !== 100) missing.push("สัดส่วนผู้รับประโยชน์รวม 100%");
  if (!application.health?.answered) missing.push("แบบสอบถามสุขภาพ");
  if (!application.documents?.identityCard) missing.push("สำเนาบัตรประชาชน");
  if (!application.signature?.insured) missing.push("ลายมือชื่อผู้เอาประกัน");
  if (!application.signature?.agent) missing.push("ลายมือชื่อตัวแทน");
  if (!application.payment?.method) missing.push("ช่องทางชำระเงิน");
  return { valid: missing.length === 0, missing };
}

function completionByStep(application) {
  const result = validateApplication(application);
  return APPLICATION_STEPS.map((step) => {
    const fields = {
      insured: ["ชื่อผู้เอาประกัน", "นามสกุลผู้เอาประกัน", "เลขประจำตัวประชาชน 13 หลัก", "เบอร์โทรศัพท์มือถือ"],
      beneficiary: ["ผู้รับประโยชน์", "สัดส่วนผู้รับประโยชน์รวม 100%"],
      health: ["แบบสอบถามสุขภาพ"],
      documents: ["สำเนาบัตรประชาชน"],
      signature: ["ลายมือชื่อผู้เอาประกัน", "ลายมือชื่อตัวแทน"],
      payment: ["ช่องทางชำระเงิน"],
    }[step.key];
    return { ...step, complete: fields.every((field) => !result.missing.includes(field)) };
  });
}

function submitApplication(application, now = new Date()) {
  const validation = validateApplication(application);
  if (!validation.valid) return { ok: false, ...validation };
  return {
    ok: true,
    status: "รอนำส่ง",
    applicationNo: `APP-${now.getFullYear()}-${String(now.getTime()).slice(-6)}`,
    submittedAt: now.toISOString(),
  };
}

module.exports = {
  APPLICATION_STEPS,
  completionByStep,
  submitApplication,
  validateApplication,
};
