import { getDatabase } from "./database";

const names = ["ธนาธิป รุ่งปัญญกิจพัฒน์", "ธนาธิป รุ่งปัญญกิจพัฒน์", "จุฑามาศ อภิคุณมงคล", "วารุณี ศิริทิพยากานต์", "ณัชภา อิ่มเก่งวิศิรพร", "วรัญญู บรรณาการ", "พัชร วงศ์สุวรรณ", "สุทธิดา สุดประเสริฐ", "นภัสสร สวัสดีโพศาล", "วารุณี ศิริทิพยากานต์"];

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM ryp_payment_history");
  if ((row?.count ?? 0) > 0) return;
  await db.withTransactionAsync(async () => {
    for (let index = 0; index < names.length; index += 1) {
      const pending = index < 4;
      const policyNo = `12345678${index === 9 ? 10 : 91 + index}`;
      const collectionId = `COL-${String(index + 1).padStart(4, "0")}`;
      const result = await db.runAsync(
        `INSERT INTO ryp_payment_history(agent_id,sales_id,branch_code,policy_no,plan_code,plan_name,total_premium,customer_full_name,customer_mobile_no,customer_email,payment_status,payment_type,payment_type_desc,pay_date,collection_id)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        "A0001", "S0001", "BKK01", policyNo, pending || index === 5 ? "UWB" : "EL",
        pending || index === 5 ? "ทีแอล ยูนิเวอร์แซลไลฟ์ 90/90" : "ทรัพย์ปันผล 20/20",
        index === 0 ? 9999999999 : [100000,300000,500000,500000,300000,20000000,100000,500000,100000][index - 1] ?? 100000,
        names[index]!, index === 1 ? null : `082-345-${6789 + index}`, "example@gmail.com",
        pending ? "PENDING_FINANCE" : "SUCCESS", "QR", "QR Payment", `2026-06-${String(18 - index).padStart(2, "0")}`, collectionId
      );
      const transaction = await db.runAsync(
        `INSERT INTO ryp_payment_transaction(ryp_payment_history_id,policy_no,collection_id,reference1,total_amount,response_code,payment_type,payment_type_desc,pay_date)
         VALUES(?,?,?,?,?,?,?,?,?)`, result.lastInsertRowId, policyNo, collectionId, "123450000012", index === 5 ? 40000 : 20000, pending ? "PENDING" : "00", "QR", "QR Payment", `2026-06-${String(18 - index).padStart(2, "0")}`
      );
      const detailCount = index === 5 ? 2 : 1;
      for (let sequence = 1; sequence <= detailCount; sequence += 1) {
        await db.runAsync(
          `INSERT INTO ryp_payment_detail(ryp_payment_transaction_id,policy_no,pay_period,sequence,collection_id,life_premium,rider_premium,extra_premium,total_premium,total_amount)
           VALUES(?,?,?,?,?,?,?,?,?,?)`, transaction.lastInsertRowId, policyNo, `01/${String(sequence).padStart(2, "0")}`, sequence, collectionId, 15000, 2500, pending || index === 5 ? 2500 : 0, 20000, 20000
        );
      }
    }
  });
}
