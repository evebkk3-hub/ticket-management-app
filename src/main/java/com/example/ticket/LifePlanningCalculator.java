package com.example.ticket;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class LifePlanningCalculator {
    record Segment(int startAge, int endAge, double regularPremium, double topUpPremium) {}
    record Result(boolean valid, List<String> errors, double totalPremium, double retirementPaid,
                  double finalAccountValue, double deathBenefit, int projectionYears) {
        String toJson() {
            StringBuilder errorJson = new StringBuilder("[");
            for (int i = 0; i < errors.size(); i++) {
                if (i > 0) errorJson.append(',');
                errorJson.append('"').append(json(errors.get(i))).append('"');
            }
            errorJson.append(']');
            return String.format(Locale.US,
                    "{\"valid\":%s,\"errors\":%s,\"totalPremium\":%.2f,\"retirementPaid\":%.2f,\"finalAccountValue\":%.2f,\"deathBenefit\":%.2f,\"projectionYears\":%d}",
                    valid, errorJson, totalPremium, retirementPaid, finalAccountValue, deathBenefit, projectionYears);
        }
    }

    static Result calculate(int currentAge, int coverageAge, int payEndAge, boolean retirementEnabled,
                            int retirementStartAge, int retirementEndAge, double retirementAmount,
                            boolean retirementMonthly, double riderAnnualPremium, List<Segment> segments) {
        List<String> errors = validate(currentAge, coverageAge, payEndAge, retirementEnabled,
                retirementStartAge, retirementEndAge, retirementAmount, segments);
        if (!errors.isEmpty()) return new Result(false, errors, 0, 0, 0, 0, 0);

        double accountValue = 0;
        double totalPremium = 0;
        double retirementPaid = 0;
        double monthlyReturn = Math.pow(1.04, 1.0 / 12.0) - 1.0;
        double monthlyFee = 0.012 / 12.0;
        for (int age = currentAge; age <= coverageAge; age++) {
            Segment premium = premiumAt(age, segments);
            for (int month = 1; month <= 12; month++) {
                if (month == 1 && age <= payEndAge) {
                    accountValue += premium.regularPremium + premium.topUpPremium;
                    totalPremium += premium.regularPremium + premium.topUpPremium;
                }
                accountValue *= 1 + monthlyReturn - monthlyFee;
                accountValue = Math.max(0, accountValue - riderAnnualPremium / 12.0);
                if (retirementEnabled && age >= retirementStartAge && age <= retirementEndAge
                        && (retirementMonthly || month == 12)) {
                    double paid = Math.min(retirementAmount, accountValue);
                    accountValue -= paid;
                    retirementPaid += paid;
                }
            }
        }
        double lastRegularPremium = premiumAt(coverageAge, segments).regularPremium;
        return new Result(true, List.of(), totalPremium, retirementPaid, accountValue,
                Math.max(accountValue, lastRegularPremium * 10), coverageAge - currentAge + 1);
    }

    static List<Segment> parseSegments(String value) {
        List<Segment> segments = new ArrayList<>();
        if (value == null || value.isBlank()) return segments;
        for (String row : value.split(";")) {
            String[] fields = row.split(",");
            if (fields.length != 4) continue;
            try {
                segments.add(new Segment(Integer.parseInt(fields[0]), Integer.parseInt(fields[1]),
                        Double.parseDouble(fields[2]), Double.parseDouble(fields[3])));
            } catch (NumberFormatException ignored) {
                // Validation reports an empty or incomplete segment collection.
            }
        }
        return segments;
    }

    private static List<String> validate(int currentAge, int coverageAge, int payEndAge,
                                         boolean retirementEnabled, int retirementStartAge,
                                         int retirementEndAge, double retirementAmount,
                                         List<Segment> segments) {
        List<String> errors = new ArrayList<>();
        if (currentAge < 1 || currentAge > 90) errors.add("อายุปัจจุบันไม่ถูกต้อง");
        if (coverageAge <= currentAge) errors.add("อายุสิ้นสุดความคุ้มครองต้องมากกว่าอายุปัจจุบัน");
        if (payEndAge < currentAge || payEndAge >= coverageAge) errors.add("อายุสิ้นสุดชำระเบี้ยไม่ถูกต้อง");
        if (segments.isEmpty()) errors.add("กรุณาระบุช่วงเบี้ยประกันภัย");
        for (int i = 0; i < segments.size(); i++) {
            Segment row = segments.get(i);
            if (row.endAge < row.startAge || row.regularPremium < 0 || row.topUpPremium < 0)
                errors.add("ช่วงเบี้ยที่ " + (i + 1) + " ไม่ถูกต้อง");
            if (i > 0 && row.startAge != segments.get(i - 1).endAge + 1)
                errors.add("ช่วงเบี้ยต้องเรียงต่อเนื่องกัน");
        }
        if (!segments.isEmpty() && segments.get(0).startAge != currentAge)
            errors.add("ช่วงเบี้ยแรกต้องเริ่มที่อายุปัจจุบัน");
        if (!segments.isEmpty() && segments.get(segments.size() - 1).endAge != payEndAge)
            errors.add("ช่วงเบี้ยสุดท้ายต้องสิ้นสุดที่อายุสิ้นสุดชำระเบี้ย");
        if (retirementEnabled) {
            if (retirementStartAge < 55 || retirementStartAge > 70) errors.add("อายุเริ่มรับเงินเกษียณต้องอยู่ระหว่าง 55-70 ปี");
            if (retirementEndAge < retirementStartAge || retirementEndAge > coverageAge) errors.add("ช่วงรับเงินเกษียณไม่ถูกต้อง");
            if (retirementAmount < 5000) errors.add("เงินเกษียณต้องไม่น้อยกว่า 5,000 บาท");
        }
        return errors;
    }

    private static Segment premiumAt(int age, List<Segment> segments) {
        for (Segment segment : segments) if (age >= segment.startAge && age <= segment.endAge) return segment;
        return new Segment(age, age, 0, 0);
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
