const LIMITS = {
  monthlyTarget: { min: 20000, max: 300000, step: 10000 },
  policiesPerMonth: { min: 1, max: 8, step: 1 },
  premiumPerPolicy: { min: 20000, max: 300000, step: 10000 },
  commissionRates: [10, 20, 30, 40],
};

const QUALIFICATIONS = [
  { code: "MBRT", threshold: 1200000 },
  { code: "MDRT", threshold: 1943600 },
  { code: "COT", threshold: 5831400 },
  { code: "TOT", threshold: 11662800 },
];

function clampStep(value, { min, max, step }) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  const clamped = Math.min(max, Math.max(min, number));
  return Math.round((clamped - min) / step) * step + min;
}

function simulateCareer(input) {
  const policiesPerMonth = clampStep(
    input.policiesPerMonth,
    LIMITS.policiesPerMonth,
  );
  const premiumPerPolicy = clampStep(
    input.premiumPerPolicy,
    LIMITS.premiumPerPolicy,
  );
  const commissionRate = LIMITS.commissionRates.includes(
    Number(input.commissionRate),
  )
    ? Number(input.commissionRate)
    : 40;

  const monthlyPremium = policiesPerMonth * premiumPerPolicy;
  const monthlyIncome = monthlyPremium * (commissionRate / 100);
  const annualPremium = monthlyPremium * 12;
  const firstYearIncome = monthlyIncome * 12;

  // MVP illustration only. The official REF_SALE_SIM_003 formula is required
  // before these active/passive assumptions can be used for production.
  const fiveYears = Array.from({ length: 5 }, (_, index) => {
    const year = index + 1;
    const activeIncome = firstYearIncome * (1 + index * 0.08);
    const passiveIncome = year === 1 ? 0 : firstYearIncome * 0.06 * index;
    return {
      year,
      activeIncome,
      passiveIncome,
      totalIncome: activeIncome + passiveIncome,
    };
  });

  const highestQualification = QUALIFICATIONS.filter(
    (item) => annualPremium >= item.threshold,
  ).at(-1);

  return {
    policiesPerMonth,
    premiumPerPolicy,
    commissionRate,
    monthlyPremium,
    monthlyIncome,
    annualPremium,
    firstYearIncome,
    fiveYears,
    fiveYearTotal: fiveYears.reduce((sum, row) => sum + row.totalIncome, 0),
    highestQualification: highestQualification?.code || "ยังไม่ถึงเกณฑ์",
    activity: {
      submittedPolicies: policiesPerMonth,
      secondAppointments: policiesPerMonth * 2,
      firstAppointments: policiesPerMonth * 4,
      calls: policiesPerMonth * 10,
    },
    modelStatus: "ILLUSTRATIVE_MVP",
  };
}

function policiesForMonthlyTarget(monthlyTarget, premiumPerPolicy, commissionRate) {
  const target = clampStep(monthlyTarget, LIMITS.monthlyTarget);
  const incomePerPolicy = Number(premiumPerPolicy) * (Number(commissionRate) / 100);
  if (!Number.isFinite(incomePerPolicy) || incomePerPolicy <= 0) return 8;
  return Math.min(8, Math.max(1, Math.ceil(target / incomePerPolicy)));
}

module.exports = {
  LIMITS,
  QUALIFICATIONS,
  clampStep,
  policiesForMonthlyTarget,
  simulateCareer,
};
