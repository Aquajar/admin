import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import toast from "react-hot-toast";
import { Droplets, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Customer, Invoice } from "@/types/types";
import CompanyStamp from "@/components/Customer/CompanyStamp";

// Product IDs the backend treats as non-jar assets (see backend
// Routes/User.route.js profile-details). Everything else is a water jar.
const STAND_ID = "65dcbe7d0752bc2d829e1522";
const DISPENSER_ID = "65c1277cd78bb1922f9b1a64";

// Page as large as the API allows so a full history needs the fewest requests.
const LIST_PAGE_SIZE = 100;

interface IProps {
  customer: Customer | null;
  // The route id (== customer.userID); used for the invoices/list fetch.
  customerID: string | string[] | undefined;
  axiosInstance: AxiosInstance;
}

interface CardRow {
  key: string;
  invoiceID: string | number;
  date: number | null;
  jars: number;
}

const jarsInInvoice = (invoice: Invoice): number =>
  (invoice.products || []).reduce(
    (sum, p) =>
      p.id !== STAND_ID && p.id !== DISPENSER_ID
        ? sum + (p.quantity || 0)
        : sum,
    0
  );

const formatDate = (value: number | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// <input type="date"> value ("YYYY-MM-DD") for a given Date, in local time.
const toInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Parse an <input type="date"> value into a local ms timestamp. `endOfDay`
// pushes it to 23:59:59.999 so a "to" bound is inclusive of the whole day.
const parseInputValue = (value: string, endOfDay = false): number | null => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
};

// Resolve once every <img> inside the template has finished loading, so
// html2canvas never captures a half-drawn logo or stamp.
const waitForImages = async (root: HTMLElement) => {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
};

const WaterCardDialog: FC<IProps> = ({
  customer,
  customerID,
  axiosInstance,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [allRows, setAllRows] = useState<CardRow[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch the customer's full invoice history (paginated) when the dialog
  // opens, then keep only invoices that actually carried jars.
  useEffect(() => {
    if (!open || allRows !== null || !customerID) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const collected: Invoice[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const url =
            process.env.NEXT_PUBLIC_API_URL +
            `/user/invoices/list?id=${customerID}&page=${page}&limit=${LIST_PAGE_SIZE}`;
          const { data } = await axiosInstance.get(url);
          collected.push(...(data.invoices || []));
          hasMore = Boolean(data.hasMore);
          page += 1;
          // Safety valve against an unexpectedly large history.
          if (page > 200) break;
        }

        if (cancelled) return;

        const cardRows: CardRow[] = collected
          .map((inv) => ({
            key: (inv._id as string) || String(inv.invoiceID),
            invoiceID: inv.invoiceID as unknown as string | number,
            date: inv.invoiceDate ? +new Date(inv.invoiceDate) : null,
            jars: jarsInInvoice(inv),
          }))
          .filter((r) => r.jars > 0)
          // Oldest first so the card reads top-down like a passbook.
          .sort((a, b) => (a.date || 0) - (b.date || 0));

        setAllRows(cardRows);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error("Failed to load water card data");
          setAllRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, allRows, customerID, axiosInstance]);

  // Apply the selected date range to the fetched rows. Rows without a date are
  // kept only when no range is set (all-time).
  const rows = useMemo(() => {
    if (!allRows) return null;
    const fromTs = parseInputValue(from, false);
    const toTs = parseInputValue(to, true);
    if (fromTs === null && toTs === null) return allRows;
    return allRows.filter((r) => {
      if (r.date === null) return false;
      if (fromTs !== null && r.date < fromTs) return false;
      if (toTs !== null && r.date > toTs) return false;
      return true;
    });
  }, [allRows, from, to]);

  const totalJars = useMemo(
    () => (rows || []).reduce((sum, r) => sum + r.jars, 0),
    [rows]
  );

  // Quick presets (calendar based) that fill the From/To inputs.
  const applyPreset = (preset: "all" | "month" | "lastMonth" | "year") => {
    const now = new Date();
    if (preset === "all") {
      setFrom("");
      setTo("");
    } else if (preset === "month") {
      setFrom(toInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
      setTo(toInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (preset === "lastMonth") {
      setFrom(toInputValue(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setTo(toInputValue(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (preset === "year") {
      setFrom(toInputValue(new Date(now.getFullYear(), 0, 1)));
      setTo(toInputValue(new Date(now.getFullYear(), 11, 31)));
    }
  };

  // Human-readable period label for the printed card.
  const periodLabel = useMemo(() => {
    const fromTs = parseInputValue(from, false);
    const toTs = parseInputValue(to, true);
    if (fromTs === null && toTs === null) return "All time";
    if (fromTs !== null && toTs !== null)
      return `${formatDate(fromTs)} – ${formatDate(toTs)}`;
    if (fromTs !== null) return `From ${formatDate(fromTs)}`;
    return `Up to ${formatDate(parseInputValue(to, false))}`;
  }, [from, to]);

  const addr = [customer?.address?.landmark, customer?.address?.text]
    .filter(Boolean)
    .join(", ");

  const handleDownload = async () => {
    if (!cardRef.current || !rows || rows.length === 0) return;
    setGenerating(true);
    try {
      await waitForImages(cardRef.current);

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const jspdf = await import("jspdf");
      const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new JsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Slice a tall card across A4 pages if it overflows one page.
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `Aquajar-WaterCard-${customer?.userID ?? "customer"}-${Date.now()}.pdf`
      );
      toast.success("Water Card downloaded");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate Water Card");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setFrom("");
            setTo("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-blue-600 text-blue-700 shadow-none hover:bg-blue-50"
          >
            <Droplets className="mr-2 h-4 w-4" />
            Water Card
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Water Card</DialogTitle>
            <DialogDescription>
              A jar-delivery record on the company letterhead, downloadable as an
              A4 PDF.
            </DialogDescription>
          </DialogHeader>

          {/* Date range */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Date range
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "All time" },
                  { id: "month", label: "This month" },
                  { id: "lastMonth", label: "Last month" },
                  { id: "year", label: "This year" },
                ] as { id: "all" | "month" | "lastMonth" | "year"; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                From
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-500">
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                />
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading jar history…
              </div>
            ) : rows && rows.length > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">
                    {customer?.name || "Customer"}
                  </div>
                  <div className="text-gray-500">
                    {rows.length} deliver{rows.length === 1 ? "y" : "ies"} ·{" "}
                    {periodLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Total Jars</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {totalJars}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-400">
                No jar deliveries in this range.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handleDownload}
              disabled={!rows || rows.length === 0 || loading || generating}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen A4 template captured by html2canvas. Inline styles only, so
          the capture never depends on the app's CSS variables. 794px == A4 at
          96dpi. Mounted only while the dialog is open. */}
      {open && rows && rows.length > 0 && (
        <div
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            zIndex: -1,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <div
            ref={cardRef}
            style={{
              width: "794px",
              boxSizing: "border-box",
              padding: "48px",
              background: "#ffffff",
              color: "#111827",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {/* Letterhead */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "3px solid #1c63b0",
                paddingBottom: "18px",
              }}
            >
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo.png"
                  alt="Aquajar"
                  width={64}
                  height={64}
                  style={{ objectFit: "contain" }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 800,
                      color: "#1c63b0",
                      letterSpacing: "1px",
                      lineHeight: 1,
                    }}
                  >
                    AQUAJAR
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    Rupsing, Lower Bagdogra, Siliguri, WB - 734014
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Phone: +91 86536 42157 &nbsp;•&nbsp; GSTIN: 19FNQPR3260F2ZG
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}
                >
                  WATER CARD
                </div>
                <div
                  style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}
                >
                  Generated:{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Customer + period */}
            <div
              style={{
                marginTop: "22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>
                  {customer?.name || "Customer"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#4b5563",
                    marginTop: "2px",
                  }}
                >
                  Customer ID: {customer?.userID ?? "—"}
                  {customer?.phone ? `  •  ${customer.phone}` : ""}
                </div>
                {addr && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#4b5563",
                      marginTop: "2px",
                    }}
                  >
                    {addr}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#4b5563",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#6b7280" }}>Period:</span> {periodLabel}
              </div>
            </div>

            {/* Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "20px",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#eff6ff" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#1e3a8a",
                      border: "1px solid #bfdbfe",
                      width: "70px",
                    }}
                  >
                    Sl. No.
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#1e3a8a",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    Invoice No.
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#1e3a8a",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      color: "#1e3a8a",
                      border: "1px solid #bfdbfe",
                      width: "90px",
                    }}
                  >
                    Jars
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key}>
                    <td
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        fontWeight: 600,
                      }}
                    >
                      {r.invoiceID}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {formatDate(r.date)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #e5e7eb",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {r.jars}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#eff6ff", fontWeight: 700 }}>
                  <td
                    colSpan={3}
                    style={{
                      padding: "12px",
                      border: "1px solid #bfdbfe",
                      textAlign: "right",
                      color: "#1e3a8a",
                    }}
                  >
                    Total Jars
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #bfdbfe",
                      textAlign: "right",
                      color: "#1e3a8a",
                    }}
                  >
                    {totalJars}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Stamp (left) + signature & signatory (right) */}
            <div
              style={{
                marginTop: "40px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              {/* Company stamp */}
              <div style={{ paddingBottom: "4px" }}>
                <CompanyStamp size={132} />
              </div>

              {/* Signature + signatory line */}
              <div style={{ textAlign: "center", width: "230px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  For AQUAJAR
                </div>
                <div
                  style={{
                    height: "58px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/signature.png"
                    alt="Authorised signatory"
                    style={{ width: "170px", transform: "rotate(-4deg)" }}
                  />
                </div>
                <div
                  style={{
                    borderTop: "1px solid #9ca3af",
                    width: "180px",
                    margin: "0 auto",
                    paddingTop: "4px",
                    fontSize: "11px",
                    color: "#6b7280",
                  }}
                >
                  Authorised Signatory
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: "28px",
                paddingTop: "14px",
                borderTop: "1px solid #e5e7eb",
                fontSize: "11px",
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              This water card is a computer-generated record of jar deliveries.
              Thank you for choosing Aquajar.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WaterCardDialog;
