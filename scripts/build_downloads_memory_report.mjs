import fs from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[2] || "C:\\Users\\lenovo\\Downloads";
const auditRoot = process.argv[3] || "tmp\\downloads-memory-audit";
const outputPath = process.argv[4] || "docs\\memory\\DOWNLOADS_DOCUMENT_MEMORY.md";

async function readJson(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function md(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

const excel = await readJson(path.join(auditRoot, "excel-audit.json"));
const pdf = await readJson(path.join(auditRoot, "pdf", "_summary.json"));
const docx = await readJson(path.join(auditRoot, "docx", "_summary.json"));
const oldDocPath = path.join(sourceRoot, "NASA-11992.doc");
const oldDocHtml = await fs.readFile(oldDocPath, "utf8");
const oldDocText = stripHtml(oldDocHtml);
const drawioPath = path.join(sourceRoot, "Life Planning LV.drawio");
const drawioText = await fs.readFile(drawioPath, "utf8");
const drawioPages = [...drawioText.matchAll(/<diagram\b[^>]*\bname="([^"]*)"/g)].map((match) => match[1]);

const visibleSheets = excel.workbooks.flatMap((workbook) => workbook.sheets).filter((sheet) => sheet.state === "visible").length;
const hiddenSheets = excel.totalSheets - visibleSheets;
const totalCells = excel.workbooks.flatMap((workbook) => workbook.sheets)
  .reduce((sum, sheet) => sum + Number(sheet.nonEmptyCells || 0), 0);
const totalFormulas = excel.workbooks.flatMap((workbook) => workbook.sheets)
  .reduce((sum, sheet) => sum + Number(sheet.formulas || 0), 0);
const totalFormulaErrors = excel.workbooks.flatMap((workbook) => workbook.sheets)
  .reduce((sum, sheet) => sum + Number(sheet.formulaErrors || 0), 0);

const lines = [];
lines.push("# Downloads Document Memory");
lines.push("");
lines.push("Source reviewed: `C:\\Users\\lenovo\\Downloads`  ");
lines.push("Reviewed: 2026-07-30  ");
lines.push("Purpose: durable SA/Dev/Business/Data memory plus document and worksheet coverage ledger");
lines.push("");
lines.push("## Coverage Summary");
lines.push("");
lines.push("| Type | Files | Coverage | Result |");
lines.push("|---|---:|---:|---|");
lines.push(`| Excel (.xlsx/.xlsm) | ${excel.workbookCount} | ${excel.totalSheets} worksheets (${visibleSheets} visible, ${hiddenSheets} hidden) | ${excel.workbooksRead} read, ${excel.workbookErrors} errors |`);
lines.push(`| PDF | ${pdf.documentCount} | ${pdf.totalPages} pages / ${pdf.totalCharacters.toLocaleString("en-US")} extracted characters | ${pdf.documentsRead} read, ${pdf.documentErrors} errors |`);
lines.push(`| DOCX | ${docx.documentCount} | ${docx.totalCharacters.toLocaleString("en-US")} extracted characters | ${docx.documentsRead} read, ${docx.documentErrors} errors |`);
lines.push(`| Legacy .doc | 1 | Jira HTML export / ${oldDocText.length.toLocaleString("en-US")} characters | read |`);
lines.push(`| Draw.io | 1 | ${drawioPages.length} pages | read |`);
lines.push("| Executable / lock files | 3 | excluded as non-document artifacts | not ingested |");
lines.push("");
lines.push(`The Excel pass visited approximately ${totalCells.toLocaleString("en-US")} non-empty cells and ${totalFormulas.toLocaleString("en-US")} formula cells. It observed ${totalFormulaErrors.toLocaleString("en-US")} cached formula-error values; most are concentrated in Life Planning simulation/template ranges and require Excel recalculation with controlled test scenarios before being classified as defects.`);
lines.push("");
lines.push("## Durable Business and Architecture Memory");
lines.push("");
lines.push("### Life Planning / LifeVerse");
lines.push("");
lines.push("- The document set forms a chain from product specification and BRD to detailed screen/API specifications and actuarial/projection workbooks. The principal current-looking artifacts are the LifeVerse product specification, Life Planning BRD V2.5, Life Planning calculation workbook V5.7, and Self Design Tool V1.5.");
lines.push("- The user journey is Prospect/Agent context -> coverage period -> premium design -> sum assured -> expected return -> financial goals (savings, retirement, withdrawal) -> rider selection -> recommendation/result -> sales illustration/quotation.");
lines.push("- LifeVerse 99/99 is a flexible premium/account-value product. The reviewed product specification states entry age from one month through age 80 for current sale and benefit coverage to age 99.");
lines.push("- Premium concepts are Regular Premium (RP) and Top-up Premium (TP). The product specification records minimum annual RP of THB 36,000, with annual/semi-annual/quarterly/monthly modes and THB 100 increments. TP is flexible but is constrained by product/regulatory rules, including an annual cumulative cap relative to accumulated RP.");
lines.push("- RP increase/decrease is allowed after one full policy year and on the policy anniversary, subject to minimum premium, premium-holiday, charge, commission, and watermark-method rules.");
lines.push("- The calculation model includes premium charges, surrender charges, COI, account value, investment return assumptions, partial withdrawal, retirement/annuity income, PPR/rider funding, sum-assured multipliers, occupation caps, rider rates, and sales illustration tables.");
lines.push("- The V5.7 workbook adds/deepens Package Rider, ACC, Health, HB, CI, COI, Annuity, and SA Multiplier data. The Self Design workbook contains the customer-facing flow plus large monthly projection and document-template sheets.");
lines.push("- Account-value sufficiency and COI coverage are recurring guardrails. Withdrawal/retirement/rider choices must be validated against future account-value sustainability, not only current cash flow.");
lines.push("- Integration boundaries include prospect/lead, quotation, rider, application, document generation, sales illustration, and downstream policy/application processes.");
lines.push("");
lines.push("### Renewal Payment / e-RYP / APL");
lines.push("");
lines.push("- The business objective is to let TL Smart and TLI App collect renewal premium plus APL interest, including Legacy and InsureMO policies and cases beyond the earlier 90-day limitation.");
lines.push("- Primary payment channels in scope are QR Code and Credit Card. The wider reference set also contains Cheque and Direct Debit status semantics.");
lines.push("- The required end-to-end capabilities are eligibility and policy preparation, realtime premium/interest calculation, payment initiation/result handling, premium and interest receipts, Legacy/Core transaction update, benefit calculation, reconciliation, GL transaction generation, and customer notification.");
lines.push("- The dashboard design uses a renewal-payment summary widget and six status cards, with permission/disabled/dynamic-layout behavior and navigation into payment-history/detail views.");
lines.push("- A central referenced endpoint is `GET /ms-members/v1/renewal-policy/ryp-detail-widget`. Related artifacts define response mapping, configuration, list-of-value mapping, date/eligibility rules, and database mapping.");
lines.push("- The data model centers on payment history, payment transaction, and payment detail/pay-period information. The reviewed dictionary explicitly covers `ryp_payment_transaction` and `ryp_payment_detail`.");
lines.push("- Payment response codes differ by channel and must not be normalized by string alone: QR/Cheque use codes such as `00000`/`10000`; Credit Card uses `000`/`100`; Direct Debit uses collection status such as `00`/`01`/`02`.");
lines.push("- Production design must add explicit idempotency, signed callbacks, guarded state transitions, immutable audit events, reconciliation ownership, GL/outbox behavior, and source-system authority.");
lines.push("");
lines.push("### Migration and Data");
lines.push("");
lines.push("- The TLPro -> TL Smart migration scope spans prospect, prospect address, PDPA, quotation, quotation rider, application, insured, beneficiary, guardian, answers, documents, payment, refund, eKYC, and related offer/tracking entities.");
lines.push("- Mapping workbooks consistently separate TL Smart target schema, legacy/source representation, and example SQL. This should become executable mapping specifications and reconciled migration tests, not remain spreadsheet-only.");
lines.push("- The downloads contain production-like sample identifiers and personal/business data. Do not copy raw samples into source control or logs. Use masked fixtures and a formal PII classification/retention policy.");
lines.push("- Two copies of `NASA_R2_Data Dictionary.xlsx` exist with different file names; they appear structurally aligned but should have one controlled source and version.");
lines.push("");
lines.push("### Identity, 2FA, and Authorization");
lines.push("");
lines.push("- UAM defines role/action permissions across trainee agent, agent, unit, center, region, division, director, and expired-license roles.");
lines.push("- Permission vocabulary includes View, Create, Update, Delete, Approve, and Reject. BOF and TL Smart matrices contain current, draft, archive, recruitment, widget, landing, and historical variants.");
lines.push("- Multiple hidden/archive permission sheets create source-of-truth risk. Authorization rules should be versioned as machine-readable policy and tested against UI and API enforcement.");
lines.push("- The Login 2FA BRD indicates identity hardening is a real program concern. The current prototype's hard-coded login/static session remains inconsistent with that target.");
lines.push("");
lines.push("### API and Integration Landscape");
lines.push("");
lines.push("- `TLI_Surrounding _API_Spec.xlsx` contains 68 sheets covering producer/consumer APIs, customer/UW/risk/payment/refund/notification/document/claim/consent/receipt/collection integrations and backup/version variants.");
lines.push("- API governance is currently document-heavy and version-fragmented. Establish OpenAPI source control, owner/system-of-record, compatibility policy, security scheme, error model, correlation ID, timeout/retry policy, and contract tests.");
lines.push("- Screen-level TNS PDFs provide detailed API/UI/field mapping for Life Planning steps 0-7, summary, application detail, quotation preview, RYP widget, landing, and UAM. They should be traced to backlog IDs and automated acceptance tests.");
lines.push("");
lines.push("## Cross-Document Risks and Decisions");
lines.push("");
lines.push("1. **Source-of-truth/version drift:** BRD V2.4, V2.5, model V5.1, model V5.7, Self Design V1.5, duplicate/backup/hidden sheets, and API versions coexist. Approve a version matrix per release.");
lines.push("2. **Spreadsheet-as-code risk:** calculation behavior depends on hundreds of thousands of formulas, macros, hidden sheets, and cached values. Create golden scenarios and reimplement approved rules in a tested calculation service.");
lines.push("3. **Formula error interpretation:** cached `#N/A` and similar values occur heavily in empty/template projection scenarios. Recalculate in Excel with controlled inputs and classify expected-empty versus genuine formula faults.");
lines.push("4. **PII and financial data:** migration and API examples contain production-like identifiers and customer/policy fields. Apply masking, access controls, audit, retention, and secret scanning.");
lines.push("5. **Payment consistency:** channel-specific result codes, callbacks, receipts, Core updates, reconciliation, GL, and SMS must be one controlled state machine with idempotent events.");
lines.push("6. **Authorization consistency:** UI visibility, widget/menu configuration, and backend authorization must be driven from the same policy source.");
lines.push("7. **Document encoding:** some Draw.io/PDF text is visibly double-encoded or uses custom font mappings. Preserve originals and validate Thai labels visually when implementing UI.");
lines.push("8. **Duplicate artifact:** `[NASA] BRD - Life Planning LV V.2.4.pdf` and its `(1)` copy are byte-identical.");
lines.push("");
lines.push("## Recommended Traceability Baseline");
lines.push("");
lines.push("| Domain | Requirement source | Rule/data source | API/UI source | Required executable evidence |");
lines.push("|---|---|---|---|---|");
lines.push("| Life Planning | BRD V2.5 + Product Specification | Calculation V5.7 + Self Design V1.5 | TNS Step 0-7/Summary PDFs | golden scenario tests and versioned config |");
lines.push("| RYP/APL | RYP BRD + APL Legacy BRD | Data dictionary + payment detail sheets | RYP widget/detail/API PDFs | payment state-machine and reconciliation tests |");
lines.push("| Migration | Migration scope workbook | per-table mapping workbooks | application/quotation specs | row-count, field, checksum, and exception reconciliation |");
lines.push("| Identity/UAM | Login 2FA BRD + UAM | permission matrices | landing/widget/menu specs | API authorization matrix tests |");
lines.push("");
lines.push("## Excel Workbook and Worksheet Coverage");
lines.push("");
lines.push("Every worksheet below was opened from OOXML and scanned for cell/formula metadata. Hidden state is retained because hidden sheets often contain assumptions, rates, mappings, and calculation logic.");
lines.push("");
for (const workbook of excel.workbooks) {
  const formulaCount = workbook.sheets.reduce((sum, sheet) => sum + Number(sheet.formulas || 0), 0);
  const errorCount = workbook.sheets.reduce((sum, sheet) => sum + Number(sheet.formulaErrors || 0), 0);
  lines.push(`### ${md(workbook.path)}`);
  lines.push("");
  lines.push(`Sheets: ${workbook.sheetCount}; formulas: ${formulaCount.toLocaleString("en-US")}; cached formula errors: ${errorCount.toLocaleString("en-US")}`);
  lines.push("");
  lines.push("| # | Sheet | State | Used range | Non-empty cells | Formulas | Cached errors | Status |");
  lines.push("|---:|---|---|---|---:|---:|---:|---|");
  for (const sheet of workbook.sheets) {
    lines.push(`| ${sheet.index} | ${md(sheet.name)} | ${md(sheet.state)} | ${md(sheet.dimension)} | ${Number(sheet.nonEmptyCells || 0).toLocaleString("en-US")} | ${Number(sheet.formulas || 0).toLocaleString("en-US")} | ${Number(sheet.formulaErrors || 0).toLocaleString("en-US")} | ${md(sheet.status)} |`);
  }
  lines.push("");
}

lines.push("## PDF Coverage");
lines.push("");
lines.push("| File | Pages | Extracted characters | Status |");
lines.push("|---|---:|---:|---|");
for (const document of pdf.documents) {
  lines.push(`| ${md(document.path)} | ${Number(document.pages || 0).toLocaleString("en-US")} | ${Number(document.characters || 0).toLocaleString("en-US")} | ${md(document.status)} |`);
}
lines.push("");
lines.push("## Word and Diagram Coverage");
lines.push("");
lines.push("| File | Type | Coverage | Status |");
lines.push("|---|---|---|---|");
for (const document of docx.documents) {
  lines.push(`| ${md(document.path)} | DOCX | ${Number(document.characters || 0).toLocaleString("en-US")} characters; ${Number(document.paragraphs || 0).toLocaleString("en-US")} paragraphs; ${Number(document.tables || 0)} tables; ${Number(document.media || 0)} media | ${md(document.status)} |`);
}
lines.push(`| NASA-11992.doc | HTML exported with .doc extension | ${oldDocText.length.toLocaleString("en-US")} characters; Jira NASA-11992 quotation change request | read |`);
lines.push(`| Life Planning LV.drawio | Draw.io | ${drawioPages.length} pages: ${drawioPages.map(md).join(", ")} | read |`);
lines.push("");
lines.push("## Ingestion Notes");
lines.push("");
lines.push("- Source files were read-only; no file under Downloads was modified.");
lines.push("- PDF coverage is page-level text extraction. Image-only annotations or exact visual positioning require separate visual review when implementing a specific screen.");
lines.push("- DOCX coverage includes document body, tables, headers, footers, footnotes/endnotes, and comments when present in OOXML.");
lines.push("- Excel formulas were not recalculated; values are workbook cached values at the time the files were saved.");
lines.push("- Audit JSON and parser runtime remain under ignored `tmp/downloads-memory-audit` and are not intended for source control.");
lines.push("- The detailed ledger intentionally excludes raw cell/page text to avoid committing customer-like identifiers and sensitive examples.");
lines.push("");

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`REPORT=${path.resolve(outputPath)}\n`);
process.stdout.write(`LINES=${lines.length}\n`);
