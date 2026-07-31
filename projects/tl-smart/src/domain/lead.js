const REQUIRED_MESSAGE = "กรุณาระบุข้อมูล";
const SELECT_MESSAGE = "กรุณาเลือกข้อมูล";

function trimLead(lead) {
  return Object.fromEntries(
    Object.entries(lead).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
}

function validateLead(input) {
  const lead = trimLead(input);
  const errors = {};
  if (!lead.firstName) errors.firstName = REQUIRED_MESSAGE;
  if (!lead.gender) errors.gender = SELECT_MESSAGE;
  if (!lead.ageValue) errors.ageValue = REQUIRED_MESSAGE;
  if (lead.mobile && !/^0\d{9}$/.test(lead.mobile)) {
    errors.mobile = "ระบุข้อมูลไม่ถูกต้อง";
  }
  return { lead, errors, valid: Object.keys(errors).length === 0 };
}

function validateNationalId(value) {
  return /^\d{13}$/.test(String(value || "").trim());
}

function estimateBirthDate(ageValue, ageUnit, now = new Date()) {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age < 0) return "";
  const year = now.getFullYear();
  const month = now.getMonth();
  if (ageUnit === "month") {
    const birth = new Date(year, month - age, 1);
    return toIsoDate(birth);
  }
  return toIsoDate(new Date(year - age, month, 1));
}

function calculateDisplayAge(birthDate, now = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return years >= 1
    ? { value: years, unit: "year" }
    : { value: Math.max(0, months), unit: "month" };
}

function findDuplicate(leads, candidate, saleId) {
  const normalized = trimLead(candidate);
  return leads.find(
    (lead) =>
      lead.saleId === saleId &&
      lead.firstName === normalized.firstName &&
      lead.lastName === normalized.lastName &&
      lead.gender === normalized.gender &&
      lead.mobile === normalized.mobile,
  );
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  calculateDisplayAge,
  estimateBirthDate,
  findDuplicate,
  trimLead,
  validateLead,
  validateNationalId,
};
