// Pending / due-list PDF export, styled to match the printed AQUAJAR due list:
// a bordered header (title · TOTAL · TILL date) over an ID / Name / Mobile / Bill /
// Paid-Amount table, zebra-striped, sorted by bill descending. Rendered off-screen
// with html2canvas so ₹ and the exact table look come from the browser, then sliced
// across A4 pages with jsPDF (both already used elsewhere in the app).

import { addImagePaginated } from "./pdfPaginate";

type Row = {
  id: number | string;
  name?: string;
  phone?: string;
  totalDue: number;
};

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

function buildTable(rows: Row[], title: string, totalStr: string, till: string): HTMLElement {
  const bd = "1px solid #000";
  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr style="background:${i % 2 ? "#f2f2f2" : "#ffffff"}">
        <td style="border:${bd};padding:6px 8px;text-align:center;">${escapeHtml(String(r.id ?? ""))}</td>
        <td style="border:${bd};padding:6px 10px;text-align:center;">${escapeHtml(r.name || "")}</td>
        <td style="border:${bd};padding:6px 8px;text-align:center;">${escapeHtml(r.phone || "")}</td>
        <td style="border:${bd};padding:6px 8px;text-align:center;">${inr(r.totalDue)}</td>
        <td style="border:${bd};padding:6px 8px;"></td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="width:760px;font-family:Arial,Helvetica,sans-serif;color:#000;background:#ffffff;">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <tr>
        <td style="border:${bd};padding:14px 12px;font-size:21px;font-weight:bold;text-align:center;width:45%;line-height:1.2;">${escapeHtml(title)}</td>
        <td style="border:${bd};padding:0;width:26%;text-align:center;vertical-align:middle;">
          <div style="border-bottom:${bd};padding:9px;font-weight:bold;font-size:15px;">TOTAL:</div>
          <div style="padding:10px 9px;font-weight:bold;font-size:19px;">${totalStr}</div>
        </td>
        <td style="border:${bd};padding:14px 12px;font-size:17px;font-weight:bold;text-align:center;width:29%;line-height:1.25;">TILL ${escapeHtml(till)}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;">
      <thead>
        <tr>
          <th style="border:${bd};padding:8px;font-weight:bold;text-align:center;width:12%;">ID</th>
          <th style="border:${bd};padding:8px 10px;font-weight:bold;text-align:left;width:35%;">Name</th>
          <th style="border:${bd};padding:8px;font-weight:bold;text-align:center;width:22%;">Mobile Number</th>
          <th style="border:${bd};padding:8px;font-weight:bold;text-align:center;width:16%;">Bill</th>
          <th style="border:${bd};padding:8px;font-weight:bold;text-align:center;width:15%;">Paid Amount</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;

  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild as HTMLElement;
}

export async function exportPendingListPDF(
  data: Row[],
  opts: { title: string; till: string; fileBase: string }
): Promise<void> {
  const pending = (data || [])
    .filter((r) => Number(r.totalDue) > 0)
    .sort((a, b) => Number(b.totalDue) - Number(a.totalDue));

  if (pending.length === 0) {
    throw new Error("No pending dues to export");
  }
  const total = pending.reduce((s, r) => s + Number(r.totalDue || 0), 0);

  const html2canvas = (await import("html2canvas")).default;
  const jspdf = await import("jspdf");
  const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;

  const el = buildTable(pending, opts.title, inr(total), opts.till);
  const holder = document.createElement("div");
  holder.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;background:#ffffff;";
  holder.appendChild(el);
  document.body.appendChild(holder);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const pdf = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    // Break pages only between data rows so no row is split across a page.
    addImagePaginated(pdf, canvas, el, { margin: 18, rowSelector: "tbody tr" });
    pdf.save(`${opts.fileBase}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}
