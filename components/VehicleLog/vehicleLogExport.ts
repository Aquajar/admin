import type { VehicleLog } from "@/types/types";

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

// ── XLSX (SheetJS) ────────────────────────────────────────────────────────────
export async function exportVehicleLogXLSX(
  logs: VehicleLog[],
  monthLabel: string,
  fileBase: string
) {
  const XLSX = await import("xlsx");

  const title = `VEHICLE LOG ${monthLabel.toUpperCase()}`;
  const dataRows = logs.map((l) => [
    fmtDate(l.date),
    l.departureTime || "",
    l.arrivalTime || "",
    l.out,
    l.returned,
    l.engaged,
    l.filled,
    l.empty,
    l.recorded,
    l.cash,
    (l.staff || []).join("/"),
    (l.location || []).join("/"),
  ]);

  const totalRow = [
    "TOTAL",
    "",
    "",
    sum(logs, "out"),
    sum(logs, "returned"),
    sum(logs, "engaged"),
    sum(logs, "filled"),
    sum(logs, "empty"),
    sum(logs, "recorded"),
    sum(logs, "cash"),
    "",
    "",
  ];

  const aoa: (string | number)[][] = [
    [title],
    [],
    HEADERS,
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
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vehicle Log");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

// ── PDF (html2canvas + jsPDF, A4 landscape, per-page crop + JPEG) ──────────────
// Builds a document-style table off-screen, rasterises it, and slices it across
// landscape A4 pages. Per-page cropping keeps the file small (no re-embedding the
// full image per page) and JPEG compression keeps it well under a MB.
export async function exportVehicleLogPDF(
  logs: VehicleLog[],
  monthLabel: string,
  fileBase: string
) {
  const html2canvas = (await import("html2canvas")).default;
  const jspdf = await import("jspdf");
  const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;

  const el = buildPrintTable(logs, monthLabel);
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
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const scale = pageW / canvas.width; // source px -> pt
    const pageSlicePx = Math.floor(pageH / scale);

    let rendered = 0;
    let first = true;
    while (rendered < canvas.height) {
      const sliceH = Math.min(pageSlicePx, canvas.height - rendered);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, sliceH);
        ctx.drawImage(
          canvas,
          0,
          rendered,
          canvas.width,
          sliceH,
          0,
          0,
          canvas.width,
          sliceH
        );
      }
      const img = pageCanvas.toDataURL("image/jpeg", 0.9);
      if (!first) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, pageW, sliceH * scale);
      rendered += sliceH;
      first = false;
    }

    pdf.save(`${fileBase}.pdf`);
  } finally {
    document.body.removeChild(holder);
  }
}

// Builds the off-screen printable table (inline styles only).
function buildPrintTable(logs: VehicleLog[], monthLabel: string): HTMLElement {
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
      )}${td(l.out, "right")}${td(l.returned, "right")}${td(
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
    ${td("TOTAL", "left", true)}${td("", "center")}${td("", "center")}
    ${td(sum(logs, "out"), "right", true)}${td(sum(logs, "returned"), "right", true)}
    ${td(sum(logs, "engaged"), "right", true)}${td(sum(logs, "filled"), "right", true)}
    ${td(sum(logs, "empty"), "right", true)}${td(sum(logs, "recorded"), "right", true)}
    ${td(inr(sum(logs, "cash")), "right", true)}${td("", "left")}${td("", "left")}
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
        ${th("Cash", "right")}${th("Staff")}${th("Location")}
      </tr></thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>`;
  return el;
}
