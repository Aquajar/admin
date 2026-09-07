// Adds an html2canvas render into a jsPDF document across pages, breaking pages
// only at row boundaries so a table row is never sliced in half between pages.
//
// `el` is the same element that was passed to html2canvas (still attached to the
// DOM so it can be measured). `rowSelector` picks the elements whose top edges are
// valid page-break points (table rows by default).
export function addImagePaginated(
  pdf: any,
  canvas: HTMLCanvasElement,
  el: HTMLElement,
  opts: {
    margin?: number;
    rowSelector?: string;
    format?: "JPEG" | "PNG";
    quality?: number;
  } = {}
): void {
  const margin = opts.margin ?? 0;
  const rowSelector = opts.rowSelector ?? "tbody tr, tfoot tr";
  const format = opts.format ?? "JPEG";
  const mime = format === "PNG" ? "image/png" : "image/jpeg";
  const quality = opts.quality ?? 0.92;

  const elRect = el.getBoundingClientRect();
  // Candidate break points: the top of every row, in canvas pixels.
  const factor = canvas.height / elRect.height; // css px -> canvas px
  const boundaries = Array.from(el.querySelectorAll(rowSelector))
    .map((r) => (r as HTMLElement).getBoundingClientRect().top - elRect.top)
    .map((y) => Math.round(y * factor))
    .filter((y) => y > 0)
    .sort((a, b) => a - b);
  boundaries.push(canvas.height); // bottom of the content

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const usableW = pageW - margin * 2;
  const scale = usableW / canvas.width; // canvas px -> pt
  const pageSlicePx = Math.floor((pageH - margin * 2) / scale);

  let prev = 0;
  let first = true;
  while (prev < canvas.height) {
    const target = prev + pageSlicePx;
    // largest row boundary that fits on this page (never split a row)
    let cut = -1;
    for (const b of boundaries) if (b > prev && b <= target) cut = b;
    if (cut === -1) cut = Math.min(target, canvas.height); // a single row taller than a page
    const sliceH = cut - prev;

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, sliceH);
      ctx.drawImage(canvas, 0, prev, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    }
    if (!first) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL(mime, quality), format, margin, margin, usableW, sliceH * scale);
    prev = cut;
    first = false;
  }
}
