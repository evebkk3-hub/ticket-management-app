# Impact Analysis (I/A Solution) - LiftPlanV2 Java + React Native iPad

| Topic | Detail |
| --- | --- |
| Overview | Rebuild LiftPlanV2 as a React Native application for iOS/iPad 11-inch with a Java calculation and orchestration API. |
| Changes | NEW mobile/tablet application; NEW Java Life Planning API; ENHANCE Life Planning data model for versioning, device synchronization and calculation traceability. |
| Reference | TASA I/A Solution template, TNS Life Planning Step 0-7, BRD Life Planning LV V2.4, Life Planning Self Design Tool V1.5. |
| Status | Draft for review |

## 1. Impact Analysis

| Type | Count | Detail |
| --- | ---: | --- |
| Front-end (Mobile/Tablet) | 8 | Task 0-7, iPad landscape, local draft, field validation, summary and error recovery. |
| Back-end - Internal API | 10 | CRUD, task save, validate, calculate, document, submit and configuration APIs. |
| Integration Solution | 4 | Product/Rider configuration, Calculation Engine, Document Service and Quotation Service. |
| Database | 10 | Versioned normalized tables listed in section 7. |
| Configuration Baseline | 6 | Product eligibility, age limits, premium limits, return/fee rate, rider rules and document permission. |
| Security | 7 | OAuth/JWT, TLS, authorization, encryption, audit, input validation and secure storage. |
| Test Scope | 9 | Task flows, API, calculation regression, database, offline draft, iPad UI, security, PDF and quotation integration. |

## 2. Architecture

- Client: React Native 0.74 / Expo 51, iOS landscape, `supportsTablet=true`.
- API: Java 21, stateless REST endpoints, validation and calculation orchestration.
- Database target: PostgreSQL; UUID v7 identifiers and `timestamptz` audit timestamps.
- Device draft: AsyncStorage contains draft input only. Sensitive tokens remain in iOS Keychain in production.
- Server is the source of truth after Save/Calculate. Calculation uses an immutable version snapshot.
- Diagrams: `life-planning-task-flows.puml`, `life-planning-e2e.puml`, and `life-planning-er.puml`.

## 3. Task Design

| Task | Input | Validation | Persistence | Output |
| --- | --- | --- | --- | --- |
| Task 0 Create Plan | prospect, product | permission, product eligibility, duplicate active plan | `life_plannings`, `life_planning_versions` | `lifePlanningId`, version 1 |
| Task 1 Coverage | current age, coverage age, payment end age | product min/max and age relationship | version snapshot | valid coverage period |
| Task 2 Finance | income, expense, goals, risk inputs | required, range, currency precision | version snapshot | finance assumptions |
| Task 3 Rider | rider code, benefit, coverage | product/age compatibility and AV affordability | `life_planning_riders` | annual rider premium |
| Task 4 Premium | RP/TP age segments | continuous, non-overlap, first/last age | `life_planning_premium_segments` | premium schedule |
| Task 5 Return/Withdrawal | return scenario, withdrawal type/age/amount | config baseline and coverage period | `life_planning_withdrawals` | withdrawal schedule |
| Task 6 Calculate | immutable version | complete tasks and current configuration | calculation result/projections | AV, premium, benefit, warnings |
| Task 7 Summary/Submit | calculation version | result pass, document version, permission | document and audit tables | PDF and quotation reference |

## 4. API Specification

| Code | Method and path | Purpose | Main response |
| --- | --- | --- | --- |
| LP-001 | `POST /v1/life-plannings` | Create plan | plan id, version, permissions |
| LP-002 | `GET /v1/life-plannings/{id}` | Get aggregate plan | tasks, version, calculation summary |
| LP-003 | `PUT /v1/life-plannings/{id}/steps/{step}` | Save one task | ETag, version, field errors |
| LP-004 | `POST /v1/life-plannings/{id}/versions` | Fork a version after changed source data | new version id |
| LP-005 | `POST /v1/life-plannings/{id}/validate` | Validate all tasks | field errors and warnings |
| LP-006 | `POST /v1/life-plannings/{id}/calculations` | Run monthly calculation | calculation id and summary |
| LP-007 | `GET /v1/life-plannings/{id}/projections` | Get annual/monthly projection | paginated rows |
| LP-008 | `POST /v1/life-plannings/{id}/documents` | Generate proposal PDF | document metadata and secure URL |
| LP-009 | `POST /v1/life-plannings/{id}/submit` | Submit locked version to quotation | quotation id and status |
| LP-010 | `GET /v1/life-planning-configurations` | Get product/rider/config baseline | config version and rules |

### Error contract

```json
{
  "code": "LP_VALIDATION_FAILED",
  "message": "ข้อมูลไม่ผ่านการตรวจสอบ",
  "correlationId": "uuid",
  "errors": [{ "step": 4, "field": "segments[1].startAge", "rule": "CONTINUOUS", "message": "ช่วงอายุต้องต่อเนื่อง" }]
}
```

## 5. Business Rules

1. Supported initial plans are UWB and UWD; eligibility remains configuration-driven.
2. Coverage age must be greater than current age. Payment end age must be from current age to below coverage age.
3. Premium segments start at current age, end at payment end age, are ascending, continuous and non-overlapping.
4. RP, TP and Rider premium must be non-negative and use `decimal(18,2)` server-side.
5. Retirement start age is 55-70, retirement end age does not exceed coverage age, and requested amount is at least THB 5,000.
6. Calculation baseline is versioned. Saved results must reference the exact input/config version.
7. Any change after calculation sets status to `STALE`; PDF/Quotation cannot use a stale result.
8. Concurrent save uses ETag/row version. HTTP 409 returns the current server version.

## 6. Database Standards

- Table names are plural `snake_case`; fields are lowercase `snake_case` and use full words.
- Primary keys use UUID v7. Foreign keys end with `_id` and reference the parent `id`.
- Time values use `timestamptz`; monetary values use `decimal(18,2)`.
- Every mutable aggregate stores `created_at`, `created_by`, `updated_at`, and `updated_by`.
- Legend: **ADJUSTED/NEW fields must have light-green background in Confluence** (`#E3FCEF`).

## 7. Database Tables and Fields

### 7.1 `life_plannings` - Plan aggregate

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | Existing | Life Planning identifier |
| prospect_id | uuid | No | FK | Existing | Prospect reference |
| product_code | varchar(20) | No |  | Existing | UWB/UWD or configured product |
| status | varchar(30) | No | IDX | Existing | DRAFT/CALCULATED/SUBMITTED/CANCELLED |
| current_version_number | integer | No |  | Adjusted | Optimistic aggregate version |
| quotation_id | uuid | Yes | FK | Existing | Submitted quotation reference |
| client_platform | varchar(20) | Yes |  | New | IOS/IPADOS/WEB |
| device_id | varchar(100) | Yes |  | New | Auditable registered device id |
| last_synced_at | timestamptz | Yes |  | New | Latest accepted mobile synchronization |
| row_version | bigint | No |  | New | ETag/concurrency value |
| created_at / created_by | timestamptz / varchar(50) | No |  | Existing | Create audit |
| updated_at / updated_by | timestamptz / varchar(50) | No |  | Existing | Update audit |

### 7.2 `life_planning_versions` - Immutable input version

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Version identifier |
| life_planning_id | uuid | No | FK/UK | New | Parent plan |
| version_number | integer | No | UK | New | Sequential version |
| current_step | integer | No |  | New | Last completed task 0-7 |
| calculation_status | varchar(30) | No |  | New | NOT_CALCULATED/CALCULATED/STALE |
| input_snapshot | json | No |  | New | Typed immutable request snapshot |
| configuration_version | varchar(50) | No |  | New | Rule baseline used by input |
| checksum | varchar(128) | No | UK | New | Detect duplicate/changed input |
| created_at / created_by | timestamptz / varchar(50) | No |  | New | Version audit |

### 7.3 `life_planning_premium_segments` - RP/TP schedule

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Segment id |
| life_planning_version_id | uuid | No | FK/IDX | New | Version reference |
| sequence_number | integer | No | UK | New | Display/calculation order |
| start_age | integer | No |  | New | Inclusive starting age |
| end_age | integer | No |  | New | Inclusive ending age |
| regular_premium | decimal(18,2) | No |  | New | RP per year |
| top_up_premium | decimal(18,2) | No |  | New | TP per year |
| payment_mode | varchar(20) | No |  | New | YEARLY/HALF_YEARLY/QUARTERLY/MONTHLY |

### 7.4 `life_planning_retirement_plans` - Retirement goal

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Retirement plan id |
| life_planning_version_id | uuid | No | FK/UK | New | One goal per version |
| enabled | boolean | No |  | New | Goal enabled flag |
| start_age | integer | Yes |  | New | First payment age |
| end_age | integer | Yes |  | New | Last payment age |
| frequency | varchar(20) | Yes |  | New | MONTHLY/YEARLY |
| requested_amount | decimal(18,2) | Yes |  | New | Requested amount per frequency |
| surcharge_rate | decimal(7,4) | No |  | New | Configured charge rate |

### 7.5 `life_planning_withdrawals` - Other withdrawals

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Withdrawal id |
| life_planning_version_id | uuid | No | FK/IDX | New | Version reference |
| sequence_number | integer | No | UK | New | User-defined order |
| withdrawal_type | varchar(20) | No |  | New | ONE_TIME/RECURRING |
| start_age | integer | No |  | New | First withdrawal age |
| end_age | integer | Yes |  | New | Last recurring age |
| frequency | varchar(20) | No |  | New | ONCE/MONTHLY/YEARLY |
| requested_amount | decimal(18,2) | No |  | New | Gross requested amount |
| fee_rate | decimal(7,4) | No |  | New | Withdrawal fee rate |

### 7.6 `life_planning_riders` - Selected rider contracts

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Selected rider id |
| life_planning_version_id | uuid | No | FK/IDX | New | Version reference |
| rider_code | varchar(30) | No | UK | New | Configuration rider code |
| plan_code | varchar(30) | Yes |  | New | Selected rider plan |
| coverage_end_age | integer | No |  | New | Rider coverage limit |
| benefit_amount | decimal(18,2) | No |  | New | Sum insured/benefit |
| annual_premium | decimal(18,2) | No |  | New | Rider annual premium |
| configuration_version | varchar(50) | No |  | New | Rider rule version |

### 7.7 `life_planning_calculation_results` - Calculation header

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Result id |
| life_planning_version_id | uuid | No | FK/IDX | New | Exact input version |
| calculation_version | integer | No | UK | New | Recalculation sequence |
| status | varchar(30) | No | IDX | New | PASS/NEED_ADJUSTMENT/FAILED |
| total_premium | decimal(18,2) | No |  | New | RP+TP total |
| rider_premium_total | decimal(18,2) | No |  | New | Rider premium total |
| retirement_paid | decimal(18,2) | No |  | New | Projected retirement paid |
| other_withdrawal_paid | decimal(18,2) | No |  | New | Projected other withdrawals |
| final_account_value | decimal(18,2) | No |  | New | Final AV |
| death_benefit | decimal(18,2) | No |  | New | Final death benefit |
| warning_data | json | Yes |  | New | Typed warning detail |
| calculated_at | timestamptz | No |  | New | Calculation timestamp |

### 7.8 `life_planning_projections` - Monthly projection

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Projection row id |
| calculation_result_id | uuid | No | FK/IDX | New | Calculation result |
| policy_year | integer | No | UK | New | Policy year |
| policy_month | integer | No | UK | New | Month 1-12 |
| insured_age | integer | No |  | New | Age for row |
| regular_premium | decimal(18,2) | No |  | New | RP posted |
| top_up_premium | decimal(18,2) | No |  | New | TP posted |
| rider_charge | decimal(18,2) | No |  | New | Rider charge |
| retirement_payment | decimal(18,2) | No |  | New | Retirement paid |
| withdrawal_payment | decimal(18,2) | No |  | New | Other withdrawal paid |
| account_value_before | decimal(18,2) | No |  | New | AV before events |
| account_value_after | decimal(18,2) | No |  | New | AV after events |
| death_benefit | decimal(18,2) | No |  | New | Death benefit |

### 7.9 `life_planning_documents` - Proposal documents

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Document id |
| life_planning_version_id | uuid | No | FK/IDX | New | Source version |
| calculation_result_id | uuid | No | FK | New | Source result |
| document_type | varchar(30) | No |  | New | PROPOSAL/TABLE_NG/SUMMARY |
| storage_key | varchar(512) | No | UK | New | Object storage key, not public URL |
| checksum | varchar(128) | No |  | New | Integrity checksum |
| watermark_text | varchar(200) | Yes |  | New | Applied watermark audit |
| status | varchar(20) | No |  | New | GENERATING/READY/FAILED |
| created_at / created_by | timestamptz / varchar(50) | No |  | New | Document audit |

### 7.10 `life_planning_audit_events` - Trace and activity log

| Field | Type | Null | Key | Change | Description |
| --- | --- | --- | --- | --- | --- |
| id | uuid | No | PK | New | Event id |
| life_planning_id | uuid | No | FK/IDX | New | Plan reference |
| life_planning_version_id | uuid | Yes | FK | New | Optional version reference |
| event_code | varchar(50) | No | IDX | New | CREATE/SAVE/CALCULATE/PDF/SUBMIT |
| actor_id | varchar(50) | No | IDX | New | Agent/system identity |
| device_id | varchar(100) | Yes |  | New | iPad device reference |
| correlation_id | uuid | No | IDX | New | End-to-end trace id |
| event_data | json | No |  | New | Typed metadata, no sensitive payload |
| occurred_at | timestamptz | No | IDX | New | Event timestamp |

## 8. Indexes and Constraints

- Unique: `life_planning_versions(life_planning_id, version_number)`.
- Unique: premium/withdrawal `(life_planning_version_id, sequence_number)`.
- Unique: rider `(life_planning_version_id, rider_code)`.
- Unique: projection `(calculation_result_id, policy_year, policy_month)`.
- Check constraints: non-negative money, valid age range, `policy_month between 1 and 12`.
- Index plan status/prospect, calculation status, document status and audit occurred date.
- Child records use `ON DELETE RESTRICT`; archived business records must not cascade-delete.

## 9. Security and NFR

- OAuth 2.0/OIDC access token; API authorizes agent, prospect and action scope.
- TLS 1.2+ in transit; database/object storage encryption at rest.
- No PII or tokens in application logs, AsyncStorage, event metadata or error messages.
- API idempotency key for Create, Calculate, Document and Submit.
- Calculation target: p95 below 3 seconds for 100-year monthly projection.
- Aggregate API target: p95 below 1 second excluding external services.
- Offline mode permits local draft only; Calculate/PDF/Submit require online server validation.
- Accessibility: minimum 44pt touch target, Dynamic Type-safe layout, contrast and VoiceOver labels.

## 10. Test Scope

1. Unit tests for every business rule and calculation edge case.
2. Golden-file regression against Self Design Tool examples.
3. API contract tests for success, validation, conflict, idempotency and external timeout.
4. Database migration, constraints, indexes and rollback verification.
5. React Native task navigation, input keyboard, draft restore and rotation tests.
6. iPad 11-inch landscape visual test at 1194x834 and supported iPad scale variants.
7. Security tests: authorization bypass, injection, sensitive logging and token storage.
8. PDF/version/checksum and quotation integration tests.
9. End-to-end trace from mobile correlation id through database and external services.

## 11. Open Decisions

- Confirm which current production tables are enhanced versus replaced; field highlighting is provisional until the current Data Dictionary owner confirms mapping.
- Confirm calculation rates/fees are sourced from product configuration rather than hard-coded prototype values.
- Confirm offline retention and MDM/device registration policy.
- Confirm target Confluence parent page, document owner, JIRA story and release/sprint labels.
