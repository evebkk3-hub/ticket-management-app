const APPLICATION_STEPS = [
  { key: "insured", label: "ผู้เอาประกัน" },
  { key: "payerGuardian", label: "ผู้ชำระเบี้ย/ผู้ปกครอง" },
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
  if (!Number(application.insured?.height)) missing.push("ส่วนสูง");
  if (!Number(application.insured?.weight)) missing.push("น้ำหนัก");
  if (!application.insured?.nationality?.trim()) missing.push("สัญชาติ");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.insured?.email || "")) {
    missing.push("อีเมล");
  }
  if (application.insured?.hasFormerName) {
    if (!application.insured?.formerFirstName?.trim()) missing.push("ชื่อเดิม");
    if (!application.insured?.formerLastName?.trim()) missing.push("นามสกุลเดิม");
  }
  if (!application.insured?.maritalStatus) missing.push("สถานภาพ");
  if (!application.insured?.additionalHealth) missing.push("รายละเอียดสุขภาพเพิ่มเติม");
  if (application.insured?.additionalHealth === "มี" && !application.insured?.additionalHealthDetail?.trim()) {
    missing.push("คำอธิบายรายละเอียดสุขภาพ");
  }
  const requiredAddressFields = ["houseNo", "subdistrict", "district", "province", "postalCode"];
  const addressLabels = ["ทะเบียนบ้าน", "ปัจจุบัน", "ที่ทำงาน", "สถานที่ติดต่อ"];
  for (const type of addressLabels) {
    const address = application.insured?.addresses?.[type];
    if (!address || requiredAddressFields.some((field) => !String(address[field] || "").trim())) {
      missing.push(`ที่อยู่${type}`);
    }
  }
  if (!Number(application.insured?.annualIncome)) missing.push("รายได้ต่อปี");
  const payer = application.payerGuardian?.payer;
  if (!payer?.firstName?.trim() || !payer?.lastName?.trim() || !payer?.relation?.trim()
      || !payer?.birthDate?.trim() || !payer?.gender?.trim()
      || !/^\d{13}$/.test(payer?.nationalId || "") || !/^0\d{9}$/.test(payer?.mobile || "")) {
    missing.push("ข้อมูลผู้ชำระเบี้ยไม่ครบ");
  }
  if (application.payerGuardian?.guardianRequired) {
    const guardian = application.payerGuardian.guardian;
    if (!guardian?.firstName?.trim() || !guardian?.lastName?.trim()
        || !guardian?.relation?.trim() || !guardian?.gender?.trim()
        || !guardian?.birthDate?.trim() || !/^\d{13}$/.test(guardian?.nationalId || "")) {
      missing.push("ข้อมูลผู้ปกครองไม่ครบ");
    }
  }
  const sumAssuredShare = (application.beneficiaries || []).reduce(
    (sum, item) => sum + Number(item.sumAssuredShare ?? item.share ?? 0),
    0,
  );
  const accountValueShare = (application.beneficiaries || []).reduce(
    (sum, item) => sum + Number(item.accountValueShare ?? item.share ?? 0),
    0,
  );
  if (!application.beneficiaries?.length) missing.push("ผู้รับประโยชน์");
  else {
    if (application.beneficiaries.length > 10) missing.push("ผู้รับประโยชน์สูงสุด 10 คน");
    if (sumAssuredShare !== 100) missing.push("สัดส่วนเงินเอาประกันภัยรวม 100%");
    if (accountValueShare !== 100) missing.push("สัดส่วนมูลค่าบัญชีรวม 100%");
    if (application.beneficiaries.some((item) => (
      !item.firstName?.trim()
      || !item.relation?.trim()
      || !item.addressType?.trim()
      || (item.type !== "นิติบุคคล / องค์กร" && (
        !item.prefix?.trim() || !item.lastName?.trim() || !item.gender?.trim()
        || !item.birthDate?.trim() || !String(item.age || "").trim()
      ))
    ))) missing.push("ข้อมูลผู้รับประโยชน์ไม่ครบ");
  }
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
      insured: [
        "ชื่อผู้เอาประกัน", "นามสกุลผู้เอาประกัน", "เลขประจำตัวประชาชน 13 หลัก",
        "เบอร์โทรศัพท์มือถือ", "ส่วนสูง", "น้ำหนัก", "สัญชาติ", "อีเมล", "ชื่อเดิม",
        "นามสกุลเดิม", "สถานภาพ", "รายละเอียดสุขภาพเพิ่มเติม",
        "คำอธิบายรายละเอียดสุขภาพ", "ที่อยู่ทะเบียนบ้าน", "ที่อยู่ปัจจุบัน",
        "ที่อยู่ที่ทำงาน", "ที่อยู่สถานที่ติดต่อ", "รายได้ต่อปี",
      ],
      payerGuardian: ["ข้อมูลผู้ชำระเบี้ยไม่ครบ", "ข้อมูลผู้ปกครองไม่ครบ"],
      beneficiary: [
        "ผู้รับประโยชน์", "ผู้รับประโยชน์สูงสุด 10 คน",
        "สัดส่วนเงินเอาประกันภัยรวม 100%", "สัดส่วนมูลค่าบัญชีรวม 100%",
        "ข้อมูลผู้รับประโยชน์ไม่ครบ",
      ],
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

function evaluateDopaFailureAttempt(attemptCount, action) {
  if (attemptCount === 0) {
    return {
      showModal: true,
      nextAttemptCount: 1,
      pendingAction: action,
      bypass: false,
    };
  }
  return {
    showModal: false,
    nextAttemptCount: attemptCount + 1,
    pendingAction: null,
    bypass: true,
  };
}

module.exports = {
  APPLICATION_STEPS,
  completionByStep,
  evaluateDopaFailureAttempt,
  submitApplication,
  validateApplication,
};
