import type { AttendanceRow, AttendanceStatus } from "@/types/types";

// Status meta — colours mirror the source attendance sheet. Shared by the
// on-screen grid and both exports so all three look the same.
export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; name: string; note: string }
> = {
  P: { label: "P", bg: "#D9EAD3", text: "#274E13", name: "Present", note: "counts 1 present" },
  A: { label: "A", bg: "#EA9999", text: "#5B0000", name: "Absent", note: "counts 1 absent" },
  HD: { label: "HD", bg: "#C9DAF8", text: "#1C4587", name: "Half day", note: "counts ½ present, ½ absent" },
  H: { label: "H", bg: "#CFE2F3", text: "#1C4587", name: "Holiday", note: "not counted" },
};

export type AttendanceSheet = {
  year: number;
  month: number; // 1-12
  daysInMonth: number;
  rows: AttendanceRow[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const BRAND = "#1C63B0";
const PRESENT_BG = "#EDF6EA";
const PRESENT_TEXT = "#274E13";
const ABSENT_BG = "#FBECEC";
const ABSENT_TEXT = "#990000";

const fmtCount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const weekday = (s: AttendanceSheet, d: number) =>
  new Date(s.year, s.month - 1, d).getDay();
const isWeekend = (s: AttendanceSheet, d: number) => {
  const wd = weekday(s, d);
  return wd === 0 || wd === 6;
};

// Headcount present on a given day (half days count ½). Null when nobody has a
// working-day mark yet (future days, all-holiday days) so those cells stay blank.
const presentOnDay = (rows: AttendanceRow[], d: number) => {
  let marked = false;
  const n = rows.reduce((sum, r) => {
    const v = r.days?.[String(d)];
    if (v === "P" || v === "A" || v === "HD") marked = true;
    return sum + (v === "P" ? 1 : v === "HD" ? 0.5 : 0);
  }, 0);
  return marked ? n : null;
};

const summarize = (s: AttendanceSheet) => {
  const present = s.rows.reduce((sum, r) => sum + (r.present || 0), 0);
  const absent = s.rows.reduce((sum, r) => sum + (r.absent || 0), 0);
  const marked = present + absent;
  return {
    staff: s.rows.length,
    present,
    absent,
    rate: marked > 0 ? `${Math.round((present / marked) * 100)}%` : "-",
  };
};

const periodLabel = (s: AttendanceSheet) => `${MONTHS[s.month - 1]} ${s.year}`;

const generatedLabel = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// ── XLSX (sheetjs-style, so cells keep their colours) ────────────────────────
export async function exportAttendanceXLSX(sheet: AttendanceSheet, fileBase: string) {
  const mod: any = await import("sheetjs-style");
  const XLSX = mod.default || mod;

  const days = Array.from({ length: sheet.daysInMonth }, (_, i) => i + 1);
  const FIXED = 4; // ID, Employee, Present, Absent
  const lastCol = FIXED + days.length - 1;
  const sum = summarize(sheet);

  // sheetjs-style prefixes fills with alpha itself; fonts/borders need ARGB.
  const fill = (hex: string) => ({ patternType: "solid", fgColor: { rgb: hex.slice(1) } });
  const color = (hex: string) => ({ rgb: "FF" + hex.slice(1) });
  const thin = (hex = "#E5E7EB") => ({ style: "thin", color: color(hex) });
  const grid = { top: thin(), bottom: thin(), left: thin(), right: thin() };
  const center = { horizontal: "center", vertical: "center" };

  const HEAD_A = 3; // weekday initials
  const HEAD_B = 4; // day numbers
  const FIRST_DATA = 5;
  const totalsRow = FIRST_DATA + sheet.rows.length;
  const legendStart = totalsRow + 2;

  const aoa: (string | number)[][] = [];
  aoa[0] = [`AQUAJAR  ·  Attendance  ·  ${periodLabel(sheet)}`];
  aoa[1] = [
    `${sum.staff} staff  ·  Present ${fmtCount(sum.present)}  ·  Absent ${fmtCount(
      sum.absent
    )}  ·  Attendance ${sum.rate}  ·  Generated ${generatedLabel()}`,
  ];
  aoa[2] = [];
  aoa[HEAD_A] = ["ID", "Employee", "Present", "Absent", ...days.map((d) => WEEKDAYS[weekday(sheet, d)])];
  aoa[HEAD_B] = ["", "", "", "", ...days];
  sheet.rows.forEach((r, i) => {
    aoa[FIRST_DATA + i] = [
      r.employeeID,
      r.name || "",
      r.present || 0,
      r.absent || 0,
      ...days.map((d) => r.days?.[String(d)] || ""),
    ];
  });
  aoa[totalsRow] = [
    "",
    "Present per day",
    sum.present,
    sum.absent,
    ...days.map((d) => presentOnDay(sheet.rows, d) ?? ""),
  ];
  aoa[totalsRow + 1] = [];
  aoa[legendStart] = ["", "Legend"];
  (Object.keys(STATUS_META) as AttendanceStatus[]).forEach((k, i) => {
    aoa[legendStart + 1 + i] = [STATUS_META[k].label, `${STATUS_META[k].name} (${STATUS_META[k].note})`];
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const ref = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
  // Arial renders the same in Excel, Numbers, Sheets and Quick Look.
  const style = (r: number, c: number, s: Record<string, any>) => {
    const k = ref(r, c);
    if (!ws[k]) ws[k] = { t: "s", v: "" };
    ws[k].s = { ...s, font: { name: "Arial", sz: 10, ...(s.font || {}) } };
  };

  // Title band + summary line.
  for (let c = 0; c <= lastCol; c++) {
    style(0, c, {
      fill: fill(BRAND),
      font: { bold: true, sz: 14, color: color("#FFFFFF") },
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
    });
    style(1, c, {
      font: { sz: 10, color: color("#6B7280") },
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
    });
  }

  // Two-row header: fixed columns span both rows, days get weekday + date.
  for (let c = 0; c <= lastCol; c++) {
    const d = c - FIXED + 1;
    const weekend = c >= FIXED && isWeekend(sheet, d);
    const base = {
      fill: fill(weekend ? "#E2E8F0" : "#F3F4F6"),
      border: grid,
      alignment: c === 1 ? { horizontal: "left", vertical: "center", indent: 1 } : center,
    };
    style(HEAD_A, c, {
      ...base,
      font: c < FIXED ? { bold: true, sz: 11 } : { sz: 9, color: color("#6B7280") },
    });
    style(HEAD_B, c, {
      ...base,
      font: { bold: true, sz: 11, color: color(weekend ? "#6B7280" : "#0A0A0A") },
    });
  }

  // Data rows.
  sheet.rows.forEach((r, i) => {
    const R = FIRST_DATA + i;
    style(R, 0, { border: grid, alignment: center, font: { sz: 10, color: color("#6B7280") } });
    style(R, 1, {
      border: grid,
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
      font: { sz: 11, color: color("#0A0A0A") },
    });
    style(R, 2, { border: grid, alignment: center, fill: fill(PRESENT_BG), font: { bold: true, color: color(PRESENT_TEXT) } });
    style(R, 3, { border: grid, alignment: center, fill: fill(ABSENT_BG), font: { bold: true, color: color(ABSENT_TEXT) } });
    days.forEach((d) => {
      const st = r.days?.[String(d)];
      const meta = st ? STATUS_META[st] : null;
      style(R, FIXED + d - 1, {
        border: grid,
        alignment: center,
        ...(meta
          ? { fill: fill(meta.bg), font: { bold: true, sz: 10, color: color(meta.text) } }
          : isWeekend(sheet, d)
          ? { fill: fill("#F8FAFC") }
          : {}),
      });
    });
  });

  // Totals row.
  const topRule = { ...grid, top: { style: "medium", color: color(BRAND) } };
  for (let c = 0; c <= lastCol; c++) {
    style(totalsRow, c, {
      border: topRule,
      fill: fill("#EFF6FF"),
      alignment: c === 1 ? { horizontal: "left", vertical: "center", indent: 1 } : center,
      font: { bold: true, sz: c < FIXED ? 11 : 10, color: color(BRAND) },
    });
  }

  // Legend.
  style(legendStart, 1, { font: { bold: true, sz: 11 } });
  (Object.keys(STATUS_META) as AttendanceStatus[]).forEach((k, i) => {
    const R = legendStart + 1 + i;
    style(R, 0, {
      fill: fill(STATUS_META[k].bg),
      font: { bold: true, sz: 10, color: color(STATUS_META[k].text) },
      alignment: center,
      border: grid,
    });
    style(R, 1, { font: { sz: 10, color: color("#374151") }, alignment: { vertical: "center", indent: 1 } });
  });

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ...[0, 1, 2, 3].map((c) => ({ s: { r: HEAD_A, c }, e: { r: HEAD_B, c } })),
  ];
  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 9 },
    { wch: 9 },
    ...days.map(() => ({ wch: 4.5 })),
  ];
  const rowHeights: { hpt: number }[] = [];
  rowHeights[0] = { hpt: 28 };
  rowHeights[1] = { hpt: 18 };
  rowHeights[HEAD_A] = { hpt: 16 };
  rowHeights[HEAD_B] = { hpt: 18 };
  for (let R = FIRST_DATA; R <= totalsRow; R++) rowHeights[R] = { hpt: 20 };
  ws["!rows"] = rowHeights;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[sheet.month - 1].slice(0, 3)} ${sheet.year}`);
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

// ── PDF (jsPDF vector drawing, A4 landscape) ─────────────────────────────────
// Drawn natively rather than rasterised so text stays crisp and selectable and
// the file stays tiny. Rows paginate with the header repeated on every page.
export async function exportAttendancePDF(sheet: AttendanceSheet, fileBase: string) {
  const jspdf = await import("jspdf");
  const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;
  const pdf = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 28;
  const FOOTER = 22;

  const days = Array.from({ length: sheet.daysInMonth }, (_, i) => i + 1);
  const sum = summarize(sheet);
  const period = periodLabel(sheet);

  // Column geometry.
  const empW = 128;
  const numW = 34;
  const dayW = (W - 2 * M - empW - numW * 2) / days.length;
  const xP = M + empW;
  const xA = xP + numW;
  const xDay = (d: number) => xA + numW + (d - 1) * dayW;
  const tableW = W - 2 * M;
  const headH = 26;
  const rowH = 18;

  const font = (style: "normal" | "bold", size: number, hex = "#111827") => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(hex);
  };
  const box = (x: number, y: number, w: number, h: number, bg: string) => {
    pdf.setFillColor(bg);
    pdf.rect(x, y, w, h, "F");
  };
  const fit = (text: string, maxW: number) => {
    if (pdf.getTextWidth(text) <= maxW) return text;
    let t = text;
    while (t.length > 1 && pdf.getTextWidth(t + "...") > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "...";
  };

  // First-page masthead: brand, title, KPI tiles and legend.
  const drawMasthead = () => {
    font("bold", 20, BRAND);
    pdf.text("AQUAJAR", M, M + 14);
    font("normal", 8, "#6B7280");
    pdf.text("Rupsing, Lower Bagdogra, Siliguri, WB - 734014  ·  GSTIN: 19FNQPR3260F2ZG", M, M + 28);

    font("bold", 15, "#111827");
    pdf.text("ATTENDANCE REGISTER", W - M, M + 12, { align: "right" });
    font("normal", 10, "#6B7280");
    pdf.text(period, W - M, M + 27, { align: "right" });

    pdf.setDrawColor(BRAND);
    pdf.setLineWidth(2);
    pdf.line(M, M + 38, W - M, M + 38);

    // KPI tiles.
    const tiles: { label: string; value: string; hex: string }[] = [
      { label: "STAFF", value: String(sum.staff), hex: "#111827" },
      { label: "PRESENT", value: fmtCount(sum.present), hex: PRESENT_TEXT },
      { label: "ABSENT", value: fmtCount(sum.absent), hex: ABSENT_TEXT },
      { label: "ATTENDANCE", value: sum.rate, hex: BRAND },
    ];
    const tileY = M + 50;
    const tileW = 96;
    const tileH = 40;
    tiles.forEach((t, i) => {
      const x = M + i * (tileW + 8);
      pdf.setFillColor("#F8FAFC");
      pdf.setDrawColor("#E5E7EB");
      pdf.setLineWidth(0.75);
      pdf.roundedRect(x, tileY, tileW, tileH, 5, 5, "FD");
      font("bold", 6.5, "#6B7280");
      pdf.text(t.label, x + 10, tileY + 13);
      font("bold", 15, t.hex);
      pdf.text(t.value, x + 10, tileY + 31);
    });

    // Legend, right-aligned on the tile row.
    const legend = (Object.keys(STATUS_META) as AttendanceStatus[]).map((k) => STATUS_META[k]);
    font("normal", 8, "#374151");
    const itemW = legend.map((m) => 18 + 5 + pdf.getTextWidth(m.name));
    const gap = 14;
    let lx = W - M - itemW.reduce((a, b) => a + b, 0) - gap * (legend.length - 1);
    const ly = tileY + tileH / 2;
    legend.forEach((m, i) => {
      pdf.setFillColor(m.bg);
      pdf.roundedRect(lx, ly - 6, 18, 12, 2, 2, "F");
      font("bold", 6.5, m.text);
      pdf.text(m.label, lx + 9, ly, { align: "center", baseline: "middle" });
      font("normal", 8, "#374151");
      pdf.text(m.name, lx + 23, ly, { baseline: "middle" });
      lx += itemW[i] + gap;
    });

    return tileY + tileH + 14;
  };

  // Continuation pages get a slim running header.
  const drawRunningHead = () => {
    font("bold", 10, BRAND);
    pdf.text("AQUAJAR", M, M + 8);
    font("normal", 9, "#6B7280");
    pdf.text(`Attendance register  ·  ${period}`, W - M, M + 8, { align: "right" });
    pdf.setDrawColor("#E5E7EB");
    pdf.setLineWidth(0.75);
    pdf.line(M, M + 15, W - M, M + 15);
    return M + 24;
  };

  const drawTableHead = (y: number) => {
    box(M, y, tableW, headH, "#F3F4F6");
    days.forEach((d) => {
      if (isWeekend(sheet, d)) box(xDay(d), y, dayW, headH, "#E2E8F0");
    });
    const mid = y + headH / 2;
    font("bold", 8, "#111827");
    pdf.text("Employee", M + 8, mid, { baseline: "middle" });
    pdf.text("Present", xP + numW / 2, mid, { align: "center", baseline: "middle" });
    pdf.text("Absent", xA + numW / 2, mid, { align: "center", baseline: "middle" });
    days.forEach((d) => {
      const cx = xDay(d) + dayW / 2;
      const weekend = isWeekend(sheet, d);
      font("normal", 6, "#6B7280");
      pdf.text(WEEKDAYS[weekday(sheet, d)], cx, y + 9, { align: "center", baseline: "middle" });
      font("bold", 8, weekend ? "#6B7280" : "#111827");
      pdf.text(String(d), cx, y + 19, { align: "center", baseline: "middle" });
    });
    return y + headH;
  };

  const drawRow = (r: AttendanceRow, y: number) => {
    const mid = y + rowH / 2;
    box(xP, y, numW, rowH, PRESENT_BG);
    box(xA, y, numW, rowH, ABSENT_BG);

    font("normal", 6.5, "#9CA3AF");
    const id = `#${r.employeeID}`;
    const idW = pdf.getTextWidth(id);
    pdf.text(id, xP - 6, mid, { align: "right", baseline: "middle" });
    font("bold", 8, "#111827");
    pdf.text(fit(r.name || "", empW - 20 - idW), M + 8, mid, { baseline: "middle" });

    font("bold", 8.5, PRESENT_TEXT);
    pdf.text(fmtCount(r.present || 0), xP + numW / 2, mid, { align: "center", baseline: "middle" });
    font("bold", 8.5, ABSENT_TEXT);
    pdf.text(fmtCount(r.absent || 0), xA + numW / 2, mid, { align: "center", baseline: "middle" });

    days.forEach((d) => {
      const st = r.days?.[String(d)];
      const x = xDay(d);
      if (st) {
        const meta = STATUS_META[st];
        box(x, y, dayW, rowH, meta.bg);
        font("bold", st === "HD" ? 6.5 : 7.5, meta.text);
        pdf.text(meta.label, x + dayW / 2, mid, { align: "center", baseline: "middle" });
      } else if (isWeekend(sheet, d)) {
        box(x, y, dayW, rowH, "#F8FAFC");
      }
    });
    return y + rowH;
  };

  const drawTotals = (y: number) => {
    box(M, y, tableW, rowH, "#EFF6FF");
    const mid = y + rowH / 2;
    font("bold", 8, BRAND);
    pdf.text("Present per day", M + 8, mid, { baseline: "middle" });
    pdf.text(fmtCount(sum.present), xP + numW / 2, mid, { align: "center", baseline: "middle" });
    pdf.text(fmtCount(sum.absent), xA + numW / 2, mid, { align: "center", baseline: "middle" });
    font("bold", 7, BRAND);
    days.forEach((d) => {
      const n = presentOnDay(sheet.rows, d);
      if (n === null) return;
      pdf.text(fmtCount(n), xDay(d) + dayW / 2, mid, { align: "center", baseline: "middle" });
    });
    return y + rowH;
  };

  // Grid lines for one page's table block (drawn last so fills sit underneath).
  const drawGrid = (top: number, bottom: number, totalsTop: number | null) => {
    pdf.setDrawColor("#E5E7EB");
    pdf.setLineWidth(0.5);
    for (let y = top + headH; y < bottom; y += rowH) pdf.line(M, y, W - M, y);
    [xP, xA, xA + numW, ...days.slice(1).map(xDay)].forEach((x) => pdf.line(x, top, x, bottom));
    pdf.setDrawColor("#CBD5E1");
    pdf.setLineWidth(0.75);
    pdf.rect(M, top, tableW, bottom - top, "S");
    pdf.line(M, top + headH, W - M, top + headH);
    if (totalsTop !== null) {
      pdf.setDrawColor(BRAND);
      pdf.setLineWidth(1.25);
      pdf.line(M, totalsTop, W - M, totalsTop);
    }
  };

  const limit = H - M - FOOTER;
  let top = drawMasthead();
  let y = drawTableHead(top);
  sheet.rows.forEach((r) => {
    if (y + rowH > limit) {
      drawGrid(top, y, null);
      pdf.addPage();
      top = drawRunningHead();
      y = drawTableHead(top);
    }
    y = drawRow(r, y);
  });
  if (y + rowH > limit) {
    drawGrid(top, y, null);
    pdf.addPage();
    top = drawRunningHead();
    y = drawTableHead(top);
  }
  const totalsTop = y;
  y = drawTotals(y);
  drawGrid(top, y, totalsTop);

  // Footer on every page.
  const pages = pdf.getNumberOfPages();
  const generated = `Generated ${generatedLabel()}`;
  const key = "P Present  ·  A Absent  ·  HD Half day (½ present, ½ absent)  ·  H Holiday (not counted)";
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    font("normal", 7, "#9CA3AF");
    pdf.text(generated, M, H - M + 4);
    pdf.text(key, W / 2, H - M + 4, { align: "center" });
    pdf.text(`Page ${p} of ${pages}`, W - M, H - M + 4, { align: "right" });
  }

  pdf.save(`${fileBase}.pdf`);
}
