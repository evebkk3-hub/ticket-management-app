import { getDatabase } from "../database/database";
import type { PaymentDetail, PaymentHistory, PaymentHistoryQuery } from "../domain/payment";

type HistoryRow = {
  id: number; policy_no: string; customer_full_name: string; customer_mobile_no: string | null;
  total_premium: number; pay_date: string; payment_status: PaymentHistory["paymentStatus"];
  payment_type_desc: string | null; plan_code: string | null; plan_name: string | null; installment_count: number;
};

export async function listPaymentHistory(options: PaymentHistoryQuery = {}): Promise<PaymentHistory[]> {
  const db = await getDatabase();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 10));
  const predicates: string[] = [];
  const params: Array<string | number> = [];
  if (options.query?.trim()) {
    predicates.push("(h.customer_full_name LIKE ? OR h.policy_no LIKE ?)");
    const query = `%${options.query.trim()}%`;
    params.push(query, query);
  }
  if (options.status) { predicates.push("h.payment_status = ?"); params.push(options.status); }
  const where = predicates.length ? `WHERE ${predicates.join(" AND ")}` : "";
  const direction = options.sortDirection === "ASC" ? "ASC" : "DESC";
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await db.getAllAsync<HistoryRow>(
    `SELECT h.id,h.policy_no,h.customer_full_name,h.customer_mobile_no,h.total_premium,h.pay_date,h.payment_status,
      h.payment_type_desc,h.plan_code,h.plan_name,COUNT(d.id) AS installment_count
     FROM ryp_payment_history h
     LEFT JOIN ryp_payment_transaction t ON t.ryp_payment_history_id=h.id
     LEFT JOIN ryp_payment_detail d ON d.ryp_payment_transaction_id=t.id
     ${where} GROUP BY h.id ORDER BY h.pay_date ${direction}, h.id DESC LIMIT ? OFFSET ?`, params
  );
  return rows.map((row) => ({ id: row.id, policyNo: row.policy_no, customerFullName: row.customer_full_name,
    customerMobileNo: row.customer_mobile_no, totalPremium: Number(row.total_premium), payDate: row.pay_date,
    paymentStatus: row.payment_status, paymentTypeDesc: row.payment_type_desc, planCode: row.plan_code,
    planName: row.plan_name, installmentCount: Number(row.installment_count) }));
}

export async function getPaymentDetails(historyId: number): Promise<PaymentDetail[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number; transaction_id: number; policy_no: string; pay_period: string | null; sequence: number | null;
    life_premium: number; rider_premium: number; extra_premium: number; total_premium: number;
    receipt_no: string | null; pay_date: string | null;
  }>(
    `SELECT d.id,d.ryp_payment_transaction_id AS transaction_id,d.policy_no,d.pay_period,d.sequence,
      d.life_premium,d.rider_premium,d.extra_premium,d.total_premium,t.reference1 AS receipt_no,t.pay_date
     FROM ryp_payment_detail d JOIN ryp_payment_transaction t ON t.id=d.ryp_payment_transaction_id
     WHERE t.ryp_payment_history_id=? ORDER BY d.sequence ASC,d.id ASC`, historyId
  );
  return rows.map((row) => ({ id: row.id, transactionId: row.transaction_id, policyNo: row.policy_no,
    payPeriod: row.pay_period, sequence: row.sequence, lifePremium: Number(row.life_premium),
    riderPremium: Number(row.rider_premium), extraPremium: Number(row.extra_premium),
    totalPremium: Number(row.total_premium), receiptNo: row.receipt_no, payDate: row.pay_date }));
}
