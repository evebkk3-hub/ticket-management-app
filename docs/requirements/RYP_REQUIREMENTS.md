# RYP Requirement Register

Last reviewed: 2026-07-31  
Status: Requirement capture only; implementation is not authorized by this record.

## Source RYP-FLOW-001

Source: workflow screenshot supplied by the user on 2026-07-31.

Confidence note: the screenshot is a partial view of a larger workflow. This section records only
the visible fragment and must not be treated as the complete RYP end-to-end process.

### Visible flow

1. The payment flow supports an activity labelled `แนบหลักฐานชำระเงิน`.
2. The system supports an activity labelled `ตรวจสอบผลการชำระ`.
3. The decision `ชำระสำเร็จ` has two visible outcomes:
   - `Y` routes to connector `B`;
   - `N` routes to connector `C`.
4. A downstream/external activity is labelled `Confirm ผลการชำระกับ Bank`.
5. The wider visible context also references `Generate E-TH`, delivery to the customer by email,
   `TASA Submission`, `End`, and `NASA_SELLING_026`. Their exact ordering and relationship to
   connectors B/C are not fully visible in the supplied fragment.

### Derived functional requirements

| ID | Requirement | Acceptance direction |
|---|---|---|
| RYP-PAY-001 | The user/system shall be able to attach payment evidence for a payment attempt when the applicable channel requires it. | Evidence is associated with one payment transaction and cannot silently replace evidence for another attempt. |
| RYP-PAY-002 | The system shall check the payment result before treating payment as successful. | A displayed success state requires a confirmed payment result, not only an uploaded slip or client response. |
| RYP-PAY-003 | The payment decision shall distinguish successful and unsuccessful/pending outcomes. | Success follows connector B; non-success follows connector C after the connector definitions are confirmed. |
| RYP-PAY-004 | The system shall support confirmation of the payment result with the bank. | Persist bank/channel reference, request/callback correlation, response code, response timestamp, and raw-result reference where permitted. |
| RYP-PAY-005 | Failure to confirm payment shall not be converted to success automatically. | The transaction remains in an explicit pending/failed/manual-review state and supports safe retry or reconciliation. |
| RYP-PAY-006 | Payment evidence and bank confirmation shall be auditable. | Record actor/source, timestamps, transaction ID, evidence object key/hash, status transition, and reason code. |

### SA/Dev constraints

- Uploaded evidence is supporting evidence, not the authoritative settlement result.
- Bank confirmation and callback processing must be idempotent and correlated to a single
  payment attempt.
- Payment states should distinguish at least `INITIATED`, `EVIDENCE_ATTACHED`,
  `BANK_CONFIRMATION_PENDING`, `SUCCESS`, `FAILED`, and `MANUAL_REVIEW`.
- A late bank callback must pass guarded state-transition rules and must not create duplicate
  receipts, Core updates, reconciliation entries, or GL transactions.
- Store files in controlled object storage using an object key and integrity hash. Do not store
  unrestricted base64 files in payment tables.
- Mask sensitive bank/card/customer data in UI, logs, test fixtures, and operational reports.

### Open questions

1. What exact processes do connectors `B` and `C` continue to?
2. Which payment channels require `แนบหลักฐานชำระเงิน`?
3. Is bank confirmation synchronous inquiry, asynchronous callback, batch reconciliation, or a
   combination of these?
4. Which bank response codes map to success, pending, failure, timeout, duplicate, and reversal?
5. Is `Generate E-TH` triggered only after bank-confirmed success?
6. What does `E-TH` represent, and which service owns its generation and email delivery?
7. What is the precise relationship among RYP, `TASA Submission`, and `NASA_SELLING_026`?
8. What are the retry limit, timeout, SLA, manual-review owner, and reconciliation cut-off?

## Source RYP-FLOW-002

Source: requirement screenshot supplied by the user on 2026-07-31.

Confidence note: the visible section covers clauses 4.14, 4.14.1, and 4.14.2. The UI and
Integration API reference table is cut off, so only its clearly visible labels are recorded.

### Confirmed requirements from the screenshot

1. For Product LV Top-up, the applicable conditions are those defined for the product.
2. Additional premium can be paid by Direct Debit in all applicable cases.
3. When the customer chooses Direct Debit for additional premium, the customer must perform the
   Direct Debit steps again.
4. Clause 4.14 (`SP21`): after Direct Debit payment completes, Common shall display the
   `สมัครหักบัญชีเงินฝากอัตโนมัติ` action for insurance plans that support Recurring.
5. Clause 4.14.1: when automatic-debit account registration succeeds, TL Smart shall send a
   notification.
6. The notification template code is `NASA_SELLING_026`.
7. The screenshot references `[NASA] Application_Notification_Template.xlsx` as the notification
   template source.
8. Clause 4.14.2 states that CTF cannot use Recurring.
9. The visible UI references are `Figma` and `Figma Direct Debit`.
10. The visible portion of the Integration API table references `BCP-DGT-35` for QR payment
    (Bay). The remaining rows and exact relationship to Direct Debit are not visible and remain
    unconfirmed.

### Derived functional requirements

| ID | Requirement | Acceptance direction |
|---|---|---|
| RYP-DD-001 | The system shall evaluate whether the selected product/plan supports Recurring before displaying the automatic-debit registration action. | The action is displayed only after completed Direct Debit payment and only when the plan is Recurring-capable. |
| RYP-DD-002 | Direct Debit payment and Recurring registration shall be separate workflow operations. | Completing one Direct Debit payment does not imply that Recurring registration has completed. |
| RYP-DD-003 | A customer paying additional premium through Direct Debit shall repeat the required Direct Debit flow. | A prior authorization/payment attempt must not be silently reused unless an approved mandate rule explicitly permits it. |
| RYP-DD-004 | Product LV Top-up shall apply the approved Product LV Top-up rules before accepting additional premium. | Eligibility is determined from effective-dated product configuration and returns a reason when rejected. |
| RYP-DD-005 | CTF shall be ineligible for Recurring. | The registration action is hidden or disabled for CTF, and the backend rejects attempts even if called directly. |
| RYP-DD-006 | After successful automatic-debit account registration, TL Smart shall send notification template `NASA_SELLING_026`. | Exactly one logical notification is produced for one successful registration, with retry-safe delivery and audit status. |
| RYP-DD-007 | A failed or pending registration shall not send the success notification. | Notification is triggered from the confirmed registration-success event, not from button click or request submission. |

### Required state separation

- `DIRECT_DEBIT_PAYMENT_STATUS`: status of the current premium payment.
- `RECURRING_ELIGIBILITY`: whether product, policy, channel, and customer conditions allow
  automatic debit.
- `RECURRING_REGISTRATION_STATUS`: status of the bank/account mandate registration.
- `NOTIFICATION_STATUS`: delivery status for `NASA_SELLING_026`.

These states must not be collapsed into one generic payment status.

### Additional open questions

1. Which plan/product configuration field is authoritative for Recurring capability?
2. Does “Direct Debit ได้ทุกกรณี” have exclusions by bank, policy status, customer type, amount,
   due date, or mandate status?
3. What exactly does “ดำเนินการตามขั้นตอนใหม่อีกครั้ง” reset or recreate: payment transaction,
   mandate, OTP, consent, or every step?
4. Does CTF mean one product family, channel, or Core platform, and what is its canonical code?
5. What bank callback/status confirms successful Recurring registration?
6. Which service owns and sends `NASA_SELLING_026`, and what are its variables, language,
   deduplication key, and retry policy?
7. Please provide the complete Integration API table and the referenced Figma pages before
   API/UI implementation.

## Change Log

| Date | Source | Change |
|---|---|---|
| 2026-07-31 | RYP-FLOW-001 | Captured payment evidence, result checking, bank confirmation, and success/non-success branching from the supplied workflow fragment. |
| 2026-07-31 | RYP-FLOW-002 | Captured Product LV Top-up Direct Debit, Recurring eligibility/action, CTF exclusion, and notification `NASA_SELLING_026`. |
