# Project Docs Document Memory

Source reviewed: `C:\Users\lenovo\plantuml-demo\docs`  
Reviewed: 2026-07-31  
Purpose: durable SA/Dev/Business/Data memory plus document and worksheet coverage ledger

## Coverage Summary

| Type | Files | Coverage | Result |
|---|---:|---:|---|
| Excel (.xlsx/.xlsm) | 52 | 584 worksheets (476 visible, 108 hidden) | 52 read, 0 errors |
| PDF | 37 | 665 pages / 651,116 extracted characters | 37 read, 0 errors |
| DOCX | 7 | 412,097 extracted characters | 7 read, 0 errors |
| Legacy .doc | 1 | Jira HTML export / 1,479 characters | read |
| Draw.io | 1 | 3 pages | read |
| PowerPoint | 1 | 16 slides | read |
| PNG diagrams | 2 | authentication/application flow and rider-display solution | visually reviewed |
| TXT / project Markdown / PlantUML | 6 / 2 / 3 | supporting requirements, solution design, ER/E2E/task flows | read |
| Executable / lock files | 3 | excluded as non-document artifacts | not ingested |

The Excel pass visited approximately 1,230,750 non-empty cells and 400,893 formula cells. It observed 50,212 cached formula-error values; most are concentrated in Life Planning simulation/template ranges and require Excel recalculation with controlled test scenarios before being classified as defects.

## Durable Business and Architecture Memory

### Life Planning / LifeVerse

- The document set forms a chain from product specification and BRD to detailed screen/API specifications and actuarial/projection workbooks. The principal current-looking artifacts are the LifeVerse product specification, Life Planning BRD V2.5, Life Planning calculation workbook V5.7, and Self Design Tool V1.5.
- The user journey is Prospect/Agent context -> coverage period -> premium design -> sum assured -> expected return -> financial goals (savings, retirement, withdrawal) -> rider selection -> recommendation/result -> sales illustration/quotation.
- LifeVerse 99/99 is a flexible premium/account-value product. The reviewed product specification states entry age from one month through age 80 for current sale and benefit coverage to age 99.
- Premium concepts are Regular Premium (RP) and Top-up Premium (TP). The product specification records minimum annual RP of THB 36,000, with annual/semi-annual/quarterly/monthly modes and THB 100 increments. TP is flexible but is constrained by product/regulatory rules, including an annual cumulative cap relative to accumulated RP.
- RP increase/decrease is allowed after one full policy year and on the policy anniversary, subject to minimum premium, premium-holiday, charge, commission, and watermark-method rules.
- The calculation model includes premium charges, surrender charges, COI, account value, investment return assumptions, partial withdrawal, retirement/annuity income, PPR/rider funding, sum-assured multipliers, occupation caps, rider rates, and sales illustration tables.
- The V5.7 workbook adds/deepens Package Rider, ACC, Health, HB, CI, COI, Annuity, and SA Multiplier data. The Self Design workbook contains the customer-facing flow plus large monthly projection and document-template sheets.
- Account-value sufficiency and COI coverage are recurring guardrails. Withdrawal/retirement/rider choices must be validated against future account-value sustainability, not only current cash flow.
- Integration boundaries include prospect/lead, quotation, rider, application, document generation, sales illustration, and downstream policy/application processes.

### Renewal Payment / e-RYP / APL

- The business objective is to let TL Smart and TLI App collect renewal premium plus APL interest, including Legacy and InsureMO policies and cases beyond the earlier 90-day limitation.
- Primary payment channels in scope are QR Code and Credit Card. The wider reference set also contains Cheque and Direct Debit status semantics.
- The required end-to-end capabilities are eligibility and policy preparation, realtime premium/interest calculation, payment initiation/result handling, premium and interest receipts, Legacy/Core transaction update, benefit calculation, reconciliation, GL transaction generation, and customer notification.
- The dashboard design uses a renewal-payment summary widget and six status cards, with permission/disabled/dynamic-layout behavior and navigation into payment-history/detail views.
- A central referenced endpoint is `GET /ms-members/v1/renewal-policy/ryp-detail-widget`. Related artifacts define response mapping, configuration, list-of-value mapping, date/eligibility rules, and database mapping.
- The data model centers on payment history, payment transaction, and payment detail/pay-period information. The reviewed dictionary explicitly covers `ryp_payment_transaction` and `ryp_payment_detail`.
- Payment response codes differ by channel and must not be normalized by string alone: QR/Cheque use codes such as `00000`/`10000`; Credit Card uses `000`/`100`; Direct Debit uses collection status such as `00`/`01`/`02`.
- Production design must add explicit idempotency, signed callbacks, guarded state transitions, immutable audit events, reconciliation ownership, GL/outbox behavior, and source-system authority.

### Migration and Data

- The TLPro -> TL Smart migration scope spans prospect, prospect address, PDPA, quotation, quotation rider, application, insured, beneficiary, guardian, answers, documents, payment, refund, eKYC, and related offer/tracking entities.
- Mapping workbooks consistently separate TL Smart target schema, legacy/source representation, and example SQL. This should become executable mapping specifications and reconciled migration tests, not remain spreadsheet-only.
- The downloads contain production-like sample identifiers and personal/business data. Do not copy raw samples into source control or logs. Use masked fixtures and a formal PII classification/retention policy.
- Two copies of `NASA_R2_Data Dictionary.xlsx` exist with different file names; they appear structurally aligned but should have one controlled source and version.

### Identity, 2FA, and Authorization

- UAM defines role/action permissions across trainee agent, agent, unit, center, region, division, director, and expired-license roles.
- Permission vocabulary includes View, Create, Update, Delete, Approve, and Reject. BOF and TL Smart matrices contain current, draft, archive, recruitment, widget, landing, and historical variants.
- Multiple hidden/archive permission sheets create source-of-truth risk. Authorization rules should be versioned as machine-readable policy and tested against UI and API enforcement.
- The Login 2FA BRD indicates identity hardening is a real program concern. The current prototype's hard-coded login/static session remains inconsistent with that target.

### API and Integration Landscape

- `TLI_Surrounding _API_Spec.xlsx` contains 68 sheets covering producer/consumer APIs, customer/UW/risk/payment/refund/notification/document/claim/consent/receipt/collection integrations and backup/version variants.
- API governance is currently document-heavy and version-fragmented. Establish OpenAPI source control, owner/system-of-record, compatibility policy, security scheme, error model, correlation ID, timeout/retry policy, and contract tests.
- Screen-level TNS PDFs provide detailed API/UI/field mapping for Life Planning steps 0-7, summary, application detail, quotation preview, RYP widget, landing, and UAM. They should be traced to backlog IDs and automated acceptance tests.

### Application and e-Application Journey

- The application scope extends beyond creating a proposal. It covers applicant/insured data, beneficiary and guardian data, health and other-insurance answers, PDPA/consent, DOPA/eKYC, email verification, document upload, signature, preview/PDF generation, payment, submission, status tracking, and application detail.
- `Authen.png` connects authentication risk checks with application form, eKYC, consent, verified email, supporting documents, preview, and payment. These are one controlled orchestration flow, not independent screens.
- Application submission should be guarded by a server-side completeness checklist. UI completion indicators are advisory; the API must revalidate identity, consent version, required answers/documents, signatures, payment status, and product rules.
- Long-running integrations such as OCR, document storage, e-Submission, Core/DIM, correspondence, and payment callback should expose retryable states and immutable audit history rather than leave an application in an ambiguous generic status.
- The 105-sheet Life Planning POC API workbook is an integration evidence catalog covering PDPA, DOPA, eKYC, QR/card/direct-debit payment, refund, OCR, e-Submission, document upload, Core/DIM, correspondence, signatures, counter-offer, family, UW, notification, and cheque flows. POC evidence is not a production contract; each retained integration still needs an owner, OpenAPI contract, security model, SLA, idempotency rule, and contract tests.

### OIC e-Policy and Custodian 2027

- `OIC-EpolicyAndCustodian2026.pptx` describes the transition to electronic policy issuance and OIC custodian submission, targeted from 1 January 2027 for the stated life, PA, and micro-insurance scope.
- The electronic policy is the original policy artifact, while a customer may still request a paper copy. Required disclosure text affects both the application/sales journey and the policy schedule.
- Delivery impacts Core generation, API submission and verification, document-size handling, durable storage, POS/Claim endorsements, printing-vendor behavior, customer access, and operational reconciliation with the custodian.
- Treat custodian submission as an auditable state machine: generated -> signed -> submitted -> accepted/rejected -> corrected/resubmitted -> available. Preserve document hash, signature/certificate evidence, submission correlation ID, acknowledgement, version, and retention metadata.

### Rider Presentation and Product Configuration

- `Solution_NASA-12252.png` records display corrections for rider groups: remove inappropriate generic prefixes, use group-specific wording, map rider codes/names correctly, format monetary values with separators, and include the correct benefit/unit suffixes.
- Rider labels are regulated/product content and should come from effective-dated configuration with language and product-version keys, not hard-coded UI strings.
- Display mapping must be tested together with eligibility and calculation mapping so that the shown rider, premium, benefit amount, and generated quotation/application documents remain consistent.

## Cross-Document Risks and Decisions

1. **Source-of-truth/version drift:** BRD V2.4, V2.5, model V5.1, model V5.7, Self Design V1.5, duplicate/backup/hidden sheets, and API versions coexist. Approve a version matrix per release.
2. **Spreadsheet-as-code risk:** calculation behavior depends on hundreds of thousands of formulas, macros, hidden sheets, and cached values. Create golden scenarios and reimplement approved rules in a tested calculation service.
3. **Formula error interpretation:** cached `#N/A` and similar values occur heavily in empty/template projection scenarios. Recalculate in Excel with controlled inputs and classify expected-empty versus genuine formula faults.
4. **PII and financial data:** migration and API examples contain production-like identifiers and customer/policy fields. Apply masking, access controls, audit, retention, and secret scanning.
5. **Payment consistency:** channel-specific result codes, callbacks, receipts, Core updates, reconciliation, GL, and SMS must be one controlled state machine with idempotent events.
6. **Authorization consistency:** UI visibility, widget/menu configuration, and backend authorization must be driven from the same policy source.
7. **Document encoding:** some Draw.io/PDF text is visibly double-encoded or uses custom font mappings. Preserve originals and validate Thai labels visually when implementing UI.
8. **Duplicate artifact:** `[NASA] BRD - Life Planning LV V.2.4.pdf` and its `(1)` copy are byte-identical.
9. **Application orchestration:** identity, consent, documents, signatures, payment, and submission cross multiple systems. A persisted workflow and explicit retry/recovery rules are required.
10. **Regulatory document lifecycle:** e-Policy generation, signing, custodian acceptance, correction, endorsement, retrieval, and paper-copy requests require end-to-end evidence and retention controls.
11. **Product-content consistency:** rider names and units differ by rider group and release. Effective-dated configuration must drive screen, calculation, quotation, and policy documents consistently.

## Recommended Traceability Baseline

| Domain | Requirement source | Rule/data source | API/UI source | Required executable evidence |
|---|---|---|---|---|
| Life Planning | BRD V2.5 + Product Specification | Calculation V5.7 + Self Design V1.5 | TNS Step 0-7/Summary PDFs | golden scenario tests and versioned config |
| RYP/APL | RYP BRD + APL Legacy BRD | Data dictionary + payment detail sheets | RYP widget/detail/API PDFs | payment state-machine and reconciliation tests |
| Migration | Migration scope workbook | per-table mapping workbooks | application/quotation specs | row-count, field, checksum, and exception reconciliation |
| Identity/UAM | Login 2FA BRD + UAM | permission matrices | landing/widget/menu specs | API authorization matrix tests |

## Excel Workbook and Worksheet Coverage

Every worksheet below was opened from OOXML and scanned for cell/formula metadata. Hidden state is retained because hidden sheets often contain assumptions, rates, mappings, and calculation logic.

### [NASA] User Authorization Matrix (Updated100426).xlsx

Sheets: 21; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Instruction | visible | A1:Z999 | 8 | 0 | 0 | read |
| 2 | Widget หน้าหลัก | visible | A1:O998 | 218 | 0 | 0 | read |
| 3 | R2 Permission TL SMART | hidden | A1:BE1056 | 1,680 | 0 | 0 | read |
| 4 | Copy of R2 Permission TL SMART | hidden | A1:BH1072 | 1,732 | 0 | 0 | read |
| 5 | Widget - เมนูลัด | visible | A1:N989 | 202 | 0 | 0 | read |
| 6 | UAM BOF | visible | A1:BY991 | 356 | 0 | 0 | read |
| 7 | BOF_User | visible | A1:AA992 | 67 | 0 | 0 | read |
| 8 | Menu Nav Dictionary | visible | A1:E11 | 32 | 0 | 0 | read |
| 9 | UAM R1 | visible | A1:BE1050 | 1,608 | 0 | 0 | read |
| 10 | UAM R2 | visible | A1:BE1059 | 2,283 | 0 | 0 | read |
| 11 | Sheet16 | visible | A3:W12 | 59 | 0 | 0 | read |
| 12 | Landing | hidden | A1:BJ1036 | 2,475 | 0 | 0 | read |
| 13 | Archive Permission TL SMART | hidden | A1:BL1147 | 7,226 | 0 | 0 | read |
| 14 | Recruitment Revised | hidden | A1:BW1027 | 1,852 | 0 | 0 | read |
| 15 | Recruitment | hidden | A1:Z1014 | 171 | 0 | 0 | read |
| 16 | Backup Recruitment Revised | hidden | A1:AW1000 | 75 | 0 | 0 | read |
| 17 | 2024 Backup Permission TL SMART | hidden | A1:BM1072 | 3,871 | 0 | 0 | read |
| 18 | Business Logic Display Agent Pr | hidden | A1:AO1005 | 444 | 0 | 0 | read |
| 19 | draft Recruitment landing page( | hidden | A1:BD16 | 576 | 0 | 0 | read |
| 20 | 220125 Recruitment landing page | hidden | A1:AY983 | 670 | 0 | 0 | read |
| 21 | 247 | hidden | A1:BM1071 | 3,911 | 0 | 0 | read |

### [NASA_R2] Migration data & support existing case from TLPro.xlsx

Sheets: 24; formulas: 3; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | INDEX | visible | B3:C18 | 16 | 0 | 0 | read |
| 2 | ListTable | visible | B1:N48 | 280 | 0 | 0 | read |
| 3 | Solution | visible | B2:F82 | 79 | 0 | 0 | read |
| 4 | Solution  autoSumbit_Fail | visible | B2 | 1 | 0 | 0 | read |
| 5 | MigrationDataScope | visible | A2:F36 | 52 | 0 | 0 | read |
| 6 | Concern List | visible | B3:L37 | 160 | 0 | 0 | read |
| 7 | SA Task | visible | B2:E5 | 10 | 1 | 0 | read |
| 8 | TLPro count row | visible | A1 | 0 | 0 | 0 | read |
| 9 | Opt1 | visible | B2 | 1 | 0 | 0 | read |
| 10 | TLSMART_prospect | hidden | A1:U77 | 850 | 0 | 0 | read |
| 11 | prospect_address | hidden | A2:AA26 | 161 | 0 | 0 | read |
| 12 | prospect_pdpa | hidden | A2:AA26 | 166 | 0 | 0 | read |
| 13 | ExampleSQLScript_prospect | hidden | B3:F104 | 192 | 0 | 0 | read |
| 14 | Pro prospect | hidden | B2:I113 | 536 | 0 | 0 | read |
| 15 | TLSMART_prospect_address | hidden | A2:U29 | 300 | 0 | 0 | read |
| 16 | ExampleSQLScript_prospect_addre | hidden | A2:G28 | 111 | 0 | 0 | read |
| 17 | TLSMART_quotation | hidden | A2:AA95 | 1,176 | 2 | 0 | read |
| 18 | TLSMART_prospect_pdpa | hidden | A1:T27 | 282 | 0 | 0 | read |
| 19 | TLSMART_document_file | hidden | A2:O21 | 138 | 0 | 0 | read |
| 20 | TLSMART_application | hidden | A2:AA99 | 1,026 | 0 | 0 | read |
| 21 | TLSMART_quotation_rider | hidden | A1:T15 | 135 | 0 | 0 | read |
| 22 | Pro quotation | hidden | A1:F70 | 315 | 0 | 0 | read |
| 23 | ExampleSQLScript2 | hidden | A1:CO118 | 437 | 0 | 0 | read |
| 24 | ExampleSQLScript3 | hidden | B2:C101 | 194 | 0 | 0 | read |

### [NASA-CR-076]แก้ไขใบเสนอขาย EN64,EN65,W023.xlsx

Sheets: 3; formulas: 3; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Change Request Form | visible | A1:V974 | 123 | 3 | 0 | read |
| 2 | Value | visible | A1:Z1000 | 9 | 0 | 0 | read |
| 3 | Priority and Impact | visible | A1:Z1000 | 29 | 0 | 0 | read |

### 2026_ทีม TLI-TLI ASA Master Plan (Backlog and Activity Tracking)_selling.xlsx

Sheets: 58; formulas: 14,759; cached formula errors: 4,677

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Restore 9-Apr-2025 | hidden | A1:BN292 | 9,946 | 1,220 | 716 | read |
| 2 | Timeline&Prioritize 2 May | visible | A2:J712 | 25 | 0 | 0 | read |
| 3 | NASA Plan Preparation | visible | A1:CA114 | 5,895 | 603 | 0 | read |
| 4 | Sheet1 | hidden | A3:F10 | 16 | 0 | 0 | read |
| 5 | Sellingbacklogsจัดใหม่4JUN | visible | A1:XFC693 | 17,767 | 4,395 | 577 | read |
| 6 | actual sprint plan | visible | A1:U50 | 255 | 0 | 0 | read |
| 7 | Sheet3 | visible | A1:F199 | 349 | 0 | 0 | read |
| 8 | repriority | visible | C1:K32 | 86 | 0 | 0 | read |
| 9 | Master Plan 25 Sep | visible | A1:DQ597 | 2,573 | 8 | 0 | read |
| 10 | Sheet2 | visible | H3:K9 | 15 | 0 | 0 | read |
| 11 | R2.1&R2.2 Scope | visible | C1:H31 | 121 | 0 | 0 | read |
| 12 | Status Description | visible | A1:E29 | 76 | 0 | 0 | read |
| 13 | WK_BluePrint | visible | A1 | 0 | 0 | 0 | read |
| 14 | Group by Sprints | visible | A1:BY322 | 2,314 | 0 | 94 | read |
| 15 | Sub_Plan for Register LVA Cours | visible | A1:CQ25 | 932 | 41 | 0 | read |
| 16 | Sheet36 | hidden | D1:H33 | 80 | 0 | 0 | read |
| 17 | Copy of Sellingbacklogsจัดใหม่4 | hidden | A1:CT245 | 8,738 | 1,538 | 561 | read |
| 18 | Master Plan 7 Jul | hidden | A1:CP236 | 771 | 4 | 0 | read |
| 19 | Payment | visible | A1:CP20 | 387 | 4 | 0 | read |
| 20 | MARS Workshop Schedule | hidden | A1 | 0 | 0 | 0 | read |
| 21 | Activity by sprint 06 May | visible | A1:AP122 | 355 | 0 | 0 | read |
| 22 | Sprint period | visible | A2:C30 | 87 | 0 | 0 | read |
| 23 | DIS Sprint Ceremony | visible | B1:U24 | 93 | 7 | 0 | read |
| 24 | DEL Sprint Ceremony | visible | B1:U24 | 81 | 7 | 0 | read |
| 25 | DraftPlan 9Jun | hidden | A1:CP258 | 763 | 16 | 0 | read |
| 26 | DraftPlan | hidden | A1:CZ254 | 693 | 19 | 0 | read |
| 27 | Sheet33 | hidden | A1:AQ315 | 3,791 | 946 | 1 | read |
| 28 | Detail2 | hidden | A1:CT2 | 75 | 0 | 0 | read |
| 29 | Sheet29 | visible | A1:I12 | 52 | 0 | 0 | read |
| 30 | Product Plan Design | visible | A1 | 0 | 0 | 0 | read |
| 31 | Sheet25 | hidden | A5:J14 | 30 | 0 | 0 | read |
| 32 | Jirax | hidden | A1:V100 | 363 | 0 | 0 | read |
| 33 | Selling backlogs (Not Used) | visible | A1:BZ279 | 10,273 | 1,429 | 892 | read |
| 34 | รายชื่อ Resoure | visible | A1:G25 | 89 | 0 | 0 | read |
| 35 | Activity by sprint | hidden | A1:G23 | 51 | 0 | 0 | read |
| 36 | Activity by sprint 9 Apr | hidden | A1:O42 | 102 | 0 | 0 | read |
| 37 | Copy of Activity by sprint 9 Ap | hidden | A1:O46 | 110 | 0 | 0 | read |
| 38 | Activity by sprint 24 Apr | hidden | A1:O47 | 127 | 0 | 0 | read |
| 39 | Activity by sprint 30 Apr | hidden | A1:R90 | 233 | 0 | 0 | read |
| 40 | Time | hidden | A2:P17 | 54 | 4 | 0 | read |
| 41 | Copy of Time | hidden | A2:N9 | 17 | 1 | 0 | read |
| 42 | Pivot Table 9 | hidden | A1 | 0 | 0 | 0 | read |
| 43 | Pivot Table 8 | hidden | F1:G1 | 0 | 0 | 0 | read |
| 44 | Sheet14 | hidden | A1 | 0 | 0 | 0 | read |
| 45 | Pivot Table 11 | visible | K1:Z1 | 0 | 0 | 0 | read |
| 46 | Pivot Table 12 | visible | A1 | 0 | 0 | 0 | read |
| 47 | API impact | visible | A1:O45 | 168 | 151 | 54 | read |
| 48 | Copy of Selling 1 | hidden | A1:BQ288 | 9,576 | 1,209 | 716 | read |
| 49 | Active Card | hidden | A2:BK273 | 9,121 | 1,149 | 659 | read |
| 50 | Temp-Min | hidden | A2:X232 | 1,874 | 377 | 77 | read |
| 51 | Lead&Prospect | visible | A1:FO30 | 1,048 | 0 | 20 | read |
| 52 | RFP | visible | A1:V240 | 4,956 | 241 | 0 | read |
| 53 | Copy of Selling | hidden | A1:AH275 | 4,105 | 763 | 0 | read |
| 54 | Selling effort dis | hidden | A1:G25 | 87 | 3 | 0 | read |
| 55 | 5 Topics | hidden | A1:G21 | 45 | 0 | 0 | read |
| 56 | Compare 11 Mar | hidden | A1:AY285 | 6,407 | 615 | 308 | read |
| 57 | MDmap_Aqua | visible | B1:AB239 | 522 | 4 | 2 | read |
| 58 | Holiday | visible | A2:AC73 | 314 | 5 | 0 | read |

### ASA\admin_menu_tree.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main Page | visible | A1:D1000 | 15 | 0 | 0 | read |
| 2 | admin_menu_tree - R1S9 | visible | A1:Z1001 | 38 | 0 | 0 | read |
| 3 | admin_menu_tree - R2S16 | visible | A1:Z1001 | 47 | 0 | 0 | read |

### ASA\asa_group_permission Table.xlsx

Sheets: 9; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main Page | visible | A1:D1000 | 26 | 0 | 0 | read |
| 2 | asa_group_permission - R1S9 | visible | A1:H997 | 2,221 | 0 | 0 | read |
| 3 | asa_group_permission - R2S1 | visible | A1:H911 | 1,847 | 0 | 0 | read |
| 4 | asa_group_permission - R2S2 | visible | A1:H911 | 1,967 | 0 | 0 | read |
| 5 | asa_group_permission - R2S3 | visible | A1:H913 | 2,062 | 0 | 0 | read |
| 6 | asa_group_permission - R2S6 | visible | A1:H913 | 2,182 | 0 | 0 | read |
| 7 | asa_group_permission - R2S11 | visible | A1:J913 | 2,282 | 0 | 0 | read |
| 8 | asa_group_permission - R2S13 | visible | A1:J913 | 2,307 | 0 | 0 | read |
| 9 | asa_group_permission - R3S20 | visible | A1:J913 | 2,327 | 0 | 0 | read |

### ASA\asa_menu_permission Table.xlsx

Sheets: 10; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main Page | visible | A1:D1000 | 26 | 0 | 0 | read |
| 2 | asa_menu_permission - R1S9 | visible | A1:G999 | 347 | 0 | 0 | read |
| 3 | asa_menu_permission - R2S1 | visible | A1:G999 | 377 | 0 | 0 | read |
| 4 | asa_menu_permission - R2S2 | visible | A1:G999 | 407 | 0 | 0 | read |
| 5 | asa_menu_permission - R2S3 | visible | A1:G999 | 437 | 0 | 0 | read |
| 6 | asa_menu_permission - R2S6 | visible | A1:G999 | 467 | 0 | 0 | read |
| 7 | asa_menu_permission - R2S11 | visible | A1:G999 | 497 | 0 | 0 | read |
| 8 | asa_menu_permission - R2S13 | visible | A1:G999 | 527 | 0 | 0 | read |
| 9 | asa_menu_permission - R3S20 | visible | A1:G999 | 567 | 0 | 0 | read |
| 10 | Sheet1 | visible | A1 | 0 | 0 | 0 | read |

### ASA\asa_menu_tree.xlsx

Sheets: 8; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main Page | visible | A1:D1000 | 15 | 0 | 0 | read |
| 2 | asa_menu_tree - R1S9 | visible | A1:K1000 | 434 | 0 | 0 | read |
| 3 | asa_menu_tree - R2S1 | visible | A1:K999 | 444 | 0 | 0 | read |
| 4 | asa_menu_tree - R2S6 | visible | A1:K1000 | 453 | 0 | 0 | read |
| 5 | asa_menu_tree - R2S11 | visible | A1:K984 | 334 | 0 | 0 | read |
| 6 | asa_menu_tree - R2S13 | visible | A1:K984 | 351 | 0 | 0 | read |
| 7 | asa_menu_tree - R2S16 (2) | visible | A1:K984 | 351 | 0 | 0 | read |
| 8 | asa_menu_tree - R3S20 | visible | A1:K975 | 359 | 0 | 0 | read |

### ASA\asa_permission Table.xlsx

Sheets: 9; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main Page | visible | A1:D1000 | 26 | 0 | 0 | read |
| 2 | asa_permission - R1S9 | visible | A1:F963 | 750 | 0 | 0 | read |
| 3 | asa_permission - R2S1 | visible | A1:F1000 | 774 | 0 | 0 | read |
| 4 | asa_permission - R2S2 | visible | A1:F999 | 798 | 0 | 0 | read |
| 5 | asa_permission - R2S3 | visible | A1:F999 | 822 | 0 | 0 | read |
| 6 | asa_permission - R2S6 | visible | A1:F999 | 846 | 0 | 0 | read |
| 7 | asa_permission - R2S11 | visible | A1:F993 | 870 | 0 | 0 | read |
| 8 | asa_permission - R2S13 | visible | A1:F999 | 894 | 0 | 0 | read |
| 9 | asa_permission - R3S20 | visible | A1:F13 | 54 | 0 | 0 | read |

### Copy of Rider Checking (rider on shelf 2025) - Copy.xlsx

Sheets: 4; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | All plan on shelf_GIO_Senior | visible | A1:AI934 | 636 | 0 | 0 | read |
| 2 | All plan on shelf_WO_GIO_Senior | visible | A1:AH980 | 1,452 | 0 | 0 | read |
| 3 | All plan on shelf_original | visible | A1:AH999 | 1,870 | 0 | 0 | read |
| 4 | ซื้อ rider ได้ | visible | A1:AF969 | 1,040 | 0 | 0 | read |

### coupon-EN60.xlsx

Sheets: 6; formulas: 3,863; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | EN60 | visible | A1:I9 | 33 | 3 | 0 | read |
| 2 | เงินคืน EN60(age 0-10) | visible | A1:J858 | 8,373 | 946 | 0 | read |
| 3 | เงินคืน EN60(age 11-25) | visible | A1:J970 | 9,454 | 1,088 | 0 | read |
| 4 | เงินคืน EN60(age 16-45) | visible | A1:J940 | 9,094 | 1,098 | 0 | read |
| 5 | เงินคืน EN60(age 46-65) | visible | A1:J540 | 5,094 | 698 | 0 | read |
| 6 | Sheet2 | visible | A1:J46 | 183 | 30 | 0 | read |

### DataDict_ms_payment.xlsx

Sheets: 6; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | INDEX | visible | A1:AB116 | 15 | 0 | 0 | read |
| 2 | BCP responseCode | visible | B2:B21 | 17 | 0 | 0 | read |
| 3 | ms_payment | visible | A1:AA94 | 530 | 0 | 0 | read |
| 4 | R3 ryp_payment_transaction | visible | A1:AA101 | 264 | 0 | 0 | read |
| 5 | R3 ryp_payment_detail | visible | A1:AA28 | 113 | 0 | 0 | read |
| 6 | DESIGN ryp_transaction | visible | B1:M39 | 210 | 0 | 0 | read |

### Life Verse 1.0_Initial Life Planning Tool_PD_v.5.1_20251126_CR Annuity.xlsm

Sheets: 17; formulas: 99,576; cached formula errors: 2,403

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Log | visible | A1:I15 | 43 | 0 | 0 | read |
| 2 | Manual | hidden | B2:E19 | 54 | 0 | 0 | read |
| 3 | Prem Rec Step | visible | B1:G19 | 53 | 0 | 0 | read |
| 4 | Formula for Recommend | visible | B1:D33 | 90 | 0 | 0 | read |
| 5 | Formula for SI | visible | A1:E30 | 108 | 0 | 0 | read |
| 6 | Life Planning | visible | A1:N855 | 217 | 102 | 3 | read |
| 7 | TH_Sales Illustration | visible | B1:AO106 | 3,089 | 2,134 | 0 | read |
| 8 | TH_Quotation | visible | A1:AJ1206 | 34,926 | 14,737 | 0 | read |
| 9 | SI_M for Recommend | visible | A1:BP1206 | 80,555 | 36,763 | 1,200 | read |
| 10 | SI_M | visible | A1:BP1206 | 78,136 | 42,630 | 1,200 | read |
| 11 | Sales Illustration | hidden | B1:AS1194 | 4,154 | 3,202 | 0 | read |
| 12 | Assumption | visible | A2:F74 | 63 | 3 | 0 | read |
| 13 | PPR | visible | A1:X207 | 4,129 | 5 | 0 | read |
| 14 | COI | visible | A3:E104 | 507 | 0 | 0 | read |
| 15 | Annuity | visible | A3:Y164 | 107 | 0 | 0 | read |
| 16 | SA Multiplier | visible | B1:D85 | 248 | 0 | 0 | read |
| 17 | Index | visible | B2:I7 | 33 | 0 | 0 | read |

### Life Verse 1.0_Initial Life Planning Tool_PD_v.5.7_20260429_Decrease SA&Update annuity factor.xlsm

Sheets: 22; formulas: 103,370; cached formula errors: 2,403

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Log | visible | A1:I17 | 79 | 0 | 0 | read |
| 2 | Manual | hidden | B2:E19 | 54 | 0 | 0 | read |
| 3 | Prem Rec Step | visible | B1:F20 | 55 | 0 | 0 | read |
| 4 | Formula for Recommend | visible | B1:D32 | 90 | 0 | 0 | read |
| 5 | Formula for SI | visible | A1:E29 | 103 | 0 | 0 | read |
| 6 | Life Planning | visible | A1:N157 | 242 | 111 | 3 | read |
| 7 | Package Rider | visible | A1:Y210 | 4,547 | 3,065 | 0 | read |
| 8 | TH_Sales Illustration | visible | B1:AO106 | 3,080 | 2,039 | 0 | read |
| 9 | TH_Quotation | visible | A1:AJ1206 | 34,925 | 14,737 | 0 | read |
| 10 | SI_M for Recommend | visible | A1:BP1206 | 80,555 | 36,765 | 1,200 | read |
| 11 | SI_M | visible | A1:BP1206 | 78,136 | 42,630 | 1,200 | read |
| 12 | Sales Illustration | hidden | B1:AS1194 | 4,154 | 3,202 | 0 | read |
| 13 | Assumption | visible | A2:F74 | 63 | 3 | 0 | read |
| 14 | PPR | visible | A1:CL208 | 16,472 | 381 | 0 | read |
| 15 | ACC | hidden | B2:N38 | 369 | 12 | 0 | read |
| 16 | Health | hidden | A1:CT1135 | 39,735 | 410 | 0 | read |
| 17 | HB | hidden | B2:Z85 | 1,643 | 8 | 0 | read |
| 18 | CI | hidden | B2:AD99 | 2,034 | 5 | 0 | read |
| 19 | COI | visible | A3:E104 | 507 | 0 | 0 | read |
| 20 | Annuity | visible | A3:Y164 | 140 | 2 | 0 | read |
| 21 | SA Multiplier | visible | B1:G85 | 253 | 0 | 0 | read |
| 22 | Index | visible | B2:I7 | 33 | 0 | 0 | read |

### Life Verse_Life Planning_Self Design Tool_v1.5_16072026_Unlock for Dev 1.xlsm

Sheets: 39; formulas: 179,201; cached formula errors: 40,715

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Life Planning | visible | A1:CF53 | 300 | 126 | 1 | read |
| 2 | Self Design | visible | A1:BW664 | 2,005 | 405 | 60 | read |
| 3 | Package Rider | visible | A1:Y210 | 4,532 | 3,093 | 0 | read |
| 4 | Sales Illustration | hidden | B1:AQ1194 | 3,922 | 3,291 | 2,274 | read |
| 5 | TH_Sales Illustration | visible | B1:AB106 | 2,434 | 2,209 | 1,002 | read |
| 6 | SI_M | visible | A1:BO1206 | 74,509 | 43,755 | 36,834 | read |
| 7 | Assumption | hidden | A2:F74 | 60 | 3 | 0 | read |
| 8 | ACC | hidden | B2:N38 | 369 | 12 | 0 | read |
| 9 | Health | hidden | A1:CT1135 | 39,735 | 410 | 0 | read |
| 10 | HB | hidden | B2:Z85 | 1,643 | 8 | 0 | read |
| 11 | CI | hidden | B2:AD99 | 2,034 | 5 | 0 | read |
| 12 | Annuity | hidden | A3:Y164 | 140 | 2 | 0 | read |
| 13 | COI | hidden | A3:E104 | 507 | 0 | 0 | read |
| 14 | SA Multiplier | hidden | B1:G85 | 253 | 0 | 0 | read |
| 15 | Index | visible | B1:Q323 | 415 | 642 | 0 | read |
| 16 | เกณฑ์เงื่อนไขอาชีพ | hidden | A1:AJ1079 | 8,221 | 10 | 542 | read |
| 17 | รพ. | hidden | A1:BO59 | 978 | 20 | 0 | read |
| 18 | Health Fit HB Pro | hidden | A1:BU59 | 932 | 20 | 0 | read |
| 19 | Prem Series >> | visible | A1:T347 | 3,037 | 1,828 | 0 | read |
| 20 | Input | visible | A1:S1190 | 2,783 | 4,797 | 0 | read |
| 21 | 1_Series | visible | B1:AB104 | 2,649 | 254 | 0 | read |
| 22 | 2_Prem | visible | B1:AB1192 | 30,937 | 26,243 | 0 | read |
| 23 | 3_LastMode | visible | B1:AB1192 | 30,937 | 26,242 | 0 | read |
| 24 | 4_#Mth | visible | B1:AB1192 | 30,937 | 26,242 | 0 | read |
| 25 | 5_%PremChrg | visible | B1:AB1192 | 30,937 | 26,242 | 0 | read |
| 26 | 6_PremChrg | visible | B2:AB1192 | 9,514 | 3,668 | 0 | read |
| 27 | SurrChrgRP >> | visible | A1 | 0 | 0 | 0 | read |
| 28 | 1_AnnualPrem | visible | B1:AB1192 | 2,623 | 2,207 | 0 | read |
| 29 | 2_#Year | visible | B1:AB1192 | 2,623 | 2,207 | 0 | read |
| 30 | 3_%SurrChrgRP | visible | B1:AE1192 | 2,923 | 2,409 | 0 | read |
| 31 | DocTemplate>> | hidden | A1 | 0 | 0 | 0 | read |
| 32 | Page1 | hidden | A1:W132 | 359 | 488 | 0 | read |
| 33 | Page2 | hidden | A1:W134 | 454 | 660 | 0 | read |
| 34 | Page3 | hidden | A1:W134 | 298 | 660 | 0 | read |
| 35 | Page4 | hidden | A1:W134 | 64 | 660 | 0 | read |
| 36 | LastPage1 | hidden | B1:V43 | 39 | 54 | 0 | read |
| 37 | LastPage2 | hidden | A1:W44 | 27 | 77 | 1 | read |
| 38 | LastPage3 | hidden | A1:V39 | 17 | 61 | 0 | read |
| 39 | PrintControl | hidden | B2:J90 | 296 | 191 | 1 | read |

### lov widget r3.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Sheet1 | visible | A1:J130 | 517 | 0 | 0 | read |
| 2 | LOV | visible | A1:I8 | 72 | 0 | 0 | read |
| 3 | Sheet3 | visible | A1:E17 | 46 | 0 | 0 | read |

### Mapping application.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A2:AA99 | 1,050 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H100 | 481 | 0 | 0 | read |
| 3 | Pro | visible | A1:H117 | 564 | 0 | 0 | read |

### Mapping application_address.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:U36 | 438 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H36 | 160 | 0 | 0 | read |
| 3 | Pro | visible | A1:H70 | 117 | 0 | 0 | read |

### Mapping application_answer.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:S24 | 270 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 79 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H24 | 107 | 0 | 0 | read |

### Mapping application_beneficiary.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:S50 | 635 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H50 | 235 | 0 | 0 | read |
| 3 | Pro | visible | A1:H70 | 195 | 0 | 0 | read |

### Mapping application_counter_offer.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T38 | 356 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 184 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H33 | 149 | 0 | 0 | read |

### Mapping application_guardian.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:S58 | 618 | 0 | 0 | read |
| 2 | Pro | visible | A1:H71 | 246 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H49 | 230 | 0 | 0 | read |

### Mapping application_insurance_rejection.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T19 | 212 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 87 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H19 | 85 | 0 | 0 | read |

### Mapping application_insured.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T82 | 966 | 0 | 0 | read |
| 2 | Pro | visible | A1:H117 | 564 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H82 | 358 | 0 | 0 | read |

### Mapping application_offer_document.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:S20 | 118 | 0 | 0 | read |
| 2 | Pro | visible | A1:F70 | 0 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H12 | 55 | 0 | 0 | read |

### Mapping application_offer_information.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T30 | 339 | 0 | 0 | read |
| 2 | Pro | visible | A1:F70 | 0 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H31 | 140 | 0 | 0 | read |

### Mapping application_offer_payment.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:U28 | 306 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H27 | 128 | 0 | 0 | read |
| 3 | Pro | visible | A1:F70 | 0 | 0 | 0 | read |

### Mapping application_offer_tracking.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:S28 | 133 | 0 | 0 | read |
| 2 | Pro | visible | A1:F70 | 0 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H13 | 49 | 0 | 0 | read |

### Mapping application_other_insurance.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T31 | 377 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H31 | 136 | 0 | 0 | read |
| 3 | Pro | visible | A1:H70 | 135 | 0 | 0 | read |

### Mapping application_payment.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T79 | 1,048 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H79 | 340 | 0 | 0 | read |
| 3 | Pro | visible | A1:H70 | 248 | 0 | 0 | read |

### Mapping application_refund_transaction.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T35 | 381 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 98 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H34 | 161 | 0 | 0 | read |

### Mapping document_file.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T20 | 177 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 94 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H18 | 81 | 0 | 0 | read |

### Mapping ekyc.xlsx

Sheets: 3; formulas: 0; cached formula errors: 8

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T27 | 284 | 0 | 8 | read |
| 2 | Pro | visible | A1:H70 | 84 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H26 | 124 | 0 | 0 | read |

### Mapping guardian_pdpa.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T18 | 152 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 72 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H15 | 69 | 0 | 0 | read |

### Mapping prospect.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART_prospect | visible | A1:U77 | 850 | 0 | 0 | read |
| 2 | Pro | visible | A1:F70 | 216 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:G75 | 292 | 0 | 0 | read |

### Mapping prospect_address.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART_prospect_address | visible | A2:U29 | 300 | 0 | 0 | read |
| 2 | Pro | visible | A1:F70 | 4 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A2:H28 | 111 | 0 | 0 | read |

### Mapping quotation.xlsx

Sheets: 3; formulas: 2; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:W96 | 1,196 | 2 | 0 | read |
| 2 | Pro | visible | A1:H71 | 403 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:H95 | 425 | 0 | 0 | read |

### Mapping quotation_guardian.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:T26 | 233 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H22 | 96 | 0 | 0 | read |
| 3 | Pro | visible | A1:H15 | 83 | 0 | 0 | read |

### Mapping quotation_rider.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART_quotation_rider | visible | A1:T15 | 140 | 0 | 0 | read |
| 2 | ExampleSQLScript | visible | A1:H15 | 64 | 0 | 0 | read |
| 3 | Pro | visible | A1:D13 | 51 | 0 | 0 | read |

### Mapping Rider for Life Planning.xlsx

Sheets: 3; formulas: 1; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Mapping | visible | A1:I34 | 128 | 0 | 0 | read |
| 2 | Copy of Checklist | visible | A1:AE999 | 438 | 1 | 0 | read |
| 3 | Copy of Rider List | visible | A1:AI1000 | 403 | 0 | 0 | read |

### Mapping sales_dopa_status.xlsx

Sheets: 3; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | TLSMART | visible | A1:Y20 | 203 | 0 | 0 | read |
| 2 | Pro | visible | A1:H70 | 58 | 0 | 0 | read |
| 3 | ExampleSQLScript | visible | A1:I20 | 91 | 0 | 0 | read |

### NASA_Data Dictionary.xlsx

Sheets: 16; formulas: 4; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | DatabaseComponent | visible | A1:AC20 | 36 | 0 | 0 | read |
| 2 | ms_sales(ตัวอย่าง) | visible | A1:AA335 | 82 | 4 | 0 | read |
| 3 | ER-Diagram | visible | B1:D994 | 2 | 0 | 0 | read |
| 4 | ms_sale | visible | A1:AA2974 | 11,116 | 0 | 0 | read |
| 5 | ms_member | visible | A1:AA294 | 943 | 0 | 0 | read |
| 6 | ms_common | visible | A1:AA762 | 1,671 | 0 | 0 | read |
| 7 | ms_transaction_log | visible | A1:AA74 | 355 | 0 | 0 | read |
| 8 | ms_payment | visible | A1:AA125 | 677 | 0 | 0 | read |
| 9 | ms_notification | visible | A1:AA261 | 1,326 | 0 | 0 | read |
| 10 | ms_premuim_cal | visible | A1:AA6 | 4 | 0 | 0 | read |
| 11 | ClearSyncLog | visible | C3:L40 | 73 | 0 | 0 | read |
| 12 | Prospect x Quo x AppInsure | visible | B1:L1000 | 726 | 0 | 0 | read |
| 13 | Quo x App x AppPayment | visible | B3:M91 | 760 | 0 | 0 | read |
| 14 | SetNewPlan,NewRider | visible | A1:Y989 | 137 | 0 | 0 | read |
| 15 | List table Notification | visible | B2:B25 | 22 | 0 | 0 | read |
| 16 | TLProTable(Old) | visible | A1:AO1009 | 404 | 0 | 0 | read |

### NASA_R2_Data Dictionary (1).xlsx

Sheets: 16; formulas: 4; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | DatabaseComponent | visible | A1:AC20 | 36 | 0 | 0 | read |
| 2 | ms_sales(ตัวอย่าง) | visible | A1:AA335 | 82 | 4 | 0 | read |
| 3 | ER-Diagram | visible | B1:D994 | 2 | 0 | 0 | read |
| 4 | ms_sale | visible | A1:AA2974 | 11,116 | 0 | 0 | read |
| 5 | ms_member | visible | A1:AA294 | 943 | 0 | 0 | read |
| 6 | ms_common | visible | A1:AA762 | 1,671 | 0 | 0 | read |
| 7 | ms_transaction_log | visible | A1:AA74 | 355 | 0 | 0 | read |
| 8 | ms_payment | visible | A1:AA125 | 677 | 0 | 0 | read |
| 9 | ms_notification | visible | A1:AA261 | 1,326 | 0 | 0 | read |
| 10 | ms_premuim_cal | visible | A1:AA6 | 4 | 0 | 0 | read |
| 11 | ClearSyncLog | visible | C3:L40 | 73 | 0 | 0 | read |
| 12 | Prospect x Quo x AppInsure | visible | B1:L1000 | 726 | 0 | 0 | read |
| 13 | Quo x App x AppPayment | visible | B3:M91 | 760 | 0 | 0 | read |
| 14 | SetNewPlan,NewRider | visible | A1:Y989 | 137 | 0 | 0 | read |
| 15 | List table Notification | visible | B2:B25 | 22 | 0 | 0 | read |
| 16 | TLProTable(Old) | visible | A1:AO1009 | 404 | 0 | 0 | read |

### NASA_R2_Data Dictionary.xlsx

Sheets: 16; formulas: 4; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | DatabaseComponent | visible | A1:AC20 | 36 | 0 | 0 | read |
| 2 | ms_sales(ตัวอย่าง) | visible | A1:AA335 | 82 | 4 | 0 | read |
| 3 | ER-Diagram | visible | B1:D994 | 2 | 0 | 0 | read |
| 4 | ms_sale | visible | A1:AA2974 | 11,116 | 0 | 0 | read |
| 5 | ms_member | visible | A1:AA294 | 943 | 0 | 0 | read |
| 6 | ms_common | visible | A1:AA762 | 1,671 | 0 | 0 | read |
| 7 | ms_transaction_log | visible | A1:AA74 | 355 | 0 | 0 | read |
| 8 | ms_payment | visible | A1:AA125 | 677 | 0 | 0 | read |
| 9 | ms_notification | visible | A1:AA261 | 1,326 | 0 | 0 | read |
| 10 | ms_premuim_cal | visible | A1:AA6 | 4 | 0 | 0 | read |
| 11 | ClearSyncLog | visible | C3:L40 | 73 | 0 | 0 | read |
| 12 | Prospect x Quo x AppInsure | visible | B1:L1000 | 726 | 0 | 0 | read |
| 13 | Quo x App x AppPayment | visible | B3:M91 | 760 | 0 | 0 | read |
| 14 | SetNewPlan,NewRider | visible | A1:Y989 | 137 | 0 | 0 | read |
| 15 | List table Notification | visible | B2:B25 | 22 | 0 | 0 | read |
| 16 | TLProTable(Old) | visible | A1:AO1009 | 404 | 0 | 0 | read |

### NASA-10568_Master_Mapping_Recommended.xlsx

Sheets: 4; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Summary | visible | A1:I25 | 225 | 0 | 0 | read |
| 2 | Master Mapping | visible | A1:R855 | 11,504 | 0 | 0 | read |
| 3 | Needs Review | visible | A1:I65 | 487 | 0 | 0 | read |
| 4 | Mapping Rules | visible | A1:C9 | 27 | 0 | 0 | read |

### POC_APIs_Life_Planing_V1.xlsx

Sheets: 105; formulas: 84; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | API_Question | visible | A1:AC989 | 26 | 0 | 0 | read |
| 2 | BCP_Question | visible | A1:AC1001 | 127 | 0 | 0 | read |
| 3 | UNW_Question | visible | A1:AC987 | 24 | 0 | 0 | read |
| 4 | Mule_Question | visible | A1:AC989 | 35 | 0 | 0 | read |
| 5 | SPARK_Question | visible | A1:AC989 | 38 | 0 | 0 | read |
| 6 | MOM-BCP | visible | B2:E49 | 58 | 0 | 0 | read |
| 7 | SALES-24 Api | visible | A1:Z1000 | 71 | 0 | 0 | read |
| 8 | Lead Centralize API | visible | B3:F20 | 18 | 0 | 0 | read |
| 9 | ปรับไม่ส่งนามสกุล | visible | C2:C3 | 2 | 0 | 0 | read |
| 10 | SALES-24 ImpactList | visible | A1:W967 | 37 | 1 | 0 | read |
| 11 | POC PDPA-01(1) | visible | B2:J121 | 93 | 0 | 0 | read |
| 12 | POC PDPA-01(2) | visible | A1:Z1001 | 18 | 0 | 0 | read |
| 13 | POC Dopa Api | visible | B2:O127 | 35 | 0 | 0 | read |
| 14 | POC Ekyc API(1) | visible | A1:Z993 | 43 | 0 | 0 | read |
| 15 | POC Ekyc(checkResult) | visible | A2:AB481 | 571 | 0 | 0 | read |
| 16 | POC MuleSubmitRefNo(1) | visible | B1:O1003 | 405 | 0 | 0 | read |
| 17 | POC MuleSubmitRefNo(2) | visible | A1:T832 | 310 | 0 | 0 | read |
| 18 | POC GenE-TRNumber | visible | B2:O43 | 14 | 0 | 0 | read |
| 19 | POC BCP_DGT-35(QR Bay) | visible | A1:W977 | 71 | 0 | 0 | read |
| 20 | POC BCP-DGT-31(QR Bay | visible | A1:W963 | 138 | 0 | 0 | read |
| 21 | POC BCP-DGT-17(CC) | visible | A1:W974 | 82 | 0 | 0 | read |
| 22 | POC BCP-CBS-03(CC) | visible | A1:W961 | 136 | 0 | 0 | read |
| 23 | POC BCP-GW-CBS03(CC) | visible | A1:W935 | 125 | 0 | 0 | read |
| 24 | POC BCP-KBANK-QR-01(QR KBank) | visible | A1:W976 | 74 | 1 | 0 | read |
| 25 | POC BCP-KBANK-QR-02(QR KBank) | visible | A1:W988 | 115 | 1 | 0 | read |
| 26 | POC BCP-DGT-11(แนบ slip) | visible | A1:W980 | 79 | 0 | 0 | read |
| 27 | POC DGT-22 | visible | A1:W980 | 78 | 1 | 0 | read |
| 28 | PF-005(checkCreditCardPayment) | visible | A1:W925 | 37 | 1 | 0 | read |
| 29 | POC  DGT-01 | visible | A1:W1054 | 176 | 1 | 0 | read |
| 30 | POC Mule RegistCollection | visible | A1:X1019 | 226 | 1 | 0 | read |
| 31 | DD-RequestToCollection | visible | A1:W999 | 124 | 1 | 0 | read |
| 32 | DD-InquireCollection | visible | A1:W1000 | 130 | 1 | 0 | read |
| 33 | POC BCP-Sandbox | visible | A1:W975 | 52 | 1 | 0 | read |
| 34 | RefBCPSandBoxDoc | visible | A1:Z1010 | 162 | 0 | 0 | read |
| 35 | POC MST-UNW-API-04-1 | visible | A1:W978 | 23 | 0 | 0 | read |
| 36 | POC MST-UNW-API-03 | visible | A1:W978 | 61 | 0 | 0 | read |
| 37 | POC MST-UNW-API-04 | visible | A1:W956 | 44 | 1 | 0 | read |
| 38 | POC Mule SubmitRefundTransactio | visible | A1:T959 | 93 | 0 | 0 | read |
| 39 | POC TOKEN-REFUND | visible | A1:W926 | 98 | 1 | 0 | read |
| 40 | POC CommonRefund-InquiryOTP | visible | A1:W907 | 28 | 1 | 0 | read |
| 41 | POC PRO-44 | visible | A1:W907 | 26 | 1 | 0 | read |
| 42 | Mule Get Sum CI Multipay | visible | A1:W961 | 107 | 1 | 0 | read |
| 43 | POC Int DGT-35 | visible | A1:X911 | 47 | 0 | 0 | read |
| 44 | POC MuleLoadProduct | visible | A1:W971 | 27 | 0 | 0 | read |
| 45 | Note | visible | B3:B32 | 26 | 0 | 0 | read |
| 46 | POCMuleGenProposalNo | visible | A1:W964 | 18 | 0 | 0 | read |
| 47 | POC OCR Passport api | visible | B2:O43 | 14 | 0 | 0 | read |
| 48 | POC OCR IDCard api | visible | B2:O43 | 14 | 0 | 0 | read |
| 49 | POC Mule E-SubmissionUNUSE | hidden | A1:U827 | 949 | 0 | 0 | read |
| 50 | POC Mule E-Submission(1) | visible | A1:V853 | 2,302 | 0 | 0 | read |
| 51 | ESub2 | visible | B1:F57 | 163 | 0 | 0 | read |
| 52 | E-SubmissionImpact | visible | B2:H37 | 87 | 0 | 0 | read |
| 53 | Sheet28 | visible | A1:D19 | 76 | 0 | 0 | read |
| 54 | POC Mule UploadInsureDoc | visible | A1:W984 | 128 | 1 | 0 | read |
| 55 | Mule Saletool To DIM(Existing) | visible | A1:W256 | 425 | 1 | 0 | read |
| 56 | Mule E-Sub(ExistingCore) | visible | A1:X928 | 5,509 | 1 | 0 | read |
| 57 | Defect Esub(ExistingCore) | visible | C1:P108 | 621 | 0 | 0 | read |
| 58 | Esub_Question | visible | A1:AD988 | 81 | 0 | 0 | read |
| 59 | E-Sub(ExistingCore) - Question | visible | A4:Y144 | 851 | 0 | 0 | read |
| 60 | Sheet1 | visible | B1:G44 | 130 | 0 | 0 | read |
| 61 | InsureDoc callback(New) | visible | A1:W965 | 20 | 1 | 0 | read |
| 62 | InsureDoc callback(Ex) | visible | A1:W965 | 20 | 1 | 0 | read |
| 63 | Mule ONLINE001 | visible | A1:W967 | 69 | 1 | 0 | read |
| 64 | Mule ONLINE003 | visible | A1:W964 | 45 | 1 | 0 | read |
| 65 | Mule ONLINE004 | visible | A1:W964 | 45 | 1 | 0 | read |
| 66 | Mule ONLINE002 | visible | A1:W962 | 43 | 1 | 0 | read |
| 67 | DGT-04 | visible | A1:W957 | 54 | 1 | 0 | read |
| 68 | DGT-05 | visible | A1:W957 | 32 | 1 | 0 | read |
| 69 | POC Int DGT-42-NewCore | visible | A1:W1018 | 173 | 1 | 0 | read |
| 70 | POC Int DGT-42-OldCore | visible | A1:W1005 | 114 | 1 | 0 | read |
| 71 | POC Mule Corresp Download File | visible | A1:W974 | 22 | 1 | 0 | read |
| 72 | POC Mule CTF sign signature | visible | A1:W985 | 100 | 1 | 0 | read |
| 73 | POC Update-Counter-Offer | visible | A1:W979 | 67 | 1 | 0 | read |
| 74 | POC AFC-02 @base64 | visible | A1:W956 | 82 | 1 | 0 | read |
| 75 | POC FamilyInquire-01 | visible | A1:W961 | 165 | 1 | 0 | read |
| 76 | POC FamilyInquire-02 | visible | A1:W985 | 176 | 1 | 0 | read |
| 77 | getLvRelationList | visible | A1:W960 | 66 | 1 | 0 | read |
| 78 | TC familyRequest | visible | A1:U969 | 97 | 1 | 0 | read |
| 79 | TC inquiryStatus | visible | A1:W953 | 42 | 1 | 0 | read |
| 80 | TC sendEmail | visible | A1:W954 | 37 | 1 | 0 | read |
| 81 | TC validateOTP | visible | A1:W953 | 41 | 1 | 0 | read |
| 82 | PRO-51 | visible | A1:W952 | 30 | 1 | 0 | read |
| 83 | PRO-52 | visible | A1:W953 | 38 | 1 | 0 | read |
| 84 | PRO-39 | visible | A1:W953 | 39 | 1 | 0 | read |
| 85 | PRO-40 | visible | A1:W953 | 36 | 1 | 0 | read |
| 86 | CompareUWStatusAPIs | visible | B1:E51 | 49 | 0 | 0 | read |
| 87 | DGT-42-Compare | visible | B1:M189 | 534 | 25 | 0 | read |
| 88 | API GetTransactionUNW | visible | A1:X956 | 54 | 1 | 0 | read |
| 89 | API Laserize GetDocumentList | visible | A1:X956 | 46 | 1 | 0 | read |
| 90 | API Laserize GetFile | visible | A1:X956 | 28 | 1 | 0 | read |
| 91 | config map | visible | A1:A993 | 993 | 0 | 0 | read |
| 92 | SPK-01 | visible | A1:X969 | 38 | 1 | 0 | read |
| 93 | SPK-02 | visible | A1:X980 | 253 | 1 | 0 | read |
| 94 | SPK-03 | visible | A1:X967 | 36 | 1 | 0 | read |
| 95 | SPK-04 | visible | A1:X984 | 37 | 1 | 0 | read |
| 96 | Mapping SPK-04 | visible | A1:H499 | 1,733 | 0 | 0 | read |
| 97 | SPK-05 | visible | A1:X965 | 48 | 1 | 0 | read |
| 98 | SPK-06 | visible | A1:X973 | 104 | 1 | 0 | read |
| 99 | SPK-07 | visible | A1:X991 | 133 | 1 | 0 | read |
| 100 | UW verify-ic | visible | A1:X1002 | 171 | 1 | 0 | read |
| 101 | TLS-NOTI-01 | visible | A2:X966 | 32 | 1 | 0 | read |
| 102 | E-MemoRequest | visible | A2:X972 | 84 | 1 | 0 | read |
| 103 | Mule E-MemoInfo | visible | A1:X985 | 49 | 1 | 0 | read |
| 104 | BCP ChequeRecieveByBranch | visible | A1:X968 | 77 | 1 | 0 | read |
| 105 | BCP inquireChequeResult | visible | A1:X973 | 63 | 1 | 0 | read |

### product_ol_selling_description_config (1).xlsx

Sheets: 9; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main | visible | A1:D6 | 24 | 0 | 0 | read |
| 2 | product_ol_selling - R2S9 | visible | A1:I71 | 569 | 0 | 0 | read |
| 3 | product_ol_selling - R2S11 | visible | A1:U428 | 6,403 | 0 | 0 | read |
| 4 | product_ol_selling - R2S12 | visible | A1:W491 | 3,986 | 0 | 0 | read |
| 5 | product_ol_selling - R2S13 | visible | A1:W498 | 4,042 | 0 | 0 | read |
| 6 | product_ol_selling - R2S14 | visible | A1:W505 | 4,098 | 0 | 0 | read |
| 7 | product_ol_selling - R2S16 | visible | A1:W512 | 4,154 | 0 | 0 | read |
| 8 | product_ol_selling - R2S17 | visible | A1:W547 | 4,434 | 0 | 0 | read |
| 9 | product_ol_selling - R2S18 | visible | A1:W540 | 4,378 | 0 | 0 | read |

### product_ol_selling_description_config.xlsx

Sheets: 9; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Main | visible | A1:D6 | 24 | 0 | 0 | read |
| 2 | product_ol_selling - R2S9 | visible | A1:I71 | 569 | 0 | 0 | read |
| 3 | product_ol_selling - R2S11 | visible | A1:U428 | 6,403 | 0 | 0 | read |
| 4 | product_ol_selling - R2S12 | visible | A1:W491 | 3,986 | 0 | 0 | read |
| 5 | product_ol_selling - R2S13 | visible | A1:W498 | 4,042 | 0 | 0 | read |
| 6 | product_ol_selling - R2S14 | visible | A1:W505 | 4,098 | 0 | 0 | read |
| 7 | product_ol_selling - R2S16 | visible | A1:W512 | 4,154 | 0 | 0 | read |
| 8 | product_ol_selling - R2S17 | visible | A1:W547 | 4,434 | 0 | 0 | read |
| 9 | product_ol_selling - R2S18 | visible | A1:W540 | 4,378 | 0 | 0 | read |

### TableOutput.xlsx

Sheets: 1; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Sheet1 | visible | A1:J124 | 322 | 0 | 0 | read |

### TLI_Surrounding _API_Spec.xlsx

Sheets: 68; formulas: 19; cached formula errors: 6

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Sheet1 | hidden | A1 | 0 | 0 | 0 | read |
| 2 | DC consume | visible | A1:F122 | 398 | 0 | 0 | read |
| 3 | API TLI Producer | visible | A1:AD1048 | 1,067 | 1 | 6 | read |
| 4 | API InsureMO Producer | visible | A1:B2 | 4 | 0 | 0 | read |
| 5 | API lists TLI | visible | A1:D8 | 6 | 0 | 0 | read |
| 6 | Query Customer Tier | visible | A1:AB90 | 282 | 0 | 0 | read |
| 7 | UW Status Update | hidden | A1:Z1005 | 366 | 1 | 0 | read |
| 8 | UW Status Update_V2 | visible | A1:Z1049 | 671 | 1 | 0 | read |
| 9 | Submit Proposal and Upload Docu | visible | A1:K68 | 265 | 0 | 0 | read |
| 10 | Stamp Duty API | visible | A1:AJ999 | 361 | 0 | 0 | read |
| 11 | (New)Refund payment service | hidden | A1:AK564 | 483 | 0 | 0 | read |
| 12 | (New)Reject payment Service | hidden | A1:K45 | 197 | 0 | 0 | read |
| 13 | Create Customer API | visible | A1:Z115 | 719 | 1 | 0 | read |
| 14 | Policy Printing API | hidden | A1:J967 | 1,074 | 0 | 0 | read |
| 15 | Policy Printing API_V2_16092025 | hidden | A1:Y972 | 1,114 | 0 | 0 | read |
| 16 | Send Billing Info API | hidden | A1:K858 | 295 | 0 | 0 | read |
| 17 | Policy Printing API_MVP1 | hidden | A1:Y967 | 1,074 | 0 | 0 | read |
| 18 | Policy Printing API_V3_20112025 | visible | A1:Y1113 | 3,333 | 10 | 0 | read |
| 19 | Update Claim Movement API | visible | A1:AA846 | 502 | 0 | 0 | read |
| 20 | Update Proposal Movement API | visible | A1:AA842 | 458 | 0 | 0 | read |
| 21 | Sheet3 | visible | A1 | 0 | 0 | 0 | read |
| 22 | NB Query Proposal List API | visible | A1:W866 | 686 | 0 | 0 | read |
| 23 | Get Sum CI Multipay API | visible | A1:AI795 | 647 | 0 | 0 | read |
| 24 | NB Retrieve UW Rule InfoIMOAPI | visible | A1:W852 | 531 | 0 | 0 | read |
| 25 | RetrieveInfoforUWRule API | visible | A1:Z875 | 830 | 0 | 0 | read |
| 26 | Query Agent Risk API | visible | A1:BG792 | 1,026 | 0 | 0 | read |
| 27 | Initiate Doctor Consultation AP | visible | A1:W869 | 779 | 0 | 0 | read |
| 28 | PDPA | visible | B2:AA62 | 185 | 0 | 0 | read |
| 29 | PersonVerfication-PEP-SYS | visible | A1:W71 | 407 | 0 | 0 | read |
| 30 | Personal Verification | visible | A1:K58 | 316 | 0 | 0 | read |
| 31 | RiskScoring-Exp | visible | A1:M115 | 651 | 5 | 0 | read |
| 32 | RiskScoring-sys | visible | A1:Z1051 | 1,293 | 0 | 0 | read |
| 33 | sales-information-sys | visible | A1:W119 | 1,132 | 0 | 0 | read |
| 34 | E Payment | visible | A1:AR1078 | 526 | 0 | 0 | read |
| 35 | (New) Request Payment Cancellat | visible | A1:AJ1004 | 234 | 0 | 0 | read |
| 36 | Refund Payment | visible | A1:AV1006 | 520 | 0 | 0 | read |
| 37 | Reject Payment | visible | A1:AL1000 | 208 | 0 | 0 | read |
| 38 | Notification Policy Delivery AP | visible | A1:K55 | 295 | 0 | 0 | read |
| 39 | Notification Policy Delivery Re | visible | A1:Z982 | 433 | 0 | 0 | read |
| 40 | Update Policy Receive Date | visible | A1:K1000 | 250 | 0 | 0 | read |
| 41 | SubmitCommission | visible | A1:BH990 | 848 | 0 | 0 | read |
| 42 | Sheet2 | visible | B3:F6 | 15 | 0 | 0 | read |
| 43 | Email Service | visible | A1:AF872 | 303 | 0 | 0 | read |
| 44 | Generate Letter Service (2) | hidden | A1:Z451 | 2,652 | 0 | 0 | read |
| 45 | Generate Letter Service (Send B | hidden | A1:Z90 | 401 | 0 | 0 | read |
| 46 | SMS Service | visible | A1:Z273 | 1,289 | 0 | 0 | read |
| 47 | Generate Letter Service | visible | A1:Z336 | 1,897 | 0 | 0 | read |
| 48 | For Arinee | visible | A1:AW1032 | 4,097 | 0 | 0 | read |
| 49 | Send Billing Medical Info SYS | visible | A1:J65 | 368 | 0 | 0 | read |
| 50 | Search KYC | visible | A1:AI1006 | 825 | 0 | 0 | read |
| 51 | backup_Update Docmument Status | visible | A1:K51 | 250 | 0 | 0 | read |
| 52 | backup_SMS Service | visible | A1:J56 | 284 | 0 | 0 | read |
| 53 | backup_Email Service | visible | A1:J59 | 329 | 0 | 0 | read |
| 54 | backup_Policy Printing API | visible | A1:J185 | 1,053 | 0 | 0 | read |
| 55 | Validate-Sales-illustration | visible | A1:Z996 | 244 | 0 | 0 | read |
| 56 | Search Billing Number NDID | visible | A1:AH956 | 1,018 | 0 | 0 | read |
| 57 | Save Billing Number NDID | visible | A1:AH952 | 1,007 | 0 | 0 | read |
| 58 | InitiateInvestigation | visible | A1:AI1013 | 2,173 | 0 | 0 | read |
| 59 | CancelInvestigation | visible | A1:AH954 | 873 | 0 | 0 | read |
| 60 | Request Claim Reversal | visible | A1:AH928 | 508 | 0 | 0 | read |
| 61 | Update Claim Reversal Status | visible | A1:K953 | 432 | 0 | 0 | read |
| 62 | Consent Register | visible | A1:Z1008 | 321 | 0 | 0 | read |
| 63 | Receipt Printing API | visible | A1:Z144 | 906 | 0 | 0 | read |
| 64 | API-UNW-Generate Sales illustra | visible | A1:AA1143 | 1,106 | 0 | 0 | read |
| 65 | Register Collection API | visible | A1:Z1034 | 537 | 0 | 0 | read |
| 66 | Initiate Recurring Update API | visible | A1:Z1009 | 350 | 0 | 0 | read |
| 67 | Temp Receipt Number Submit API | visible | A1:Z1001 | 295 | 0 | 0 | read |
| 68 | Insert FATCA | visible | A1:AJ251 | 634 | 0 | 0 | read |

### UAM_RYP.xlsx

Sheets: 1; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Sheet1 | visible | A1:AU4 | 100 | 0 | 0 | read |

### User Authorization Matrix Updated090726.xlsx

Sheets: 22; formulas: 0; cached formula errors: 0

| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |
|---:|---|---|---|---:|---:|---:|---|
| 1 | Sheet16 | visible | A3:W12 | 59 | 0 | 0 | read |
| 2 | Instruction | visible | A1:Z999 | 8 | 0 | 0 | read |
| 3 | Widget หน้าหลัก | visible | A1:O998 | 218 | 0 | 0 | read |
| 4 | R2 Permission TL SMART | hidden | A1:BE1056 | 1,680 | 0 | 0 | read |
| 5 | Copy of R2 Permission TL SMART | hidden | A1:BH1072 | 1,732 | 0 | 0 | read |
| 6 | Widget - เมนูลัด | visible | A1:N989 | 202 | 0 | 0 | read |
| 7 | UAM BOF | visible | A1:BY991 | 356 | 0 | 0 | read |
| 8 | BOF_User | visible | A1:AA992 | 67 | 0 | 0 | read |
| 9 | Menu Nav Dictionary | visible | A1:E11 | 32 | 0 | 0 | read |
| 10 | UAM R1 | visible | A1:BE1050 | 1,608 | 0 | 0 | read |
| 11 | UAM R2 | visible | A1:BE1059 | 2,283 | 0 | 0 | read |
| 12 | UAM R3 | visible | A1:AZ1006 | 277 | 0 | 0 | read |
| 13 | Landing | hidden | A1:BJ1036 | 2,475 | 0 | 0 | read |
| 14 | Archive Permission TL SMART | hidden | A1:BL1147 | 7,226 | 0 | 0 | read |
| 15 | Recruitment Revised | hidden | A1:BW1027 | 1,852 | 0 | 0 | read |
| 16 | Recruitment | hidden | A1:Z1014 | 171 | 0 | 0 | read |
| 17 | Backup Recruitment Revised | hidden | A1:AW1000 | 75 | 0 | 0 | read |
| 18 | 2024 Backup Permission TL SMART | hidden | A1:BM1072 | 3,871 | 0 | 0 | read |
| 19 | Business Logic Display Agent Pr | hidden | A1:AO1005 | 444 | 0 | 0 | read |
| 20 | draft Recruitment landing page( | hidden | A1:BD16 | 576 | 0 | 0 | read |
| 21 | 220125 Recruitment landing page | hidden | A1:AY983 | 670 | 0 | 0 | read |
| 22 | 247 | hidden | A1:BM1071 | 3,911 | 0 | 0 | read |

## PDF Coverage

| File | Pages | Extracted characters | Status |
|---|---:|---:|---|
| [NASA] [BRD]_Application LV_V10.0.pdf | 95 | 137,695 | read |
| [NASA] BRD - Life Planning LV V.2.4 (1).pdf | 55 | 74,966 | read |
| [NASA] BRD - Life Planning LV V.2.4.pdf | 55 | 74,966 | read |
| [NASA] BRD - Quotation  Management _V5.0.pdf | 39 | 53,775 | read |
| {lifePlanningId} - [R2][S12]-230726-041844.pdf | 16 | 12,162 | read |
| {platform} - [R2][S3]-040726-061006.pdf | 9 | 4,699 | read |
| A Solution) - [NASA-10568] Cont. Migration data จาก TLPro มา TLSmart - [R2][S17]-230726-044733.pdf | 4 | 2,350 | read |
| A Solution) - [NASA-12005] Check After Sales Service Status - [R3][S20]-200726-104615.pdf | 4 | 2,299 | read |
| asa_menu Table.pdf | 4 | 2,253 | read |
| asa_widget Table.pdf | 5 | 2,836 | read |
| asa_widget_permission Table (2).pdf | 4 | 2,077 | read |
| asa_widget_permission Table.pdf | 4 | 2,084 | read |
| asa_widget_ryp Table (2).pdf | 4 | 2,077 | read |
| asa_widget_ryp_permission Table.pdf | 3 | 1,894 | read |
| asa_widget_ryp.pdf | 4 | 2,061 | read |
| asa_widget_shortcut Table.pdf | 5 | 2,829 | read |
| Customer Management Landing Page.pdf | 10 | 4,962 | read |
| landing.pdf | 10 | 4,955 | read |
| Life Planning V1\TNS-Step 1 _ Coverage Information - [R2][S14]-230726-035944.pdf | 10 | 6,986 | read |
| Life Planning V1\TNS-Step 2 _ Finance Information - [R2][S14]-230726-040707.pdf | 16 | 12,729 | read |
| Life Planning V1\TNS-Step 3 _ Rider Information - [R2][S12]-230726-040702.pdf | 10 | 7,586 | read |
| Life Planning V1\TNS-Step 4 _ Payment Period - [R2][S17]-230726-040818.pdf | 12 | 8,714 | read |
| Life Planning V1\TNS-Step 5 _ Return Rate Information - [R2][S7]-230726-040831.pdf | 10 | 6,206 | read |
| Life Planning V1\TNS-Step 6 _ Recommended Premium Information - [R2][S14]-230726-040923.pdf | 11 | 7,247 | read |
| Life Planning V1\TNS-Step 7 _ Summary Life Planning Information - [R2][S19]-230726-041019.pdf | 15 | 8,519 | read |
| Life Planning V1\TNS-Summary Life Planning - [R2][S16]-230726-041100.pdf | 25 | 19,573 | read |
| NASA - User Authorization Matrix (UAM).pdf | 51 | 50,489 | read |
| ryp-detail-widget - [R3][S20]-170726-080741.pdf | 21 | 19,505 | read |
| ryp-detail-widget.pdf | 27 | 24,906 | read |
| TNASR-asa_widget_ryp Table - [R3][S20]-200726-105642.pdf | 4 | 2,084 | read |
| TNASR-asa_widget_ryp_permission Table - [R3][S20]-200726-105903.pdf | 3 | 1,894 | read |
| TNS-Application Detail - [R2][S20]-060726-063708.pdf | 57 | 33,330 | read |
| TNS-Quotation Preview PDF - [R2][S16]-240726-015732.pdf | 20 | 11,460 | read |
| TNS-Step 0 _ Create Life Planning - [R2][S16]-230726-041438.pdf | 23 | 15,506 | read |
| Widget Dashboard RYP Summary.pdf | 6 | 5,112 | read |
| เปิดรอบการขาย W011_010726 รอส่งคุณไชย.pdf | 4 | 5,915 | read |
| รายละเอียดของรายการการชำระเบี้ยปีต่อ (e-RYP Detail).pdf | 10 | 12,415 | read |

## Word and Diagram Coverage

| File | Type | Coverage | Status |
|---|---|---|---|
| [NASA] [BRD]_Application Management_V11.0.docx | DOCX | 77,253 characters; 1,434 paragraphs; 34 tables; 8 media | read |
| [NASA] BRD - Life Planning LV V.2.5.docx | DOCX | 78,868 characters; 1,740 paragraphs; 41 tables; 12 media | read |
| [NASA] BRD - Login_2FA_V.1.0.docx | DOCX | 16,066 characters; 332 paragraphs; 11 tables; 6 media | read |
| [NASA]BRD - RYP_V1.0.docx | DOCX | 27,803 characters; 944 paragraphs; 21 tables; 1 media | read |
| [TLI - ASA] Assessment and Solution design.docx | DOCX | 40,258 characters; 427 paragraphs; 5 tables; 25 media | read |
| e-RYP x APL Payment (Legacy) BRD_V.0.1.docx | DOCX | 64,419 characters; 2,028 paragraphs; 23 tables; 12 media | read |
| LifeVerse Product Specification (Final for 15 05 2025) (2).docx | DOCX | 107,430 characters; 2,086 paragraphs; 26 tables; 5 media | read |
| NASA-11992.doc | HTML exported with .doc extension | 1,479 characters; Jira NASA-11992 quotation change request | read |
| Life Planning LV.drawio | Draw.io | 3 pages: journey, E2E Life Planning, ตารางคำนวณตัวอย่างผลประโยชน์ | read |

## Ingestion Notes

- Source files were read-only; no file under Downloads was modified.
- Source files were read-only; no raw project document was modified.
- PDF coverage is page-level text extraction. Image-only annotations or exact visual positioning require separate visual review when implementing a specific screen.
- DOCX coverage includes document body, tables, headers, footers, footnotes/endnotes, and comments when present in OOXML.
- Excel formulas were not recalculated; values are workbook cached values at the time the files were saved.
- Audit JSON and parser runtime remain under ignored `tmp/docs-memory-audit` and are not intended for source control.
- The detailed ledger intentionally excludes raw cell/page text to avoid committing customer-like identifiers and sensitive examples.
