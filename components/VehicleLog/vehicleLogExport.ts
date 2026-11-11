import type { VehicleLog } from "@/types/types";
import { addImagePaginated } from "@/lib/pdfPaginate";

// Column order exactly matches the physical "VEHICLE LOG" sheet.
const HEADERS = [
  "Date",
  "Departure Time",
  "Arrival Time",
  "Out",
  "Return",
  "Engaged",
  "Filled",
  "Empty",
  "Recorded",
  "Cash",
  "Staff",
  "Location",
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const sum = (logs: VehicleLog[], key: keyof VehicleLog) =>
  logs.reduce((acc, l) => acc + (Number(l[key]) || 0), 0);

const statusOf = (l: VehicleLog) => l.status || "approved";

// Rejected trips never add to the totals, unless the file holds nothing else.
const totalsOf = (logs: VehicleLog[]) => {
  const counted = logs.filter((l) => statusOf(l) !== "rejected");
  return counted.length === 0 || counted.length === logs.length
    ? { counted: logs, label: "TOTAL" }
    : { counted, label: "TOTAL (rejected not counted)" };
};

// ── XLSX (SheetJS) ────────────────────────────────────────────────────────────
// withStatus adds a Status column, for files that hold more than approved trips.
export async function exportVehicleLogXLSX(
  logs: VehicleLog[],
  monthLabel: string,
  fileBase: string,
  withStatus = false
) {
  const XLSX = await import("xlsx");
  const headers = withStatus ? [...HEADERS, "Status"] : HEADERS;
  const { counted, label } = totalsOf(logs);

  const title = `VEHICLE LOG ${monthLabel.toUpperCase()}`;
  const dataRows = logs.map((l) => [
    fmtDate(l.date),
    l.departureTime || "",
    l.arrivalTime || "",
    l.out ?? "",
    l.returned,
    l.engaged,
    l.filled,
    l.empty,
    l.recorded,
    l.cash,
    (l.staff || []).join("/"),
    (l.location || []).join("/"),
    ...(withStatus ? [statusOf(l)] : []),
  ]);

  const totalRow = [
    label,
    "",
    "",
    sum(counted, "out"),
    sum(counted, "returned"),
    sum(counted, "engaged"),
    sum(counted, "filled"),
    sum(counted, "empty"),
    sum(counted, "recorded"),
    sum(counted, "cash"),
    "",
    "",
  ];

  const aoa: (string | number)[][] = [
    [title],
    [],
    headers,
    ...dataRows,
    [],
    totalRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 13 }, // Date
    { wch: 13 }, // Departure
    { wch: 12 }, // Arrival
    { wch: 6 }, // Out
    { wch: 7 }, // Return
    { wch: 8 }, // Engaged
    { wch: 6 }, // Filled
    { wch: 6 }, // Empty
    { wch: 9 }, // Recorded
    { wch: 9 }, // Cash
    { wch: 22 }, // Staff
    { wch: 26 }, // Location
    { wch: 10 }, // Status
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vehicle Log");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

// ── PDF (html2canvas + jsPDF, A4 landscape) ───────────────────────────────────
// Builds a document-style table off-screen, rasterises it, and lays it across
// landscape A4 pages, breaking only between rows.
export async function exportVehicleLogPDF(
  logs: VehicleLog[],
  monthLabel: string,
  fileBase: string,
  withStatus = false
) {
  const html2canvas = (await import("html2canvas")).default;
  const jspdf = await import("jspdf");
  const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;

  const el = buildPrintTable(logs, monthLabel, withStatus);
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
    const pdf = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    // The table's own padding is the page-1 margin; later pages need one at the top.
    addImagePaginated(pdf, canvas, el, { marginTop: 20, rowSelector: "tbody tr", quality: 0.9 });
    pdf.save(`${fileBase}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}

// Builds the off-screen printable table (inline styles only).
function buildPrintTable(logs: VehicleLog[], monthLabel: string, withStatus: boolean): HTMLElement {
  const { counted, label } = totalsOf(logs);
  const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
  const th = (t: string, align = "left", w = "") =>
    `<th style="border:1px solid #94a3b8;padding:6px 8px;text-align:${align};background:#1c63b0;color:#fff;font-size:11px;${w}">${t}</th>`;
  const td = (t: string | number, align = "left", strong = false) =>
    `<td style="border:1px solid #cbd5e1;padding:5px 8px;text-align:${align};font-size:11px;${
      strong ? "font-weight:700;" : ""
    }">${t}</td>`;

  const rows = logs
    .map((l) =>
      `<tr>${td(fmtDate(l.date))}${td(l.departureTime || "—", "center")}${td(
        l.arrivalTime || "—",
        "center"
      )}${td(l.out ?? "", "right")}${td(l.returned, "right")}${td(
        l.engaged,
        "right"
      )}${td(l.filled, "right")}${td(l.empty, "right")}${td(
        l.recorded,
        "right"
      )}${td(inr(l.cash), "right")}${td((l.staff || []).join(" / "))}${td(
        (l.location || []).join(" / ")
      )}</tr>`
    )
    .join("");

  const totalRow = `<tr style="background:#eff6ff;">
    <td colspan="3" style="border:1px solid #cbd5e1;padding:5px 8px;font-size:11px;font-weight:700;">${label}</td>
    ${td(sum(counted, "out"), "right", true)}${td(sum(counted, "returned"), "right", true)}
    ${td(sum(counted, "engaged"), "right", true)}${td(sum(counted, "filled"), "right", true)}
    ${td(sum(counted, "empty"), "right", true)}${td(sum(counted, "recorded"), "right", true)}
    ${td(inr(sum(counted, "cash")), "right", true)}${td("", "left")}${td("", "left")}${withStatus ? td("") : ""}
  </tr>`;

  const el = document.createElement("div");
  el.style.cssText =
    "width:1050px;box-sizing:border-box;padding:28px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;";
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1c63b0;padding-bottom:10px;margin-bottom:14px;">
      <div>
        <div style="font-size:24px;font-weight:800;color:#1c63b0;letter-spacing:1px;">AQUAJAR</div>
        <div style="font-size:11px;color:#6b7280;">Rupsing, Lower Bagdogra, Siliguri, WB - 734014 &nbsp;•&nbsp; GSTIN: 19FNQPR3260F2ZG</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:700;">VEHICLE LOG ${monthLabel.toUpperCase()}</div>
        <div style="font-size:11px;color:#6b7280;">${logs.length} trips</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        ${th("Date")}${th("Departure", "center")}${th("Arrival", "center")}
        ${th("Out", "right")}${th("Return", "right")}${th("Engaged", "right")}
        ${th("Filled", "right")}${th("Empty", "right")}${th("Recorded", "right")}
        ${th("Cash", "right")}${th("Staff")}${th("Location")}${withStatus ? th("Status") : ""}
      </tr></thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>`;
  return el;
}
