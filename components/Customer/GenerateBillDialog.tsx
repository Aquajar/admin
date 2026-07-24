import React, { FC, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Receipt,
  FileText,
  Image as ImageIcon,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Customer } from "@/types/types";

// Same nested shape the profile page builds: { [year]: { [month]: {...} } }.
interface MonthwiseSummaries {
  [year: string]: {
    [month: string]: { totalAmount: number; dueAmount: number };
  };
}

interface IProps {
  customer: Customer | null;
  monthwiseSummaries: MonthwiseSummaries;
}

type DownloadType = "pdf" | "image";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inr = (value: number) =>
  "₹" + Math.round(value || 0).toLocaleString("en-IN");

const GenerateBillDialog: FC<IProps> = ({ customer, monthwiseSummaries }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [downloadType, setDownloadType] = useState<DownloadType>("pdf");
  const [generating, setGenerating] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  // Flatten the nested summary into a sortable list, newest first (for the
  // picker). A month with no billing (totalAmount 0) can't be selected.
  const months = useMemo(() => {
    const rows: {
      key: string;
      year: number;
      month: number;
      label: string;
      totalAmount: number;
      dueAmount: number;
    }[] = [];

    Object.keys(monthwiseSummaries || {}).forEach((year) => {
      Object.keys(monthwiseSummaries[year] || {}).forEach((month) => {
        const data = monthwiseSummaries[year][month];
        rows.push({
          key: `${year}-${month}`,
          year: Number(year),
          month: Number(month),
          label: `${MONTHS[Number(month) - 1]} ${year}`,
          totalAmount: data?.totalAmount || 0,
          dueAmount: data?.dueAmount || 0,
        });
      });
    });

    rows.sort((a, b) => b.year - a.year || b.month - a.month);
    return rows;
  }, [monthwiseSummaries]);

  const selectableKeys = months
    .filter((m) => m.totalAmount > 0)
    .map((m) => m.key);

  // Rows for the printed bill, oldest first so the statement reads top-down.
  const billRows = months
    .filter((m) => selected.includes(m.key))
    .sort((a, b) => a.year - b.year || a.month - b.month);

  const totals = billRows.reduce(
    (acc, r) => ({
      billed: acc.billed + r.totalAmount,
      due: acc.due + r.dueAmount,
    }),
    { billed: 0, due: 0 }
  );
  const totalPaid = totals.billed - totals.due;

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const allSelected =
    selectableKeys.length > 0 && selected.length === selectableKeys.length;

  const handleDownload = async () => {
    if (billRows.length === 0 || !billRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(billRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const base = `Aquajar-Bill-${customer?.userID ?? "customer"}-${Date.now()}`;

      if (downloadType === "image") {
        canvas.toBlob((blob) => {
          if (blob) saveAs(blob, `${base}.png`);
        }, "image/png");
      } else {
        const jspdf = await import("jspdf");
        const JsPDF = (jspdf as any).jsPDF || (jspdf as any).default;
        const imgData = canvas.toDataURL("image/png");
        const pdf = new JsPDF({ unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Slice the tall render across pages if it overflows one A4 page.
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
        pdf.save(`${base}.pdf`);
      }

      toast.success("Bill downloaded");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate bill");
    } finally {
      setGenerating(false);
    }
  };

  const addr = [customer?.address?.landmark, customer?.address?.text]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSelected([]);
        }}
      >
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white shadow-none hover:bg-blue-700">
            <Receipt className="mr-2 h-4 w-4" />
            Generate Bill
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Bill</DialogTitle>
            <DialogDescription>
              Pick the month(s) to include, then download as PDF or image.
            </DialogDescription>
          </DialogHeader>

          {/* Month picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Months</span>
              {selectableKeys.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:underline"
                  onClick={() =>
                    setSelected(allSelected ? [] : selectableKeys)
                  }
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>

            <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1">
              {months.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  No billing history available.
                </p>
              )}

              {months.map((m) => {
                const disabled = m.totalAmount <= 0;
                return (
                  <label
                    key={m.key}
                    className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Checkbox
                        checked={selected.includes(m.key)}
                        disabled={disabled}
                        onCheckedChange={() => !disabled && toggle(m.key)}
                      />
                      <span className="font-medium text-gray-800">
                        {m.label}
                      </span>
                    </span>
                    <span
                      className={disabled ? "text-gray-400" : "text-gray-600"}
                    >
                      {disabled ? "No bill" : inr(m.totalAmount)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Download type */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              Download as
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "pdf", label: "PDF", icon: FileText },
                  { id: "image", label: "Image", icon: ImageIcon },
                ] as { id: DownloadType; label: string; icon: typeof FileText }[]
              ).map((opt) => {
                const active = downloadType === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDownloadType(opt.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleDownload}
              disabled={billRows.length === 0 || generating}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download {billRows.length > 0 && `(${billRows.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Off-screen bill template captured by html2canvas. Inline styles only,
          so the capture never trips over the app's CSS variables. Mounted only
          while the dialog is open (it's present when Download is clicked). */}
      {open && (
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
          ref={billRef}
          style={{
            width: "794px",
            boxSizing: "border-box",
            padding: "48px",
            background: "#ffffff",
            color: "#111827",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "3px solid #2563eb",
              paddingBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#2563eb",
                  letterSpacing: "1px",
                }}
              >
                AQUAJAR
              </div>
              <div
                style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}
              >
                ISO 9001:2015 Certified
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}
              >
                STATEMENT
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

          {/* Customer */}
          <div style={{ marginTop: "24px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>
              {customer?.name || "Customer"}
            </div>
            <div
              style={{ fontSize: "13px", color: "#4b5563", marginTop: "2px" }}
            >
              Customer ID: {customer?.userID ?? "—"}
              {customer?.phone ? `  •  ${customer.phone}` : ""}
            </div>
            {addr && (
              <div
                style={{ fontSize: "13px", color: "#4b5563", marginTop: "2px" }}
              >
                {addr}
              </div>
            )}
          </div>

          {/* Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "28px",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th
                  style={{ textAlign: "left", padding: "10px 12px", color: "#374151" }}
                >
                  Month
                </th>
                <th
                  style={{ textAlign: "right", padding: "10px 12px", color: "#374151" }}
                >
                  Billed
                </th>
                <th
                  style={{ textAlign: "right", padding: "10px 12px", color: "#374151" }}
                >
                  Paid
                </th>
                <th
                  style={{ textAlign: "right", padding: "10px 12px", color: "#374151" }}
                >
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {billRows.map((r) => (
                <tr key={r.key} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {r.label}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {inr(r.totalAmount)}
                  </td>
                  <td
                    style={{ padding: "10px 12px", textAlign: "right", color: "#16a34a" }}
                  >
                    {inr(r.totalAmount - r.dueAmount)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: r.dueAmount > 0 ? "#dc2626" : "#111827",
                    }}
                  >
                    {inr(r.dueAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #d1d5db", fontWeight: 700 }}>
                <td style={{ padding: "12px" }}>Total</td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {inr(totals.billed)}
                </td>
                <td style={{ padding: "12px", textAlign: "right", color: "#16a34a" }}>
                  {inr(totalPaid)}
                </td>
                <td style={{ padding: "12px", textAlign: "right", color: "#dc2626" }}>
                  {inr(totals.due)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount due callout */}
          <div
            style={{
              marginTop: "28px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                background: totals.due > 0 ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${totals.due > 0 ? "#fecaca" : "#bbf7d0"}`,
                borderRadius: "8px",
                padding: "14px 20px",
                minWidth: "240px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Total Amount Due
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: totals.due > 0 ? "#dc2626" : "#16a34a",
                }}
              >
                {inr(totals.due)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "40px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
              fontSize: "11px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            This is a computer-generated statement and does not require a
            signature. Thank you for choosing Aquajar.
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default GenerateBillDialog;
