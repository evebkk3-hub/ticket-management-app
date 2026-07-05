# Technical Specification v0.1

Project: R3 e-RYP APL Payment for Legacy Policy  
Source BRD: e-RYP x APL Payment (Legacy) BRD_V.0.1.docx  
Prepared for: TL Smart, TLI App, Core System, Collection, Finance, Printing  
Status: Draft for solution design  

## 1. Document Purpose

This technical specification converts the BRD requirements into a solution design draft for the R3 e-RYP APL Payment initiative. The purpose is to define screens, APIs, data entities, business rules, integrations, batch jobs, and open gaps needed to implement a prototype and continue detailed design.

## 2. BRD Coverage Assessment

The BRD is sufficient for a technical specification draft. It contains objectives, background, functional scope, policy eligibility rules, display fields, payment channels, receipt and printing requirements, transaction update scope, reconcile, GL, and report requirements.

The BRD is not yet complete enough for production build without confirmation on API contracts, table mapping, exact calculation formulas, payment gateway callback codes, GL account mapping, security roles, and non-functional requirements.

## 3. Objectives

1. Enable TL Smart and TLI App to receive RYP premium payment during APL period.
2. Support APL cases over 90 days with interest.
3. Support payment by QR Code and Credit Card in Phase 1.
4. Prepare Core System changes for Legacy policy transactions.
5. Support receipt printing, reconcile, GL transaction, SMS notification, and renewal report.

## 4. Scope

In scope:

- Policy eligibility and preparation for APL/RYP payment.
- Realtime premium and interest quotation.
- TL Smart and TLI App display for payable policy and payment detail.
- QR Code and Credit Card payment flow.
- Payment result callback and payment status update.
- Premium receipt and interest receipt handling.
- Outsource printing support and print sorting.
- Legacy transaction update.
- Benefit calculation for APL payment.
- Auto reconcile for Collection team.
- GL transaction generation.
- Renewal payment report.

Out of scope for this draft unless confirmed:

- Full production integration credentials.
- Final payment gateway security scheme.
- Final GL account code mapping.
- Final receipt layout image/PDF template.
- Final batch operation calendar and cut-off time.

## 5. Systems and Actors

Systems:

- TL Smart: Sales application channel.
- TLI App: Customer application channel.
- Core Legacy: Master and transaction update for Legacy policies.
- InsureMo: Future/related policy and loan transaction update.
- Payment Gateway: QR and Credit Card collection.
- Receipt/Printing System: Premium receipt and general receipt printing.
- Reconcile System: Collection payment matching.
- GL System: Accounting transaction posting.
- SMS Gateway: SMS after successful payment.

Actors:

- Sales user: Views policy, quotes amount, initiates payment.
- Customer: Pays through QR or Credit Card.
- Collection team: Reviews reconcile status and unmatched cases.
- Finance team: Reviews GL and reconcile impact.
- Printing team: Confirms receipt print batches.
- Admin/IT support: Maintains channel setup, batch status, and issue tracking.

## 6. High Level Architecture

The recommended architecture is an application API layer between TL Smart/TLI App and Core services.

Flow:

1. Batch job prepares eligible policy data from Legacy D-1.
2. TL Smart/TLI App calls API to list payable policies.
3. User opens policy detail and requests realtime quote.
4. API calculates premium, rider, interest, and total amount.
5. User selects QR or Credit Card.
6. API creates payment transaction and returns payment reference.
7. Payment Gateway sends payment result callback.
8. API freezes paid amount and interest as of payment date.
9. API updates reconcile status, receipt status, Legacy transaction, GL, SMS, and report data.

## 7. Functional Design

### 7.1 Policy Eligibility

Eligibility must validate:

- Product type is supported.
- Policy status 1 is one of A, B, C, F, H, I, J, K, L, N, O, R, Y.
- Policy status 2 is blank, A, F, J, or R.
- If status is N/2, system checks old status. If old status matches eligible status, prepare policy using old status.
- Policy is not exclusive data such as customer flag not to disclose or not to allow sales service.
- Policy has unpaid or unsuccessful recurring payment installment.
- Credit Card is allowed only for product types that support card payment.

Output:

- eligible flag.
- reject reason.
- product type.
- status 1/status 2/old status.
- APL days.
- has interest flag.

### 7.2 Prepare Policy Data

The preparation batch should run with D-1 data and prepare all policies that match eligibility rules.

Preparation rules:

- Pull policy master changes to keep customer, policy, premium, and agent structure current.
- Support transferred cases by Sale ID.
- Support promoted sales by Sale ID.
- Update only unpaid or unsuccessful installments.
- For trainee agent cases, show the policy under the parent unit and add TL Smart remark.
- Exclude exclusive data.

Prepared data groups:

- Agent data.
- Insured data.
- Policy data.
- Premium/installment data.
- APL/interest data.
- Payment channel eligibility.

### 7.3 Premium and Interest Calculation

Realtime quote must calculate:

- life premium.
- rider premium.
- premium by installment.
- interest amount.
- total premium.
- total amount due.

Important rule:

- For policy status J over 90 days, all overdue installments must be paid together. User cannot select only some installments.
- After successful payment, premium and interest must be frozen as of payment date so reconcile amount remains consistent.
- Interest does not need to be separated by installment and can be stored as total interest amount.

Open calculation gaps:

- Interest rate source.
- Day count convention.
- Rounding rule.
- Tax/fee handling.
- Recalculation cut-off time.

### 7.4 Payment

Phase 1 channels:

- QR Code.
- Credit Card.

Phase 2 channels:

- Direct Debit One Time (RYP).
- Cheque.

Payment creation:

- Validate policy eligibility.
- Validate selected channel.
- Validate Credit Card product rule.
- Generate collection ID, transaction ID, temp receipt/payment reference, and payment reference fields.
- Persist payment as WAIT_PAYMENT or WAIT_CALLBACK.
- Return payment information to TL Smart/TLI App.

Payment result:

- Receive callback from payment gateway.
- Validate transaction reference and amount.
- If success and amount matches, mark payment SUCCESS and reconcile MATCHED.
- If success but amount mismatch, mark payment SUCCESS with reconcile UNMATCHED and hold downstream posting.
- If failed, mark payment FAILED.

### 7.5 Receipt and Printing

Receipt types:

- Premium receipt.
- Interest receipt/general receipt.

Business rules:

- Premium receipt number is controlled by premium receipt owner.
- Interest/general receipt number is controlled by general receipt owner.
- Receipt printing must support paper format.
- Premium receipt printing must sort by interest and non-interest groups.
- Interest receipt printing must be available to document warehouse/printing process.
- Centralized printing must receive cover sheet.
- Before print confirmation, system checks amount consistency.
- If premium amount matches, data can be sent to print.
- If amount does not match, data remains in reconcile.

Open receipt gaps:

- Final As-Is and To-Be receipt field mapping.
- Final receipt layout.
- Final remark field values.
- Running number service or manual assignment rule.
- Printing file format.

### 7.6 Legacy Transaction Update

Legacy update must cover:

- Policy master update for renewal payment.
- Transaction update for continuing contract.
- Payment transaction reference update.
- Status transition after successful payment.
- Clearing policy from payable menu after payment success.
- Moving policy to payment history menu.

Open gaps:

- Final Legacy table names.
- Field mapping and stored procedure names.
- Retry and rollback rules.
- Idempotency key for update transaction.

### 7.7 InsureMo Transaction Update

InsureMo is referenced by the BRD as a system to support update transaction loan. This draft keeps InsureMo as a related integration point.

Required confirmation:

- Whether R3 phase is Legacy only or also includes InsureMo runtime.
- InsureMo endpoint contract.
- Loan transaction fields.
- Update trigger timing.

### 7.8 Benefit Calculation

Benefit calculation for APL payment must:

- Split life premium and rider premium.
- Split premium by installment.
- Store interest as total amount without installment split.
- Provide input for compensation/benefit calculation.

Open gaps:

- Benefit calculation formula.
- Unit/agent owner for trainee cases.
- Effective date and posting date rule.

### 7.9 Reconcile

Auto reconcile must support Collection team.

Reconcile rules:

- Do not require premium and interest split for reconcile.
- Do not require installment split for reconcile.
- Match by payment reference, policy number, transaction ID, and amount.
- If amount matches, status = MATCHED.
- If amount mismatches, status = UNMATCHED and downstream posting is held.
- Failed payment does not proceed to receipt, GL, SMS, or transaction update.

Open gaps:

- Exact matching keys.
- Tolerance amount.
- Manual correction workflow.
- Reconcile report format.

### 7.10 GL Transaction

GL transaction must:

- Split life premium and rider premium.
- Split by installment.
- Store interest as total interest amount.
- Generate GL-ready status only after successful matched payment.
- Hold GL if reconcile is unmatched.

Open gaps:

- GL account codes.
- Debit/credit entries.
- Posting date.
- Reversal rule.
- Interface file/API format.

### 7.11 Notification

SMS must be sent after successful renewal premium payment for QR and Credit Card.

Open gaps:

- Final SMS content.
- Language template.
- Sender name.
- Retry rule.
- Customer mobile source field.

### 7.12 Report

Minimum report:

- Renewal payment report.

Recommended filters:

- Payment date.
- Policy number.
- Core system.
- App source.
- Payment channel.
- Payment status.
- Reconcile status.
- GL status.
- Receipt print status.
- Agent/Sale ID.

Recommended columns:

- policy number.
- customer name.
- agent/sale ID.
- app source.
- core system.
- APL days.
- pay period.
- base premium.
- rider premium.
- interest amount.
- total amount.
- collection method.
- collection ID.
- transaction ID.
- payment status.
- reconcile status.
- receipt numbers.
- GL status.
- SMS status.
- created date.
- processed date.

## 8. Screen Design

### 8.1 Login

Purpose: authenticate user before accessing R3 prototype.

Fields:

- username.
- password.

Actions:

- Login.
- Logout.

### 8.2 R3 Dashboard

Purpose: show end-to-end R3 design status.

Widgets:

- Policy eligibility count.
- Prepared policy count.
- Waiting payment count.
- Matched payment count.
- Unmatched reconcile count.
- GL hold count.
- Receipt pending print count.

### 8.3 Policy List

Purpose: show payable APL/RYP policies.

Columns:

- policy number.
- customer name.
- app source.
- core system.
- product type.
- status 1/status 2/old status.
- APL days.
- has interest.
- total amount.
- eligible status.
- available payment channels.

Actions:

- View detail.
- Quote.
- Pay by QR.
- Pay by Credit Card.

### 8.4 Policy Detail and Quote

Sections:

- Agent information.
- Insured information.
- Policy information.
- Premium/installment detail.
- Interest detail.
- Payment channel eligibility.
- Exclusive data warning.

Actions:

- Recalculate quote.
- Create payment.

### 8.5 Payment Result Monitor

Purpose: review callback and transaction status.

Columns:

- payment ID.
- policy number.
- collection ID.
- transaction ID.
- payment method.
- payment status.
- paid amount.
- response code.
- reconcile status.
- transaction update status.
- GL status.
- SMS status.

Actions:

- Mark callback success for prototype.
- Mark callback failed for prototype.
- Simulate mismatch for prototype.

### 8.6 Receipt and Printing

Purpose: manage premium and interest receipt printing.

Columns:

- receipt type.
- receipt number.
- policy number.
- payment ID.
- interest/non-interest sorting group.
- print owner.
- print batch.
- print status.
- reconcile status.

Actions:

- Create print batch.
- Confirm print.
- Hold for reconcile.

### 8.7 Reconcile

Purpose: allow Collection team to review matched/unmatched payments.

Columns:

- payment ID.
- policy number.
- expected amount.
- paid amount.
- difference.
- match key.
- reconcile status.
- assigned owner.
- note.

Actions:

- Approve match.
- Send to correction.
- Hold posting.

### 8.8 GL Transaction

Purpose: review accounting entries before posting.

Columns:

- GL transaction ID.
- payment ID.
- policy number.
- premium type.
- installment.
- debit account.
- credit account.
- amount.
- posting status.

Actions:

- Generate GL.
- Hold GL.
- Export GL.

### 8.9 Report

Purpose: renewal payment report.

Filters and columns follow section 7.12.

## 9. API Specification

All new APIs should use version prefix `/api/v1`. Existing unversioned prototype routes may remain as backward-compatible aliases only.

### 9.1 Authentication

POST /api/v1/auth/login

Request:

```json
{
  "username": "Supachai.h",
  "password": "12345678"
}
```

Response:

```json
{
  "sessionId": "string",
  "displayName": "string",
  "roles": ["R3_ADMIN"]
}
```

### 9.2 Get Payable Policies

GET /api/v1/apl/policies

Query parameters:

- appSource.
- coreSystem.
- agentId.
- paymentStatus.
- page.
- pageSize.

Response:

```json
{
  "items": [
    {
      "policyNo": "APL100001",
      "customerName": "string",
      "appSource": "TL_SMART",
      "coreSystem": "LEGACY",
      "productType": "GIO",
      "status1": "J",
      "status2": "",
      "oldStatus": "",
      "aplDays": 120,
      "hasInterest": true,
      "eligible": true,
      "totalAmount": 3450.00
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1
}
```

### 9.3 Check Eligibility

GET /api/v1/apl/eligibility?policyNo={policyNo}

Response:

```json
{
  "policyNo": "APL100001",
  "eligible": true,
  "validProduct": true,
  "validPolicyStatus": true,
  "validAplStatus": true,
  "exclusiveData": false,
  "creditCardAllowed": true,
  "message": "Policy is eligible for APL/RYP payment."
}
```

### 9.4 Prepare Policy Data

GET /api/v1/apl/prepare?policyNo={policyNo}

Response:

```json
{
  "policyNo": "APL100001",
  "customerName": "string",
  "appSource": "TL_SMART",
  "coreSystem": "LEGACY",
  "agentId": "1234567890",
  "saleId": "1234567890",
  "agentName": "string",
  "branchCode": "007",
  "exclusiveCode": "APL_OVER_90_INTEREST",
  "traineeAgent": false,
  "eligible": true
}
```

### 9.5 Quote Premium and Interest

GET /api/v1/apl/quote?policyNo={policyNo}

Response:

```json
{
  "policyNo": "APL100001",
  "basePremium": 2500.00,
  "riderPremium": 500.00,
  "interestAmount": 450.00,
  "totalPremium": 3000.00,
  "totalAmount": 3450.00,
  "hasInterest": true,
  "allowCreditCard": true,
  "freezeRequiredAfterPayment": true
}
```

### 9.6 Get Payment Channels

GET /api/v1/apl/payment-channels

Response:

```json
[
  {
    "channelCode": "QR",
    "channelName": "QR Code",
    "phase": "PHASE_1",
    "isEnabled": true,
    "allowApl": true,
    "allowInterest": true,
    "creditCardRequired": false
  }
]
```

### 9.7 Create Payment

POST /api/v1/apl/payments

Request:

```json
{
  "policyNo": "APL100001",
  "collectionMethod": "QR"
}
```

Response:

```json
{
  "paymentId": "APL1783238867610",
  "policyNo": "APL100001",
  "collectionId": "COL1783238867610",
  "trxId": "TRX1783238867610",
  "tempRpNo": "TMP1783238867610",
  "referenceOne": "TMP1783238867610",
  "referenceTwo": "APL100001",
  "referenceThree": "LH001",
  "collectionMethod": "QR",
  "paymentStatus": "WAIT_CALLBACK",
  "totalAmount": 3450.00
}
```

### 9.8 Payment Status Callback

POST /api/v1/apl/applications/payment-status

Request:

```json
{
  "paymentId": "APL1783238867610",
  "paymentResult": "SUCCESS",
  "responseCode": "0",
  "paidAmount": 3450.00,
  "paidAt": "2026-07-05T17:30:00+07:00"
}
```

Response:

```json
{
  "paymentId": "APL1783238867610",
  "paymentStatus": "SUCCESS",
  "reconcileStatus": "MATCHED",
  "transactionStatus": "LEGACY_UPDATED",
  "glStatus": "GL_READY",
  "smsStatus": "SMS_QUEUED"
}
```

### 9.9 Receipt APIs

GET /api/v1/apl/receipts

POST /api/v1/apl/receipts/print-batches

POST /api/v1/apl/receipts/{receiptNo}/confirm-print

Required response fields:

- receiptNo.
- receiptType.
- paymentId.
- policyNo.
- printGroup.
- printOwner.
- batchNo.
- printStatus.
- reconcileStatus.

### 9.10 Reconcile APIs

GET /api/v1/apl/reconcile/items

POST /api/v1/apl/reconcile/{paymentId}/approve

POST /api/v1/apl/reconcile/{paymentId}/hold

Required response fields:

- paymentId.
- expectedAmount.
- paidAmount.
- diffAmount.
- reconcileStatus.
- reasonCode.
- assignedOwner.

### 9.11 GL APIs

GET /api/v1/apl/gl/transactions

POST /api/v1/apl/gl/generate

POST /api/v1/apl/gl/export

Required response fields:

- glTransactionId.
- paymentId.
- policyNo.
- premiumType.
- installmentNo.
- debitAccount.
- creditAccount.
- amount.
- postingStatus.

### 9.12 Report APIs

GET /api/v1/apl/reports/renewals

Query parameters:

- dateFrom.
- dateTo.
- policyNo.
- agentId.
- collectionMethod.
- paymentStatus.
- reconcileStatus.
- glStatus.

## 10. Data Model Draft

### 10.1 apl_policies

Purpose: prepared policy data for app display and payment eligibility.

Key fields:

- policy_no.
- customer_name.
- app_source.
- core_system.
- product_type.
- status1.
- status2.
- old_status.
- apl_days.
- base_premium.
- rider_premium.
- interest_amount.
- allow_credit_card.
- exclusive_flag.
- agent_id.
- sale_id.
- branch_code.
- trainee_agent_flag.
- prepared_date.
- status.

### 10.2 apl_policy_installments

Purpose: premium split by installment.

Key fields:

- policy_no.
- installment_no.
- due_date.
- life_premium.
- rider_premium.
- status.

### 10.3 payment_channels

Purpose: setup collection method and phase.

Key fields:

- channel_code.
- channel_name.
- phase.
- is_enabled.
- allow_apl.
- allow_interest.
- credit_card_required.
- remark.

### 10.4 apl_payments

Purpose: payment transaction and downstream state.

Key fields:

- payment_id.
- policy_no.
- collection_id.
- trx_id.
- temp_rp_no.
- pay_period.
- reference_one.
- reference_two.
- reference_three.
- collection_method.
- payment_type_desc.
- module_type.
- base_premium.
- rider_premium.
- interest_amount.
- total_amount.
- paid_amount.
- payment_status.
- response_code.
- reconcile_status.
- transaction_status.
- gl_status.
- sms_status.
- created_at.
- processed_at.

### 10.5 apl_receipts

Purpose: premium and interest/general receipt tracking.

Key fields:

- receipt_no.
- payment_id.
- policy_no.
- receipt_type.
- print_group.
- print_owner.
- print_batch_no.
- print_status.
- created_at.
- printed_at.

### 10.6 apl_reconcile_items

Purpose: collection reconcile worklist.

Key fields:

- reconcile_id.
- payment_id.
- expected_amount.
- paid_amount.
- diff_amount.
- match_key.
- reconcile_status.
- reason_code.
- owner.
- note.

### 10.7 apl_gl_transactions

Purpose: GL-ready accounting entries.

Key fields:

- gl_transaction_id.
- payment_id.
- policy_no.
- premium_type.
- installment_no.
- debit_account.
- credit_account.
- amount.
- posting_status.
- created_at.
- posted_at.

### 10.8 apl_audit_logs

Purpose: audit status changes and user actions.

Key fields:

- audit_id.
- entity_type.
- entity_id.
- action.
- old_value.
- new_value.
- actor.
- created_at.

### 10.9 Config Tables

Rules should be configuration-driven where possible.

Config APIs:

- GET /api/v1/config/payment-method-product-rules
- GET /api/v1/config/due-date-status-rules
- GET /api/v1/config/premium-component-rules

Config tables:

- payment_method_product_rules: supports QR Code (BAY), CreditCard (KBANK), DirectDebit, product type support, multi-period support, and PF-005 dependency.
- due_date_status_rules: stores status codes A, B, C, D, E, F, G1-G7, and H with business expressions.
- product_premium_component_rules: stores premium component mapping by product type.

## 11. Batch Jobs

### 11.1 Prepare APL Policy Batch

Schedule: daily D-1, final time to confirm.

Steps:

1. Load policy master and transaction data.
2. Apply product and status eligibility.
3. Apply N/2 old status rule.
4. Apply exclusive data exclusion.
5. Apply agent transfer and promotion update.
6. Prepare unpaid/unsuccessful installments.
7. Store prepared policies for TL Smart and TLI App.

### 11.2 Payment Reconcile Batch

Schedule: near realtime or periodic, final time to confirm.

Steps:

1. Load gateway settlement/payment result.
2. Match by reference and amount.
3. Set MATCHED or UNMATCHED.
4. Release downstream jobs for matched items.

### 11.3 Receipt Print Batch

Steps:

1. Select matched payments.
2. Separate interest and non-interest group.
3. Generate premium receipt print data.
4. Generate interest/general receipt print data.
5. Generate cover sheet.
6. Send to centralized/outsource printing.

### 11.4 GL Generate Batch

Steps:

1. Select matched successful payments.
2. Split life/rider by installment.
3. Put interest as total amount.
4. Generate GL entries.
5. Hold entries if reconcile is not matched.

## 12. Error Handling

Recommended error codes:

- POLICY_NOT_FOUND.
- POLICY_NOT_ELIGIBLE.
- PRODUCT_NOT_ALLOWED.
- STATUS_NOT_ALLOWED.
- EXCLUSIVE_DATA_BLOCKED.
- CREDIT_CARD_NOT_ALLOWED.
- PAYMENT_CHANNEL_DISABLED.
- PAYMENT_AMOUNT_MISMATCH.
- PAYMENT_CALLBACK_DUPLICATE.
- LEGACY_UPDATE_FAILED.
- RECEIPT_PRINT_HOLD.
- GL_HOLD_UNMATCHED.

API error response:

```json
{
  "errorCode": "POLICY_NOT_ELIGIBLE",
  "message": "Policy is not eligible for APL/RYP payment.",
  "details": []
}
```

## 13. Security and Audit

Authentication:

- Login required for web screens and APIs.

Authorization roles:

- R3_ADMIN.
- SALES_VIEWER.
- COLLECTION_USER.
- FINANCE_USER.
- PRINTING_USER.
- IT_SUPPORT.

Audit events:

- login/logout.
- policy quote.
- payment creation.
- payment callback.
- reconcile decision.
- receipt print confirmation.
- GL generation/export.
- Legacy update result.

## 14. Non Functional Requirements

Performance:

- Policy list should support pagination.
- Quote API should return in near realtime.
- Payment callback must be idempotent.

Availability:

- Payment callback endpoint should be highly available.
- Batch failures should be retryable.

Data integrity:

- Payment status update must be idempotent.
- Downstream posting must be blocked when reconcile is unmatched.
- Frozen paid amount and interest must not be recalculated after payment success.

Observability:

- Store correlation ID across payment, receipt, reconcile, GL, and SMS.
- Provide batch log and error log.

## 15. Prototype Implementation Mapping

Current prototype can map these modules:

- Login screen.
- R3 APL Payment Console.
- Policy eligibility and prepared policy API.
- Realtime quote API.
- Payment channel setup API.
- Payment creation API.
- Payment callback API.
- Receipt/reconcile/transaction/GL/SMS status view.
- R3 roadmap page with Epic, Feature, User Story, and Impact Analysis.

Recommended next prototype additions:

- Separate Reconcile screen.
- Separate Receipt/Printing screen.
- Separate GL Transaction screen.
- Renewal report export.
- Admin setup for payment channels and business rules.

## 16. Assumptions

1. R3 Phase 1 runtime supports QR and Credit Card only.
2. Direct Debit One Time and Cheque are maintained as Phase 2 design placeholders.
3. Interest can be stored as total amount and does not need installment split.
4. Reconcile matching does not require premium/interest split or installment split.
5. GL requires life/rider split by installment and interest total.
6. Legacy is the primary target for this BRD version.

## 17. Gap Log

| No. | Area | Gap | Owner to Confirm |
|---|---|---|---|
| 1 | Calculation | Exact interest formula, rate, day count, and rounding | Business/Core |
| 2 | API | Final TL Smart/TLI App request and response contract | App/API Team |
| 3 | Payment | Gateway callback status code and security validation | Payment Team |
| 4 | Database | Final Legacy source/target table mapping | Core Legacy Team |
| 5 | Receipt | Final As-Is/To-Be field mapping and receipt layout | Finance/Printing |
| 6 | Printing | File/API format for outsource printing | Printing Team |
| 7 | Reconcile | Match keys, tolerance, and manual workflow | Collection Team |
| 8 | GL | Account code and debit/credit rule | Finance/Accounting |
| 9 | SMS | Final SMS content for QR and Credit Card | Business/SMS Team |
| 10 | Security | Final role matrix and audit retention | IT Security |
| 11 | NFR | Volume, SLA, timeout, retry, and retention | Architecture/Infra |

## 18. Recommended Design Deliverables

1. API Specification.
2. Database ERD and data dictionary.
3. Screen wireframe and role matrix.
4. Sequence diagram for QR payment.
5. Sequence diagram for Credit Card payment.
6. Batch flow for policy preparation.
7. Receipt and printing flow.
8. Reconcile and GL flow.
9. Test scenario and UAT checklist.
