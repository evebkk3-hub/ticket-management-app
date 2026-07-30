# RYP Database Draft

Status: **Pre-Design only. Do not execute in production.**

This PostgreSQL-oriented draft is owned by `ms-after` and covers:

- `ryp_payment_history`: policy/customer/payment-history snapshot.
- `ryp_payment_transaction`: QR, credit-card, or direct-debit payment attempts.
- `ryp_payment_detail`: premium components for one transaction.

## Setup order

1. Approve schema ownership (`asa_after`).
2. Confirm the payment status matrix and shared `list_of_value` schema.
3. Run `001_ryp_schema.sql` only in a disposable development database.
4. Add approved LOV records using `002_ryp_reference_data.sql`.
5. Test migrations, constraints, concurrency, idempotency, and rollback.

## Proposed adjustments requiring approval

- `transaction_status` supports a status per transaction as required by the detail API.
- `idempotency_key`, active-attempt uniqueness, and `record_version` prevent duplicate payment.
- `grace_end_date` supports deterministic widget classification.
- QR and slip files use object-storage keys instead of database base64 payloads.
- Only masked card data and token references may be stored; raw PAN/CVV/secrets are prohibited.

## Sources

- [TNS Database Specifications](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNS/pages/935268184)
- [RYP Payment History table](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNASR/pages/948469764)
- [RYP Payment Transaction table](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNASR/pages/954368105)
- [RYP Payment History Detail API](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNASR/pages/948600842)
- [RYP Widget API](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNASR/pages/958529545)
- [Payment History List](https://tlidigitalgroup.atlassian.net/wiki/spaces/TNASR/pages/954139153)
- [NASA-12466 database task](https://tlidigitalgroup.atlassian.net/browse/NASA-12466)
