export type PaymentStatus = "PENDING_FINANCE" | "SUCCESS" | "FAILED";

export interface PaymentHistory {
  id: number;
  policyNo: string;
  customerFullName: string;
  customerMobileNo: string | null;
  totalPremium: number;
  payDate: string;
  paymentStatus: PaymentStatus;
  paymentTypeDesc: string | null;
  planCode: string | null;
  planName: string | null;
  installmentCount: number;
}

export interface PaymentDetail {
  id: number;
  transactionId: number;
  policyNo: string;
  payPeriod: string | null;
  sequence: number | null;
  lifePremium: number;
  riderPremium: number;
  extraPremium: number;
  totalPremium: number;
  receiptNo: string | null;
  payDate: string | null;
}

export interface PaymentHistoryQuery {
  query?: string;
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
  sortDirection?: "ASC" | "DESC";
}
