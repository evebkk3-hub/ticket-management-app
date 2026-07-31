# Payment V11 and E-App PA Requirement Gap

Reviewed: 2026-07-31

## Sources

- `C:\Users\lenovo\Downloads\[NASA] BRD - Payment _V11.0.docx`
- `C:\Users\lenovo\Downloads\[BR-TL Pro Plus] E-App PA.docx`

## Menu decision

### Payment V11

Add a top-level `ชำระเงิน` operational menu because Payment V11 spans more than the final
application step:

- select QR Code, Credit Card, Cheque, or Direct Debit;
- check payment status;
- attach payment evidence;
- track application/payment states;
- issue and distribute E-TR;
- support Direct Debit recurring registration.

Rules included in the MVP:

- Credit Card is unavailable for Top-up (SP12).
- Direct Debit is unavailable for foreign customers.
- Payment result and evidence verification use separate states.
- A confirmed successful first-premium payment makes E-TR available.

### E-App PA

Do not add a duplicate top-level PA menu. The BRD states that an eligible PA quotation exposes
`สร้างใบคำขอ`, which opens the PA application, and the case is then tracked in the existing
`ใบคำขอ` menu.

The BRD defines seven eligible PA products and six PA application tabs:

1. ข้อมูลทั่วไป
2. แบบประกัน
3. ผู้รับประโยชน์
4. ประวัติการรับประกัน
5. ประวัติการแพทย์
6. ลงชื่อผู้เอาประกัน

Current MVP coverage adds a PA quotation and PA case entry point. Full six-tab PA-specific field
behavior, PDF generation, attachments, E-App/Digital Face-to-Face submission, and real payment
integration remain implementation gaps.

## Production gaps

- Bank/payment APIs, signed callbacks, idempotency, timeout, and reconciliation.
- File upload and finance review for payment evidence.
- E-TR PDF generation, watermark/password rules, and recipient-specific email packages.
- Complete PA product eligibility by occupation class.
- Complete PA six-tab validation and PA PDF mapping.
- E-App PA identity-document rules, attachments, signatures, and submission.
