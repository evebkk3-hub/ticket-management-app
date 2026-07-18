INSERT OR IGNORE INTO ryp_payment_history
(id, agent_id, sales_id, branch_code, policy_no, total_premium, customer_full_name, customer_mobile_no, payment_status, payment_type, payment_type_desc, pay_date, collection_id)
VALUES
(1,'A0001','S0001','BKK01','1234567891',9999999999,'ธนาธิป รุ่งปัญญกิจพัฒน์','082-345-6789','PENDING_FINANCE','QR','QR Payment','2026-06-18','COL-0001'),
(2,'A0001','S0001','BKK01','1234567892',100000,'ธนาธิป รุ่งปัญญกิจพัฒน์',NULL,'PENDING_FINANCE','QR','QR Payment','2026-06-17','COL-0002'),
(3,'A0001','S0001','BKK01','1234567893',300000,'จุฑามาศ อภิคุณมงคล','082-345-6790','PENDING_FINANCE','QR','QR Payment','2026-06-16','COL-0003'),
(4,'A0001','S0001','BKK01','1234567894',500000,'วารุณี ศิริทิพยากานต์','082-345-6791','PENDING_FINANCE','QR','QR Payment','2026-06-15','COL-0004'),
(5,'A0001','S0001','BKK01','1234567895',500000,'ณัชภา อิ่มเก่งวิศิรพร','082-345-6792','SUCCESS','QR','QR Payment','2026-06-14','COL-0005');
