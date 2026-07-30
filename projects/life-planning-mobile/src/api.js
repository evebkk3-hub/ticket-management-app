const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export async function calculateLifePlan(plan) {
  const body = new URLSearchParams({
    currentAge: String(plan.currentAge),
    coverageAge: String(plan.coverageAge),
    payEndAge: String(plan.payEndAge),
    retirementEnabled: String(plan.retirementEnabled),
    retirementStartAge: String(plan.retirementStartAge),
    retirementEndAge: String(plan.retirementEndAge),
    retirementAmount: String(plan.retirementAmount),
    retirementFrequency: plan.retirementFrequency,
    riderAnnualPremium: String(plan.riderAnnualPremium),
    segments: plan.segments.map((row) => [row.startAge, row.endAge, row.regularPremium, row.topUpPremium].join(",")).join(";")
  }).toString();
  const response = await fetch(`${API_URL}/api/life-planning/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body
  });
  const data = await response.json();
  if (!response.ok && !data.errors) throw new Error(data.error || "Calculation service unavailable");
  return data;
}
