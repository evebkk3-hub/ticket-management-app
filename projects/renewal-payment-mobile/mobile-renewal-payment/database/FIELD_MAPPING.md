# Payment history field mapping

| UI field | Database source | Rule |
|---|---|---|
| ผู้ขอเอาประกันภัย | `ryp_payment_history.customer_full_name` | Display as-is |
| เบอร์โทรศัพท์ | `ryp_payment_history.customer_mobile_no` | Empty value displays `-` |
| เลขที่ กธ. | `ryp_payment_history.policy_no` | Searchable exact/contains value |
| เบี้ยประกันภัย | `ryp_payment_history.total_premium` | Format with thousands separators, 0 decimals |
| วันที่ชำระ | `ryp_payment_history.pay_date` | Store ISO-8601; display Thai abbreviated date and Buddhist year |
| สถานะ | `ryp_payment_history.payment_status` | `PENDING_FINANCE` = รอตรวจสอบจากทางการเงิน, `SUCCESS` = ชำระสำเร็จ |
| ตรวจสอบสถานะ | `ryp_payment_transaction.response_code`, `last_update` | Re-query payment gateway for `PENDING_FINANCE` and persist the latest result |
| จำนวนทั้งหมด | `COUNT(ryp_payment_history.id)` | Apply the same search/filter predicates |
| ข้อมูล ณ วันที่ | `MAX(ryp_payment_history.last_update)` | Format as Thai date |
| ช่องทางชำระ (detail) | `ryp_payment_history.payment_type_desc` | Detail screen |
| เลขอ้างอิง (detail) | `ryp_payment_transaction.reference1` | Join by `ryp_payment_history_id` |
| เลขที่ใบเสร็จ (detail) | `ryp_payment_transaction.reference1` | Display payment receipt/reference number |
| ยอดรายการ (detail) | `ryp_payment_transaction.total_amount` | Join by `ryp_payment_history_id` |
| ปี/งวด (detail) | `ryp_payment_detail.pay_period` | Join transaction to detail |
| จำนวนงวดที่ชำระ | `COUNT(ryp_payment_detail.id)` | One detail card per paid installment; case ชำระ 1 งวด returns one card |
| หลายงวด/ใบเสร็จเดียวกัน | `ryp_payment_detail.ryp_payment_transaction_id` | Multiple detail rows share one transaction and `ryp_payment_transaction.reference1` receipt number |
| เบี้ยหลัก/เพิ่มเติม (detail) | `life_premium`, `rider_premium` | Join transaction to detail |
| เบี้ย Extra (detail) | `ryp_payment_detail.extra_premium` | Display for applicable policies/pending-finance detail |
| เบี้ยประกันภัยรวม (detail) | `ryp_payment_detail.total_premium` | Format with 2 decimals and append บาท |

Recommended list query joins only when transaction data is required; otherwise query `ryp_payment_history` directly for faster pagination. The relationship is history 1:N transaction and transaction 1:N detail.
