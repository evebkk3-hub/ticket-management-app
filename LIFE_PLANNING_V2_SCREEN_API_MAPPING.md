# Life Planning V2 - Screen and API Mapping

## 1. Purpose

เอกสารนี้เป็น Screen-to-API Mapping สำหรับใช้ร่วมกันระหว่าง Business, UX/UI, SA, Developer และ QA โดยกำหนด API ภายใต้ base path `/api/v1` และใช้ `lifePlanningId` เป็น resource identifier หลัก

> Current state: หน้า `LiftPlanV2.htm` คำนวณและเก็บ Draft ใน browser ด้วย `localStorage` ปัจจุบัน API ในเอกสารนี้เป็น Target Design ที่ต้องพัฒนาใหม่ เว้นแต่ระบุว่า Existing API

## 2. Common API Standard

| Topic | Standard |
|---|---|
| Content type | `application/json; charset=UTF-8` |
| Authentication | OAuth2/OIDC Bearer Token สำหรับระบบภายใน; Public session token หากเป็น public calculator |
| Correlation | Header `X-Correlation-Id` ทุก request |
| Idempotency | Header `Idempotency-Key` สำหรับ Calculate, Generate PDF และ Submit Quotation |
| Date/time | ISO-8601 เช่น `2026-07-27T10:30:00+07:00` |
| Amount | JSON number, สกุลเงิน THB, ไม่ส่ง comma |
| Version control | `version` และ `configurationVersion` ใน calculation request |
| Optimistic lock | Header `If-Match` หรือ field `recordVersion` ตอนแก้ Draft |
| Pagination | `page`, `pageSize`, `sort` |
| Error format | `code`, `message`, `fieldErrors`, `correlationId`, `timestamp` |

### Standard error response

```json
{
  "code": "LP_VALIDATION_ERROR",
  "message": "ข้อมูลไม่ครบหรือไม่ถูกต้อง",
  "fieldErrors": [
    {
      "field": "premiumSegments[0].regularPremium",
      "code": "MIN_PREMIUM",
      "message": "เบี้ยประกันต้องไม่น้อยกว่า 10,000 บาทต่อปี"
    }
  ],
  "correlationId": "LP-20260727-000001",
  "timestamp": "2026-07-27T10:30:00+07:00"
}
```

## 3. Screen Inventory and API Mapping

| Screen ID | Screen | User action | API | Method | Service owner | Result |
|---|---|---|---|---|---|---|
| LP-00 | Life Plan List | ค้นหาแผน | `/life-plans?prospectId=&status=&page=&pageSize=` | GET | Life Planning | รายการ Draft/Calculated/Submitted |
| LP-00 | Life Plan List | สร้างแผนใหม่ | `/life-plans` | POST | Life Planning | `lifePlanningId`, version 1 |
| LP-00 | Life Plan List | Copy Plan | `/life-plans/{id}/copies` | POST | Life Planning | แผนใหม่สถานะ Draft |
| LP-00 | Life Plan List | ยกเลิกแผน | `/life-plans/{id}/status` | PATCH | Life Planning | Status `CANCELLED` |
| LP-01 | Prospect | ค้นหา Prospect | `/prospects?keyword=&page=&pageSize=` | GET | Prospect | Prospect matches |
| LP-01 | Prospect | ตรวจข้อมูลซ้ำ | `/prospects/duplicate-check` | POST | Prospect | Duplicate candidates |
| LP-01 | Prospect | สร้าง Prospect | `/prospects` | POST | Prospect | `prospectId` |
| LP-01 | Prospect | ผูก Prospect กับแผน | `/life-plans/{id}/prospect` | PUT | Life Planning | Prospect snapshot |
| LP-02 | Product | โหลดผลิตภัณฑ์ที่ขายได้ | `/products?channel=TL_SMART&asOfDate=` | GET | Product Config | Product list |
| LP-02 | Product | ตรวจ Eligibility | `/products/{productCode}/eligibility` | POST | Product Config | Eligible/Not eligible และเหตุผล |
| LP-02 | Product | โหลด Configuration | `/products/{productCode}/life-planning-config?asOfDate=` | GET | Product Config | อายุ, term, premium, SA, rider rules |
| LP-02 | Product | บันทึก Product | `/life-plans/{id}/product` | PUT | Life Planning | Product snapshot และ config version |
| LP-03 | Basic Information | บันทึกอายุ/ระยะเวลา | `/life-plans/{id}/basic-information` | PUT | Life Planning | Coverage/payment years |
| LP-03 | Basic Information | Validate Step | `/life-plans/{id}/validations/basic-information` | POST | Life Planning | Field errors/warnings |
| LP-04 | Premium | โหลด Premium rules | `/products/{productCode}/premium-rules?paymentMode=` | GET | Product Config | Min/max และ segment rules |
| LP-04 | Premium | บันทึก Premium segments | `/life-plans/{id}/premium-segments` | PUT | Life Planning | Normalized segments |
| LP-04 | Premium | Validate segments | `/life-plans/{id}/validations/premium-segments` | POST | Life Planning | Gap/overlap/min/max errors |
| LP-05 | Retirement | โหลด Retirement rules | `/products/{productCode}/retirement-rules` | GET | Product Config | Age/frequency/min/max |
| LP-05 | Retirement | บันทึกเป้าหมาย | `/life-plans/{id}/retirement-plan` | PUT | Life Planning | Retirement plan |
| LP-05 | Retirement | Preview retirement | `/life-plans/{id}/retirement-plan/preview` | POST | Calculation | Estimated withdrawal/AV warning |
| LP-06 | Withdrawal | โหลด Withdrawal rules | `/products/{productCode}/withdrawal-rules` | GET | Product Config | Type/frequency/fee rules |
| LP-06 | Withdrawal | บันทึกแผนถอน | `/life-plans/{id}/withdrawal-plans` | PUT | Life Planning | Normalized withdrawal plans |
| LP-06 | Withdrawal | Validate withdrawal | `/life-plans/{id}/validations/withdrawal-plans` | POST | Life Planning | Age/amount/conflict errors |
| LP-07 | Rider | โหลด Rider ที่เลือกได้ | `/products/{productCode}/riders?age=&paymentMode=` | GET | Product Config | Rider groups, plans และ rates |
| LP-07 | Rider | ตรวจ Compatibility | `/products/{productCode}/riders/compatibility` | POST | Product Config | Conflicts และ required riders |
| LP-07 | Rider | บันทึก Rider | `/life-plans/{id}/riders` | PUT | Life Planning | Selected rider snapshot |
| LP-08 | Review | โหลดข้อมูลทั้งแผน | `/life-plans/{id}` | GET | Life Planning | Aggregate plan |
| LP-08 | Review | Validate ก่อนคำนวณ | `/life-plans/{id}/validations` | POST | Life Planning | Errors และ warnings ทุก Step |
| LP-09 | Calculation | เริ่มคำนวณ | `/life-plans/{id}/calculations` | POST | Calculation | `calculationId`, status |
| LP-09 | Calculation | Poll สถานะ | `/life-plans/{id}/calculations/{calculationId}` | GET | Calculation | Queued/Processing/Completed/Failed |
| LP-09 | Calculation | คำนวณใหม่ | `/life-plans/{id}/calculations` | POST | Calculation | Calculation version ใหม่ |
| LP-10 | Result | โหลด Summary | `/life-plans/{id}/calculations/{calculationId}/summary` | GET | Calculation | KPI, AV/AN และ warnings |
| LP-10 | Result | โหลด Annual Projection | `/life-plans/{id}/calculations/{calculationId}/projections/annual?page=&pageSize=` | GET | Calculation | Annual projection |
| LP-10 | Result | โหลด Monthly Projection | `/life-plans/{id}/calculations/{calculationId}/projections/monthly?page=&pageSize=` | GET | Calculation | Monthly projection |
| LP-10 | Result | Export Projection | `/life-plans/{id}/calculations/{calculationId}/projections/export?period=ANNUAL` | GET | Calculation | CSV/XLSX file |
| LP-11 | Compare Plans | เพิ่มแผนเปรียบเทียบ | `/life-plan-comparisons` | POST | Life Planning | `comparisonId` |
| LP-11 | Compare Plans | โหลดผลเปรียบเทียบ | `/life-plan-comparisons/{comparisonId}` | GET | Life Planning | Comparison metrics |
| LP-12 | Proposal | Preview Proposal | `/life-plans/{id}/proposals/preview?calculationId=` | GET | Document | Preview data/temporary PDF |
| LP-12 | Proposal | Generate PDF | `/life-plans/{id}/proposals` | POST | Document | `documentId`, status, version |
| LP-12 | Proposal | ตรวจสถานะ PDF | `/life-plans/{id}/proposals/{documentId}` | GET | Document | Processing/Ready/Failed |
| LP-12 | Proposal | Download PDF | `/life-plans/{id}/proposals/{documentId}/content` | GET | Document | PDF stream |
| LP-13 | Quotation | ตรวจความพร้อม | `/life-plans/{id}/quotation-readiness` | GET | Life Planning | Ready flag และ missing items |
| LP-13 | Quotation | Submit Quotation | `/life-plans/{id}/quotation-submissions` | POST | Quotation Integration | Submission ID และ Quotation reference |
| LP-13 | Quotation | ตรวจสถานะ | `/life-plans/{id}/quotation-submissions/{submissionId}` | GET | Quotation Integration | Submitted/Accepted/Rejected |
| LP-14 | Version History | ดู Version | `/life-plans/{id}/versions` | GET | Life Planning | Draft/calculation/document versions |
| LP-14 | Version History | ดู Audit | `/life-plans/{id}/audit-events?page=&pageSize=` | GET | Audit | Change history |

## 4. Detailed Screen Field Mapping

### LP-03 - Basic Information

| UI field | API field | Type | Required | Source/Rule |
|---|---|---|---|---|
| Product | `productCode` | string | Y | LP-02 Product selection |
| อายุปัจจุบัน | `currentAge` | integer | Y | Calculated from DOB or entered for public mode |
| อายุสิ้นสุดความคุ้มครอง | `coverageEndAge` | integer | Y | Product config min/max |
| อายุสิ้นสุดชำระเบี้ย | `premiumPaymentEndAge` | integer | Y | Must not exceed coverage age |
| ระยะเวลาคุ้มครอง | `coverageYears` | integer | Server calculated | `coverageEndAge-currentAge+1` |
| ระยะเวลาชำระเบี้ย | `premiumPaymentYears` | integer | Server calculated | `premiumPaymentEndAge-currentAge+1` |
| EM (%) | `extraMortalityRate` | decimal | N | Underwriting/config rule |
| รูปแบบชำระเบี้ย | `paymentMode` | enum | Y | `ANNUAL`, `SEMI_ANNUAL`, `QUARTERLY`, `MONTHLY` |

### LP-04 - Premium Segments

| UI field | API field | Type | Required | Validation |
|---|---|---|---|---|
| อายุเริ่ม | `premiumSegments[].startAge` | integer | Y | เรียงจากน้อยไปมาก |
| อายุสิ้นสุด | `premiumSegments[].endAge` | integer | Y | ไม่ซ้อนและไม่มี gap |
| RP/ปี | `premiumSegments[].regularPremium` | decimal | Y | Product min/max |
| Top-up/ปี | `premiumSegments[].topUpPremium` | decimal | N | 0 หรือไม่ต่ำกว่า minimum top-up |
| รวม/ปี | `premiumSegments[].totalAnnualPremium` | decimal | Server calculated | RP + Top-up |

### LP-05 - Retirement Plan

| UI field | API field | Type | Required | Validation |
|---|---|---|---|---|
| ต้องการเป้าหมายเกษียณ | `retirementPlan.enabled` | boolean | Y | หาก false ไม่ต้องส่งรายละเอียด |
| อายุเริ่มรับเงิน | `retirementPlan.startAge` | integer | Conditional | Product config เช่น 55-70 |
| รับเงินถึงอายุ | `retirementPlan.endAge` | integer | Conditional | มากกว่าหรือเท่ากับ start age |
| ความถี่ | `retirementPlan.frequency` | enum | Conditional | `MONTHLY`, `ANNUAL` |
| จำนวนเงิน | `retirementPlan.amountPerPayment` | decimal | Conditional | Min/max และ AV sufficiency |
| Surcharge | `retirementPlan.surchargeRate` | decimal | N | Configuration driven |

### LP-06 - Withdrawal Plans

| UI field | API field | Type | Required | Validation |
|---|---|---|---|---|
| ประเภท | `withdrawalPlans[].type` | enum | Y | `ONE_TIME`, `RECURRING` |
| อายุเริ่มถอน | `withdrawalPlans[].startAge` | integer | Y | หลัง policy start |
| ถอนถึงอายุ | `withdrawalPlans[].endAge` | integer | Conditional | Required for recurring |
| ความถี่ | `withdrawalPlans[].frequency` | enum | Conditional | Monthly/Quarterly/Annual |
| จำนวนเงินต่อครั้ง | `withdrawalPlans[].amountPerPayment` | decimal | Y | Positive and within config |
| ค่าธรรมเนียม | `withdrawalPlans[].feeRate` | decimal | Server/config | Read-only on UI |

### LP-07 - Riders

| UI field | API field | Type | Required | Validation |
|---|---|---|---|---|
| Rider code | `riders[].riderCode` | string | Y | Must belong to selected product |
| Plan code | `riders[].planCode` | string | Conditional | Required for plan-based rider |
| Sum assured/benefit | `riders[].benefitAmount` | decimal | Conditional | Rider min/max |
| Coverage end age | `riders[].coverageEndAge` | integer | Y | Rider age limit |
| Payment mode | `riderPaymentMode` | enum | Y | `DEDUCT_FROM_AV`, `INCLUDE_IN_PREMIUM` |
| Premium | `riders[].annualPremium` | decimal | Server calculated | Rate table/version |

## 5. Key API Contracts

### Create Life Plan

`POST /api/v1/life-plans`

```json
{
  "channel": "TL_SMART",
  "prospectId": "PR00001234",
  "purpose": "RETIREMENT",
  "currency": "THB"
}
```

```json
{
  "lifePlanningId": "LP202607270001",
  "status": "DRAFT",
  "version": 1,
  "createdAt": "2026-07-27T10:00:00+07:00"
}
```

### Save Premium Segments

`PUT /api/v1/life-plans/LP202607270001/premium-segments`

```json
{
  "recordVersion": 3,
  "paymentMode": "ANNUAL",
  "premiumSegments": [
    {
      "sequence": 1,
      "startAge": 30,
      "endAge": 44,
      "regularPremium": 50000,
      "topUpPremium": 10000
    },
    {
      "sequence": 2,
      "startAge": 45,
      "endAge": 59,
      "regularPremium": 30000,
      "topUpPremium": 0
    }
  ]
}
```

### Start Calculation

`POST /api/v1/life-plans/LP202607270001/calculations`

```json
{
  "lifePlanVersion": 4,
  "configurationVersion": "PCONFIG-20260701-01",
  "projectionPeriods": ["ANNUAL", "MONTHLY"],
  "assumptions": {
    "illustratedReturnRate": 0.05
  }
}
```

```json
{
  "calculationId": "CAL202607270001",
  "calculationVersion": 1,
  "status": "QUEUED",
  "submittedAt": "2026-07-27T10:30:00+07:00"
}
```

### Calculation Summary

`GET /api/v1/life-plans/LP202607270001/calculations/CAL202607270001/summary`

```json
{
  "status": "COMPLETED",
  "calculationVersion": 1,
  "configurationVersion": "PCONFIG-20260701-01",
  "firstYearPremium": 60000,
  "totalPremium": 1350000,
  "totalRetirementBenefit": 3600000,
  "totalOtherWithdrawal": 500000,
  "finalAccountValue": 1250000,
  "finalDeathBenefit": 1500000,
  "avCheck": "PASS",
  "anCheck": "PASS",
  "warnings": []
}
```

### Generate Proposal

`POST /api/v1/life-plans/LP202607270001/proposals`

```json
{
  "calculationId": "CAL202607270001",
  "calculationVersion": 1,
  "language": "TH",
  "templateCode": "LP_PROPOSAL_V2"
}
```

### Submit to Quotation

`POST /api/v1/life-plans/LP202607270001/quotation-submissions`

```json
{
  "calculationId": "CAL202607270001",
  "documentId": "DOC202607270001",
  "prospectId": "PR00001234",
  "productCode": "UWB"
}
```

## 6. Screen State and API Behaviour

| UI state | Trigger | UI behaviour | API behaviour |
|---|---|---|---|
| Loading | เปิดหน้าหรือกด Next | Disable action และแสดง progress | Timeout target 10 วินาทีสำหรับ query |
| Auto-saving | Field เปลี่ยนและหยุดกรอก 1 วินาที | แสดง `กำลังบันทึก` | Debounce PUT/PATCH |
| Saved | บันทึกสำเร็จ | แสดงเวลาบันทึกล่าสุด | Return recordVersion ใหม่ |
| Validation error | กด Next/Calculate | อยู่หน้าเดิมและ focus field แรก | HTTP 422 พร้อม fieldErrors |
| Warning | Rule ไม่ block | แสดง warning และให้ยืนยัน | HTTP 200 พร้อม warnings |
| Conflict | Draft ถูกแก้จากที่อื่น | แสดง dialog reload/compare | HTTP 409 version conflict |
| Processing | Calculation/PDF | Poll ทุก 2 วินาที | HTTP 202 และ status endpoint |
| Failed | Technical failure | Retry ได้และแสดง correlation ID | HTTP 5xx หรือ status FAILED |
| Session expired | Token หมดอายุ | เก็บ Draft local ชั่วคราวและ re-authenticate | HTTP 401 |

## 7. API Validation and HTTP Status

| HTTP status | Meaning | UI handling |
|---|---|---|
| 200 | Query/update สำเร็จ | แสดงข้อมูลหรือ saved state |
| 201 | สร้าง resource สำเร็จ | Redirect/open resource ใหม่ |
| 202 | รับงาน asynchronous | แสดง progress และ poll status |
| 400 | Request format ผิด | แสดงข้อความทั่วไปและ correlation ID |
| 401 | Session/token หมดอายุ | Re-authenticate |
| 403 | ไม่มีสิทธิ์ | Access denied |
| 404 | ไม่พบ resource | แสดง not found และกลับหน้ารายการ |
| 409 | Version/duplicate conflict | Reload/compare หรือ reuse existing request |
| 422 | Business validation ไม่ผ่าน | Map `fieldErrors` ไปยัง UI field |
| 429 | Request มากเกินไป | Disable retry ชั่วคราว |
| 500/502/503 | ระบบขัดข้อง | Retry ตาม policy และแสดง correlation ID |

## 8. API Dependency Sequence

```text
Open Life Plan
  -> GET Life Plan
  -> GET Product Configuration
  -> GET Rider/Retirement/Withdrawal Rules

Next per Step
  -> PUT Step Data
  -> POST Step Validation

Calculate
  -> POST Full Validation
  -> POST Calculation
  -> GET Calculation Status
  -> GET Summary/Projection

Generate Proposal
  -> POST Proposal
  -> GET Proposal Status
  -> GET PDF Content

Submit Quotation
  -> GET Quotation Readiness
  -> POST Quotation Submission
  -> GET Submission Status
```

## 9. SA Open Decisions

| Decision ID | Question | Owner |
|---|---|---|
| DEC-01 | Life Planning เป็น public calculator หรือ internal authenticated application | Business/Security |
| DEC-02 | อายุคำนวณจาก DOB หรือให้กรอกโดยตรง | Business |
| DEC-03 | Calculation เป็น synchronous หรือ asynchronous | Architecture/Calculation |
| DEC-04 | Monthly projection เก็บใน DB หรือสร้างเมื่อเรียก | Architecture/Data |
| DEC-05 | Draft auto-save ทุก field หรือเมื่อกด Next | UX/Business |
| DEC-06 | Product configuration snapshot ต้องเก็บระดับใด | Product/Data |
| DEC-07 | Proposal PDF เก็บถาวรกี่ปี | Legal/PDPA |
| DEC-08 | Quotation รับ calculation payload หรือรับ reference ID | Quotation Owner |
| DEC-09 | Recalculate หลัง config เปลี่ยนต้องบังคับหรือแจ้งเตือน | Business/Product |
| DEC-10 | Excel เป็น golden source ถึงวันใดและใครเป็นผู้ sign-off | Business/Actuarial |

## 10. Definition of Done

- ทุก UI action มี API หรือมีเหตุผลชัดเจนว่าเป็น client-side action
- ทุก UI field map กับ API field และ Data Dictionary
- Validation ฝั่ง UI และ API ใช้ Rule ID เดียวกัน
- Error code สามารถ map เป็นข้อความและตำแหน่งบนหน้าจอได้
- Calculation result ระบุ calculation/configuration version เสมอ
- Proposal และ Quotation อ้าง calculation version เดียวกัน
- API รองรับ retry และป้องกันรายการซ้ำสำหรับ critical command
- Requirement, Screen, API และ Test Case trace ถึงกันได้
